# FleetOps — Distributed Linux Fleet Management System

A web-based control plane to onboard, monitor, and remotely manage a fleet of Linux nodes. Built for the **Zoho SETU** project list (Project 3: *Distributed Linux Fleet Management*).

Onboard machines with a token, run a lightweight bash agent on each node, stream system metrics into a central dashboard, raise alerts on threshold breaches and missed heartbeats, and dispatch allow-listed remote commands.

---

## What it does

- **Onboard** any Linux node with a one-time token (no SSH config needed).
- **Agent** — a dependency-free bash script that registers and reports CPU, memory, disk, load average, uptime, and process count every 15s.
- **Monitor** — live fleet overview, per-node detail with time-series charts.
- **Alert** — automatic alerts for high CPU/memory/disk and missed heartbeats, auto-resolved when healthy again.
- **Remote control** — queue allow-listed actions (refresh metrics, health check, restart agent, restart service) delivered to the agent on its next report.
- **Prometheus + Grafana** — a `/api/metrics/prometheus` exporter plus a one-command Docker stack (Prometheus scrape + provisioned Grafana dashboard), embedded directly in the UI alongside the built-in monitoring.

---

## Architecture

```
 ┌────────────────────┐        register / report (HTTP)        ┌─────────────────────┐
 │   Linux Node(s)    │ ───────────────────────────────────▶  │   Control Plane     │
 │  agent.sh (bash)   │ ◀─────────  queued commands  ───────── │  Hono API + SQLite  │
 └────────────────────┘                                        └──────────┬──────────┘
                                                                          │
                                                               ┌──────────▼──────────┐
                                                               │  Web Dashboard      │
                                                               │  React + Tailwind   │
                                                               └─────────────────────┘
```

- **Control plane** — Hono (Bun) REST API, Drizzle ORM over SQLite (Turso).
- **Agent** — `packages/web/public/agent.sh`, pure bash + coreutils, runs on any Linux box.
- **Dashboard** — React 19 + Wouter + Tailwind, polls every 5s for a live feel.

### Why this design
The agent **pushes** metrics and **pulls** commands in the same request, so it works behind NAT/firewalls with no inbound ports on the node — only the control plane needs to be reachable. Commands are an explicit allow-list, never arbitrary shell, so remote control is safe by construction.

---

## Data model

| Table | Purpose |
|-------|---------|
| `nodes` | Registered machines, facts, current status, last heartbeat |
| `onboarding_tokens` | One-time tokens consumed at registration |
| `metrics` | Time-series telemetry per node |
| `commands` | Queued / running / completed remote actions |
| `alerts` | Threshold + heartbeat alerts, with resolution |

---

## API

| Method | Route | Purpose |
|--------|-------|---------|
| `POST` | `/api/tokens` | Generate onboarding token |
| `GET`  | `/api/tokens` | List tokens |
| `POST` | `/api/agent/register` | Agent registers with token |
| `POST` | `/api/agent/:nodeId/report` | Heartbeat + metrics; returns queued commands |
| `POST` | `/api/agent/:nodeId/command-result` | Agent reports command result |
| `GET`  | `/api/nodes` | Fleet list with latest metrics |
| `GET`  | `/api/nodes/:id` | Node detail |
| `GET`  | `/api/nodes/:id/metrics` | Time-series (last hour) |
| `POST` | `/api/nodes/:id/commands` | Queue a remote command |
| `GET`  | `/api/alerts` | Active + resolved alerts |
| `GET`  | `/api/summary` | Fleet health counts |
| `GET`  | `/api/metrics/prometheus` | Prometheus exposition (text format) for scraping |

---

## Steps of Execution

