#!/usr/bin/env bash
# ============================================================================
# Simulate a fleet of Linux nodes reporting to FleetOps.
# Generates tokens, registers fake nodes, and streams realistic metrics so you
# can demo the dashboard without real machines.
#
#   SERVER=http://localhost:4200 bash simulate-fleet.sh [count]
# ============================================================================
set -euo pipefail
SERVER="${SERVER:-http://localhost:4200}"
API="${SERVER%/}/api"
COUNT="${1:-5}"

HOSTS=(web-prod-01 web-prod-02 db-primary cache-redis-01 worker-batch-03 api-gateway-02 logstash-01 nginx-edge-04)
OSES=("Ubuntu|22.04|5.15.0-91-generic" "Debian|12|6.1.0-18-amd64" "Alpine|3.19|6.6.7-0-lts" "Rocky Linux|9.3|5.14.0-362")
ENVS=(production staging dev)

declare -a NODE_IDS=()
declare -a NODE_DISK=()
declare -a NODE_MEMBASE=()

echo "[sim] spinning up $COUNT nodes against $API"

for i in $(seq 1 "$COUNT"); do
  H="${HOSTS[$(( (i-1) % ${#HOSTS[@]} ))]}-$i"
  OS="${OSES[$(( RANDOM % ${#OSES[@]} ))]}"
  IFS='|' read -r OSN OSV KERN <<< "$OS"
  ENV="${ENVS[$(( RANDOM % ${#ENVS[@]} ))]}"
  IP="10.0.$((RANDOM%255)).$((RANDOM%255))"
  CORES=$(( (RANDOM % 8) + 2 ))
  MEM=$(( (RANDOM % 16 + 4) * 1024 ))

  TOK="$(curl -fsSL -X POST "$API/tokens" -H 'Content-Type: application/json' \
    -d "{\"label\":\"$H\",\"environment\":\"$ENV\"}" | grep -o '"token":"[^"]*"' | cut -d'"' -f4)"

  NID="$(curl -fsSL -X POST "$API/agent/register" -H 'Content-Type: application/json' \
    -d "{\"token\":\"$TOK\",\"hostname\":\"$H\",\"ipAddress\":\"$IP\",\"osName\":\"$OSN\",\"osVersion\":\"$OSV\",\"kernelVersion\":\"$KERN\",\"arch\":\"x86_64\",\"cpuCores\":$CORES,\"totalMemoryMb\":$MEM}" \
    | grep -o '"nodeId":"[^"]*"' | cut -d'"' -f4)"

  NODE_IDS+=("$NID")
  NODE_DISK+=("$(( RANDOM % 40 + 30 ))")
  NODE_MEMBASE+=("$(( RANDOM % 30 + 35 ))")
  echo "[sim] + $H -> $NID"
done

echo "[sim] streaming metrics (Ctrl-C to stop)…"
TICK=0
while true; do
  TICK=$((TICK+1))
  for idx in "${!NODE_IDS[@]}"; do
    NID="${NODE_IDS[$idx]}"
    DISK="${NODE_DISK[$idx]}"
    MEMBASE="${NODE_MEMBASE[$idx]}"
    # sinusoidal-ish load with occasional spikes
    CPU=$(awk -v t=$TICK -v s=$idx 'BEGIN{srand(t*100+s); v=30+25*sin((t+s)/3)+rand()*20; if(rand()>0.92)v+=40; if(v<2)v=2; if(v>99)v=99; printf "%.1f", v}')
    MEM=$(awk -v b=$MEMBASE 'BEGIN{srand(); v=b+rand()*15; if(rand()>0.95)v+=35; if(v>99)v=99; printf "%.1f", v}')
    DSK=$(awk -v d=$DISK -v t=$TICK 'BEGIN{printf "%.1f", d + t*0.02}')
    L1=$(awk 'BEGIN{srand(); printf "%.2f", rand()*4}')
    NETIN=$(( RANDOM % 5000 ))
    NETOUT=$(( RANDOM % 5000 ))
    curl -fsSL -X POST "$API/agent/$NID/report" -H 'Content-Type: application/json' \
      -d "{\"cpuPercent\":$CPU,\"memoryPercent\":$MEM,\"diskPercent\":$DSK,\"loadAvg1\":$L1,\"loadAvg5\":$L1,\"loadAvg15\":$L1,\"uptimeSec\":$((86400+TICK*15)),\"processCount\":$((RANDOM%200+80)),\"networkInKb\":$NETIN,\"networkOutKb\":$NETOUT}" >/dev/null || true
  done
  sleep 5
done
