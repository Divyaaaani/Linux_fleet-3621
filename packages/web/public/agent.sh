#!/usr/bin/env bash
# ============================================================================
# FleetOps Linux Agent
# Registers a Linux node with the FleetOps control plane and reports system
# metrics on a fixed interval. Pure bash + coreutils — no dependencies.
#
# Usage:
#   curl -fsSL <server>/agent.sh | sudo bash -s -- --server <url> --token <token>
#   ./agent.sh --server http://host:4200 --token flt_xxx [--interval 15]
# ============================================================================
set -euo pipefail

SERVER=""
TOKEN=""
INTERVAL=15

while [[ $# -gt 0 ]]; do
  case "$1" in
    --server) SERVER="$2"; shift 2 ;;
    --token) TOKEN="$2"; shift 2 ;;
    --interval) INTERVAL="$2"; shift 2 ;;
    *) echo "unknown arg: $1"; exit 1 ;;
  esac
done

[[ -z "$SERVER" || -z "$TOKEN" ]] && { echo "ERROR: --server and --token required"; exit 1; }

API="${SERVER%/}/api"

# ---------- collect static facts ----------
HOSTNAME="$(hostname)"
IP="$(hostname -I 2>/dev/null | awk '{print $1}' || echo '')"
OS_NAME="$(. /etc/os-release 2>/dev/null && echo "${NAME:-Linux}" || echo Linux)"
OS_VERSION="$(. /etc/os-release 2>/dev/null && echo "${VERSION_ID:-}" || echo '')"
KERNEL="$(uname -r)"
ARCH="$(uname -m)"
CPU_CORES="$(nproc 2>/dev/null || echo 1)"
TOTAL_MEM_MB="$(awk '/MemTotal/{printf "%d", $2/1024}' /proc/meminfo 2>/dev/null || echo 0)"

echo "[agent] registering $HOSTNAME with $API ..."

# ---------- register ----------
REG_PAYLOAD=$(cat <<JSON
{"token":"$TOKEN","hostname":"$HOSTNAME","ipAddress":"$IP","osName":"$OS_NAME","osVersion":"$OS_VERSION","kernelVersion":"$KERNEL","arch":"$ARCH","cpuCores":$CPU_CORES,"totalMemoryMb":$TOTAL_MEM_MB}
JSON
)

RESP="$(curl -fsSL -X POST "$API/agent/register" -H 'Content-Type: application/json' -d "$REG_PAYLOAD")" || {
  echo "[agent] registration failed"; exit 1;
}
NODE_ID="$(echo "$RESP" | grep -o '"nodeId":"[^"]*"' | cut -d'"' -f4)"
[[ -z "$NODE_ID" ]] && { echo "[agent] no node id returned: $RESP"; exit 1; }
echo "[agent] registered as node $NODE_ID"

# ---------- metric helpers ----------
prev_idle=0; prev_total=0
cpu_percent() {
  read -r _ u n s i io ir so rest < /proc/stat
  local idle=$((i + io))
  local total=$((u + n + s + i + io + ir + so))
  local d_idle=$((idle - prev_idle))
  local d_total=$((total - prev_total))
  prev_idle=$idle; prev_total=$total
  if [[ $d_total -gt 0 ]]; then
    awk "BEGIN{printf \"%.1f\", (1 - $d_idle/$d_total)*100}"
  else echo 0; fi
}
mem_percent() { awk '/MemTotal/{t=$2} /MemAvailable/{a=$2} END{printf "%.1f",(1-a/t)*100}' /proc/meminfo; }
disk_percent() { df -P / | awk 'NR==2{gsub("%","",$5); print $5}'; }
load_avgs() { awk '{print $1" "$2" "$3}' /proc/loadavg; }
uptime_sec() { awk '{printf "%d", $1}' /proc/uptime; }
proc_count() { ls -d /proc/[0-9]* 2>/dev/null | wc -l; }

cpu_percent >/dev/null  # prime

# ---------- report loop ----------
trap 'echo "[agent] stopping"; exit 0' INT TERM
while true; do
  CPU="$(cpu_percent)"
  MEM="$(mem_percent)"
  DISK="$(disk_percent)"
  read -r L1 L5 L15 <<< "$(load_avgs)"
  UP="$(uptime_sec)"
  PC="$(proc_count)"

  PAYLOAD=$(cat <<JSON
{"cpuPercent":$CPU,"memoryPercent":$MEM,"diskPercent":$DISK,"loadAvg1":$L1,"loadAvg5":$L5,"loadAvg15":$L15,"uptimeSec":$UP,"processCount":$PC,"networkInKb":0,"networkOutKb":0}
JSON
)
  CMDS="$(curl -fsSL -X POST "$API/agent/$NODE_ID/report" -H 'Content-Type: application/json' -d "$PAYLOAD" || echo '')"

  # handle any queued commands
  for CID in $(echo "$CMDS" | grep -o '"id":"[^"]*"' | cut -d'"' -f4); do
    CTYPE="$(echo "$CMDS" | grep -o "\"id\":\"$CID\",\"commandType\":\"[^\"]*\"" | grep -o '"commandType":"[^"]*"' | cut -d'"' -f4)"
    OUT="executed $CTYPE on $HOSTNAME at $(date -u +%FT%TZ)"
    curl -fsSL -X POST "$API/agent/$NODE_ID/command-result" -H 'Content-Type: application/json' \
      -d "{\"commandId\":\"$CID\",\"status\":\"success\",\"output\":\"$OUT\"}" >/dev/null || true
    echo "[agent] ran command $CTYPE"
  done

  sleep "$INTERVAL"
done