### 1. Prerequisites
- [Bun](https://bun.sh) installed
- A Linux/macOS shell (the agent requires Linux to read `/proc`)

### 2. Install & configure
```bash
cd zoho-linux-fleet-manager
bun install
```
The database connection is already configured in `.env` (`DATABASE_URL`, `DATABASE_AUTH_TOKEN`).

### 3. Push the database schema
```bash
cd packages/web
bun run db:push
cd ../..
```

### 4. Start the control plane + dashboard
```bash
bun run dev --port 4200
```
Open **http://localhost:4200**.

### 5. Onboard a node

**Option A — real Linux machine**
On the dashboard go to **Onboarding → Generate Token**, then run on the target box:
```bash
curl -fsSL http://<server>:4200/agent.sh | sudo bash -s -- \
  --server http://<server>:4200 \
  --token flt_xxxxxxxx
```
The agent registers, then streams metrics every 15s. It also picks up and executes any queued commands.

**Option B — simulate a whole fleet (no extra machines)**
```bash
SERVER=http://localhost:4200 bash simulate-fleet.sh 7
```
This generates tokens, registers 7 fake nodes, and streams realistic metrics with occasional spikes so the dashboard, charts, and alerts populate live.

### 6. Use the dashboard
- **Overview** — fleet health cards, node list, active alerts.
- **Nodes** — searchable/filterable table; click a node for detail.
- **Node detail** — system info, live resource bars, CPU/Mem/Disk charts, and **Remote Actions** (queue a command, watch it move queued → running → success in Command History).
- **Alerts** — threshold + heartbeat alerts; resolve manually or let them auto-resolve.
- **Onboarding** — manage tokens and copy the install command.

### 7. Prometheus + Grafana (optional, recommended)

FleetOps exposes an aggregated Prometheus exporter and ships a ready-to-run
observability stack. The agent is **push-based**, so Prometheus scrapes the
control plane's exporter (not each node) — one stable target that works behind NAT.

**Exporter** — already live, no setup:
```bash
curl -s http://localhost:4200/api/metrics/prometheus
```
Exposes `fleet_node_up`, `fleet_cpu_percent`, `fleet_memory_percent`,
`fleet_disk_percent`, `fleet_load1`, `fleet_uptime_seconds`, `fleet_processes`,
`fleet_alerts_open`, `fleet_nodes_total` — labelled by `node`, `ip`, `env`, `os`.

**Run the full stack** (app + Prometheus + Grafana) with Docker:
```bash
docker compose up -d --build
```
| Service | URL | Notes |
|---------|-----|-------|
| FleetOps app | http://localhost:4200 | control plane + dashboard |
| Prometheus | http://localhost:9090 | scrapes the exporter every 15s |
| Grafana | http://localhost:3000 | login `admin` / `admin` (anonymous viewing enabled) |

The Grafana datasource and the **FleetOps — Overview** dashboard are
auto-provisioned (`grafana/provisioning/`). Open the **Grafana** tab inside the
FleetOps UI to view it embedded, or **Open in Grafana** to pop out.

> Already running the app via `bun run dev`? Just start Prometheus + Grafana and
> point the scrape target at `host.docker.internal:4200` (the bundled
> `prometheus/prometheus.yml` includes a commented example).

The built-in FleetOps monitoring (live charts, threshold alerts, remote
commands) keeps working independently — Prometheus/Grafana is added **alongside**
it, not as a replacement.

### 8. Validate (test scenarios)
- **Load spike** → push high CPU/mem → a `cpu_high` / `memory_high` alert appears, clears when normal.
- **Disk pressure** → a node reporting ≥90% disk raises a critical `disk_high` alert.
- **Node failure** → stop an agent → after ~90s the node flips to **offline** and a `heartbeat_missed` alert fires.
- **Remote command** → queue `restart_service nginx` → agent picks it up on next report and returns output.

---

## Tech Stack

| Layer | Tech |
|-------|------|
| Runtime | Bun |
| API | Hono |
| ORM / DB | Drizzle + SQLite (Turso) |
| Frontend | React 19, Wouter, TanStack Query, Tailwind CSS 4 |
| Agent | Bash + coreutils (`/proc`, `df`, `nproc`) |
| Observability | Prometheus exporter + Grafana (Docker Compose, provisioned) |

---

## Project Structure
```
packages/web/
  public/agent.sh                  # Linux agent (served for one-line install)
  src/api/
    index.ts                       # all REST routes
    database/schema.ts             # nodes, tokens, metrics, commands, alerts
    lib/helpers.ts                 # alerting, health reconciliation
  src/web/
    pages/                         # overview, nodes, node-detail, alerts, onboarding, grafana
    components/                    # layout, charts, status pills, metric bars
simulate-fleet.sh                  # spin up a demo fleet
docker-compose.yml                 # app + Prometheus + Grafana stack
Dockerfile                         # control-plane image (Bun)
prometheus/prometheus.yml          # scrape config (targets the exporter)
grafana/provisioning/              # auto-provisioned datasource + dashboard
```

---

## Notes for evaluation
This project prioritises **correctness, system design, and observability** over UI polish, per the brief. Highlights:
- Push-based agent that works behind firewalls with no node-side inbound ports.
- Safe remote control via a strict command allow-list (no arbitrary shell).
- Automatic, self-resolving alerting on metrics and heartbeats.
- Typed end-to-end API (Hono RPC client), real time-series storage, and a live-updating console.
