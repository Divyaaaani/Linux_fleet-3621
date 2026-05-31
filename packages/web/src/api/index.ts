import { Hono } from "hono";
import { cors } from "hono/cors";
import { db } from "./database";
import * as schema from "./database/schema";
import { eq, desc, and, gte } from "drizzle-orm";
import {
  uuid,
  genToken,
  evaluateMetric,
  reconcileNodeHealth,
  latestMetric,
  resolveAlerts,
} from "./lib/helpers";

const AGENT_VERSION = "1.0.0";

const app = new Hono()
  .basePath("api")
  .use(
    cors({
      origin: (origin) => origin ?? "*",
      credentials: true,
      exposeHeaders: ["set-auth-token"],
    }),
  )
  .get("/health", (c) => c.json({ status: "ok", agentVersion: AGENT_VERSION }, 200))

  // ---------- PROMETHEUS EXPORTER ----------
  // Exposes fleet metrics in Prometheus text exposition format.
  // Prometheus scrapes GET /api/metrics/prometheus on an interval.
  .get("/metrics/prometheus", async (c) => {
    await reconcileNodeHealth();
    const allNodes = await db.select().from(schema.nodes);
    const allAlerts = await db.select().from(schema.alerts);

    const esc = (v: string) => v.replace(/\\/g, "\\\\").replace(/"/g, '\\"');
    const lines: string[] = [];

    const statusValue: Record<string, number> = {
      online: 1,
      degraded: 2,
      offline: 0,
      pending: 3,
    };

    lines.push("# HELP fleet_node_up Node status (1=online,2=degraded,0=offline,3=pending)");
    lines.push("# TYPE fleet_node_up gauge");
    lines.push("# HELP fleet_cpu_percent CPU utilization percent");
    lines.push("# TYPE fleet_cpu_percent gauge");
    lines.push("# HELP fleet_memory_percent Memory utilization percent");
    lines.push("# TYPE fleet_memory_percent gauge");
    lines.push("# HELP fleet_disk_percent Disk utilization percent");
    lines.push("# TYPE fleet_disk_percent gauge");
    lines.push("# HELP fleet_load1 Load average (1m)");
    lines.push("# TYPE fleet_load1 gauge");
    lines.push("# HELP fleet_uptime_seconds Node uptime in seconds");
    lines.push("# TYPE fleet_uptime_seconds counter");
    lines.push("# HELP fleet_processes Process count");
    lines.push("# TYPE fleet_processes gauge");

    for (const n of allNodes) {
      const m = await latestMetric(n.id);
      const labels = `node="${esc(n.hostname)}",ip="${esc(n.ipAddress)}",env="${esc(n.environment)}",os="${esc(n.osName)}"`;
      lines.push(`fleet_node_up{${labels}} ${statusValue[n.status] ?? 0}`);
      if (m) {
        lines.push(`fleet_cpu_percent{${labels}} ${m.cpuPercent}`);
        lines.push(`fleet_memory_percent{${labels}} ${m.memoryPercent}`);
        lines.push(`fleet_disk_percent{${labels}} ${m.diskPercent}`);
        lines.push(`fleet_load1{${labels}} ${m.loadAvg1}`);
        lines.push(`fleet_uptime_seconds{${labels}} ${m.uptimeSec}`);
        lines.push(`fleet_processes{${labels}} ${m.processCount}`);
      }
    }

    const open = allAlerts.filter((a) => !a.resolved);
    lines.push("# HELP fleet_alerts_open Number of open alerts");
    lines.push("# TYPE fleet_alerts_open gauge");
    lines.push(`fleet_alerts_open ${open.length}`);
    lines.push(`fleet_alerts_open{severity="critical"} ${open.filter((a) => a.severity === "critical").length}`);
    lines.push(`fleet_alerts_open{severity="warning"} ${open.filter((a) => a.severity === "warning").length}`);

    lines.push("# HELP fleet_nodes_total Total nodes by status");
    lines.push("# TYPE fleet_nodes_total gauge");
    lines.push(`fleet_nodes_total{status="online"} ${allNodes.filter((n) => n.status === "online").length}`);
    lines.push(`fleet_nodes_total{status="degraded"} ${allNodes.filter((n) => n.status === "degraded").length}`);
    lines.push(`fleet_nodes_total{status="offline"} ${allNodes.filter((n) => n.status === "offline").length}`);

    return c.text(lines.join("\n") + "\n", 200, {
      "Content-Type": "text/plain; version=0.0.4; charset=utf-8",
    });
  })

  // ---------- ONBOARDING TOKENS ----------
  .get("/tokens", async (c) => {
    const tokens = await db
      .select()
      .from(schema.onboardingTokens)
      .orderBy(desc(schema.onboardingTokens.createdAt));
    return c.json({ tokens }, 200);
  })
  .post("/tokens", async (c) => {
    const body = await c.req.json<{ label?: string; environment?: string }>();
    const [token] = await db
      .insert(schema.onboardingTokens)
      .values({
        id: uuid(),
        token: genToken(),
        label: body.label ?? "",
        environment: body.environment ?? "production",
      })
      .returning();
    return c.json({ token }, 201);
  })
  .delete("/tokens/:id", async (c) => {
    await db
      .delete(schema.onboardingTokens)
      .where(eq(schema.onboardingTokens.id, c.req.param("id")));
    return c.json({ ok: true }, 200);
  })

  // ---------- AGENT: REGISTER ----------
  // Called by the Linux agent on first boot with an onboarding token.
  .post("/agent/register", async (c) => {
    const body = await c.req.json<{
      token: string;
      hostname: string;
      ipAddress?: string;
      osName?: string;
      osVersion?: string;
      kernelVersion?: string;
      arch?: string;
      cpuCores?: number;
      totalMemoryMb?: number;
    }>();

    const [tok] = await db
      .select()
      .from(schema.onboardingTokens)
      .where(eq(schema.onboardingTokens.token, body.token));

    if (!tok) return c.json({ error: "invalid_token" }, 401);
    if (tok.used) return c.json({ error: "token_already_used" }, 409);

    const nodeId = uuid();
    const [node] = await db
      .insert(schema.nodes)
      .values({
        id: nodeId,
        hostname: body.hostname,
        ipAddress: body.ipAddress ?? "",
        osName: body.osName ?? "",
        osVersion: body.osVersion ?? "",
        kernelVersion: body.kernelVersion ?? "",
        arch: body.arch ?? "",
        agentVersion: AGENT_VERSION,
        environment: tok.environment,
        status: "online",
        cpuCores: body.cpuCores ?? 0,
        totalMemoryMb: body.totalMemoryMb ?? 0,
        lastSeenAt: new Date(),
      })
      .returning();

    await db
      .update(schema.onboardingTokens)
      .set({ used: true, usedByNodeId: nodeId })
      .where(eq(schema.onboardingTokens.id, tok.id));

    return c.json({ nodeId: node.id, agentVersion: AGENT_VERSION }, 201);
  })

  // ---------- AGENT: HEARTBEAT + METRICS ----------
  // Called periodically by the agent. Returns any queued commands.
  .post("/agent/:nodeId/report", async (c) => {
    const nodeId = c.req.param("nodeId");
    const [node] = await db
      .select()
      .from(schema.nodes)
      .where(eq(schema.nodes.id, nodeId));
    if (!node) return c.json({ error: "unknown_node" }, 404);

    const body = await c.req.json<{
      cpuPercent: number;
      memoryPercent: number;
      diskPercent: number;
      loadAvg1?: number;
      loadAvg5?: number;
      loadAvg15?: number;
      networkInKb?: number;
      networkOutKb?: number;
      uptimeSec?: number;
      processCount?: number;
    }>();

    await db.insert(schema.metrics).values({
      nodeId,
      cpuPercent: body.cpuPercent,
      memoryPercent: body.memoryPercent,
      diskPercent: body.diskPercent,
      loadAvg1: body.loadAvg1 ?? 0,
      loadAvg5: body.loadAvg5 ?? 0,
      loadAvg15: body.loadAvg15 ?? 0,
      networkInKb: body.networkInKb ?? 0,
      networkOutKb: body.networkOutKb ?? 0,
      uptimeSec: body.uptimeSec ?? 0,
      processCount: body.processCount ?? 0,
    });

    // health status from latest metric
    let status: "online" | "degraded" = "online";
    if (
      body.cpuPercent >= 85 ||
      body.memoryPercent >= 90 ||
      body.diskPercent >= 90
    )
      status = "degraded";

    await db
      .update(schema.nodes)
      .set({ status, lastSeenAt: new Date() })
      .where(eq(schema.nodes.id, nodeId));

    await evaluateMetric(nodeId, body);
    await resolveAlerts(nodeId, "heartbeat_missed");

    // deliver queued commands
    const queued = await db
      .select()
      .from(schema.commands)
      .where(
        and(
          eq(schema.commands.nodeId, nodeId),
          eq(schema.commands.status, "queued"),
        ),
      );
    for (const cmd of queued) {
      await db
        .update(schema.commands)
        .set({ status: "running" })
        .where(eq(schema.commands.id, cmd.id));
    }

    return c.json(
      {
        ok: true,
        commands: queued.map((q) => ({
          id: q.id,
          commandType: q.commandType,
          argument: q.argument,
        })),
      },
      200,
    );
  })

  // ---------- AGENT: COMMAND RESULT ----------
  .post("/agent/:nodeId/command-result", async (c) => {
    const nodeId = c.req.param("nodeId");
    const body = await c.req.json<{
      commandId: string;
      status: "success" | "failed";
      output: string;
    }>();
    await db
      .update(schema.commands)
      .set({
        status: body.status,
        output: body.output,
        completedAt: new Date(),
      })
      .where(
        and(
          eq(schema.commands.id, body.commandId),
          eq(schema.commands.nodeId, nodeId),
        ),
      );
    return c.json({ ok: true }, 200);
  })

  // ---------- NODES ----------
  .get("/nodes", async (c) => {
    await reconcileNodeHealth();
    const nodes = await db
      .select()
      .from(schema.nodes)
      .orderBy(desc(schema.nodes.createdAt));
    const withMetrics = await Promise.all(
      nodes.map(async (n) => ({
        ...n,
        latest: await latestMetric(n.id),
      })),
    );
    return c.json({ nodes: withMetrics }, 200);
  })
  .get("/nodes/:id", async (c) => {
    const id = c.req.param("id");
    const [node] = await db
      .select()
      .from(schema.nodes)
      .where(eq(schema.nodes.id, id));
    if (!node) return c.json({ error: "not_found" }, 404);
    const latest = await latestMetric(id);
    return c.json({ node: { ...node, latest } }, 200);
  })
  .get("/nodes/:id/metrics", async (c) => {
    const id = c.req.param("id");
    const since = new Date(Date.now() - 1000 * 60 * 60); // last hour
    const rows = await db
      .select()
      .from(schema.metrics)
      .where(
        and(
          eq(schema.metrics.nodeId, id),
          gte(schema.metrics.recordedAt, since),
        ),
      )
      .orderBy(desc(schema.metrics.recordedAt))
      .limit(120);
    return c.json({ metrics: rows.reverse() }, 200);
  })
  .delete("/nodes/:id", async (c) => {
    const id = c.req.param("id");
    await db.delete(schema.metrics).where(eq(schema.metrics.nodeId, id));
    await db.delete(schema.commands).where(eq(schema.commands.nodeId, id));
    await db.delete(schema.alerts).where(eq(schema.alerts.nodeId, id));
    await db.delete(schema.nodes).where(eq(schema.nodes.id, id));
    return c.json({ ok: true }, 200);
  })

  // ---------- COMMANDS ----------
  .get("/nodes/:id/commands", async (c) => {
    const id = c.req.param("id");
    const rows = await db
      .select()
      .from(schema.commands)
      .where(eq(schema.commands.nodeId, id))
      .orderBy(desc(schema.commands.createdAt))
      .limit(50);
    return c.json({ commands: rows }, 200);
  })
  .post("/nodes/:id/commands", async (c) => {
    const id = c.req.param("id");
    const body = await c.req.json<{ commandType: string; argument?: string }>();
    const allowed = [
      "restart_service",
      "restart_agent",
      "refresh_metrics",
      "run_health_check",
    ];
    if (!allowed.includes(body.commandType))
      return c.json({ error: "command_not_allowed" }, 400);
    const [cmd] = await db
      .insert(schema.commands)
      .values({
        id: uuid(),
        nodeId: id,
        commandType: body.commandType,
        argument: body.argument ?? "",
      })
      .returning();
    return c.json({ command: cmd }, 201);
  })

  // ---------- ALERTS ----------
  .get("/alerts", async (c) => {
    await reconcileNodeHealth();
    const rows = await db
      .select()
      .from(schema.alerts)
      .orderBy(desc(schema.alerts.createdAt))
      .limit(100);
    // attach hostname
    const nodes = await db.select().from(schema.nodes);
    const map = new Map(nodes.map((n) => [n.id, n.hostname]));
    return c.json(
      { alerts: rows.map((a) => ({ ...a, hostname: map.get(a.nodeId) ?? "—" })) },
      200,
    );
  })
  .post("/alerts/:id/resolve", async (c) => {
    await db
      .update(schema.alerts)
      .set({ resolved: true, resolvedAt: new Date() })
      .where(eq(schema.alerts.id, c.req.param("id")));
    return c.json({ ok: true }, 200);
  })

  // ---------- FLEET SUMMARY ----------
  .get("/summary", async (c) => {
    await reconcileNodeHealth();
    const nodes = await db.select().from(schema.nodes);
    const alerts = await db.select().from(schema.alerts);
    const openAlerts = alerts.filter((a) => !a.resolved);
    const summary = {
      total: nodes.length,
      online: nodes.filter((n) => n.status === "online").length,
      degraded: nodes.filter((n) => n.status === "degraded").length,
      offline: nodes.filter((n) => n.status === "offline").length,
      pending: nodes.filter((n) => n.status === "pending").length,
      openAlerts: openAlerts.length,
      criticalAlerts: openAlerts.filter((a) => a.severity === "critical").length,
    };
    return c.json({ summary }, 200);
  });

export type AppType = typeof app;
export default app;
