import { db } from "../database";
import * as schema from "../database/schema";
import { eq, desc } from "drizzle-orm";

export function uuid() {
  return crypto.randomUUID();
}

export function genToken() {
  // human-friendly onboarding token
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  return (
    "flt_" +
    Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

// Thresholds for auto alerts
export const THRESHOLDS = {
  cpu: 85,
  memory: 90,
  disk: 90,
  heartbeatTimeoutSec: 90,
};

// Create an alert if not already open for that node+type
export async function raiseAlert(
  nodeId: string,
  alertType: string,
  severity: "info" | "warning" | "critical",
  message: string,
) {
  const existing = await db
    .select()
    .from(schema.alerts)
    .where(eq(schema.alerts.nodeId, nodeId));
  const open = existing.find((a) => a.alertType === alertType && !a.resolved);
  if (open) return;
  await db.insert(schema.alerts).values({
    id: uuid(),
    nodeId,
    alertType,
    severity,
    message,
  });
}

export async function resolveAlerts(nodeId: string, alertType: string) {
  const existing = await db
    .select()
    .from(schema.alerts)
    .where(eq(schema.alerts.nodeId, nodeId));
  for (const a of existing) {
    if (a.alertType === alertType && !a.resolved) {
      await db
        .update(schema.alerts)
        .set({ resolved: true, resolvedAt: new Date() })
        .where(eq(schema.alerts.id, a.id));
    }
  }
}

// Evaluate a fresh metric and raise/resolve threshold alerts
export async function evaluateMetric(nodeId: string, m: {
  cpuPercent: number;
  memoryPercent: number;
  diskPercent: number;
}) {
  if (m.cpuPercent >= THRESHOLDS.cpu)
    await raiseAlert(nodeId, "cpu_high", "warning", `CPU usage at ${m.cpuPercent.toFixed(0)}% (threshold ${THRESHOLDS.cpu}%)`);
  else await resolveAlerts(nodeId, "cpu_high");

  if (m.memoryPercent >= THRESHOLDS.memory)
    await raiseAlert(nodeId, "memory_high", "critical", `Memory usage at ${m.memoryPercent.toFixed(0)}% (threshold ${THRESHOLDS.memory}%)`);
  else await resolveAlerts(nodeId, "memory_high");

  if (m.diskPercent >= THRESHOLDS.disk)
    await raiseAlert(nodeId, "disk_high", "critical", `Disk usage at ${m.diskPercent.toFixed(0)}% (threshold ${THRESHOLDS.disk}%)`);
  else await resolveAlerts(nodeId, "disk_high");
}

// Mark nodes offline if heartbeat missed, raise alerts
export async function reconcileNodeHealth() {
  const all = await db.select().from(schema.nodes);
  const now = Date.now();
  for (const n of all) {
    if (n.status === "pending") continue;
    const last = n.lastSeenAt ? new Date(n.lastSeenAt).getTime() : 0;
    const ageSec = (now - last) / 1000;
    if (ageSec > THRESHOLDS.heartbeatTimeoutSec) {
      if (n.status !== "offline") {
        await db.update(schema.nodes).set({ status: "offline" }).where(eq(schema.nodes.id, n.id));
      }
      await raiseAlert(n.id, "heartbeat_missed", "critical", `No heartbeat for ${Math.round(ageSec)}s`);
    } else {
      await resolveAlerts(n.id, "heartbeat_missed");
    }
  }
}

export async function latestMetric(nodeId: string) {
  const rows = await db
    .select()
    .from(schema.metrics)
    .where(eq(schema.metrics.nodeId, nodeId))
    .orderBy(desc(schema.metrics.recordedAt))
    .limit(1);
  return rows[0] ?? null;
}
