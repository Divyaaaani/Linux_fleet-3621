import { sqliteTable, text, integer, real } from "drizzle-orm/sqlite-core";

// Managed Linux nodes
export const nodes = sqliteTable("nodes", {
  id: text("id").primaryKey(), // uuid
  hostname: text("hostname").notNull(),
  ipAddress: text("ip_address").notNull().default(""),
  osName: text("os_name").notNull().default(""),
  osVersion: text("os_version").notNull().default(""),
  kernelVersion: text("kernel_version").notNull().default(""),
  arch: text("arch").notNull().default(""),
  agentVersion: text("agent_version").notNull().default(""),
  environment: text("environment").notNull().default("production"), // production | staging | dev
  tags: text("tags").notNull().default(""), // comma separated
  status: text("status").notNull().default("pending"), // pending | online | offline | degraded
  cpuCores: integer("cpu_cores").notNull().default(0),
  totalMemoryMb: integer("total_memory_mb").notNull().default(0),
  lastSeenAt: integer("last_seen_at", { mode: "timestamp" }),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Onboarding tokens used by agents to register
export const onboardingTokens = sqliteTable("onboarding_tokens", {
  id: text("id").primaryKey(),
  token: text("token").notNull().unique(),
  label: text("label").notNull().default(""),
  environment: text("environment").notNull().default("production"),
  used: integer("used", { mode: "boolean" }).notNull().default(false),
  usedByNodeId: text("used_by_node_id"),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Time-series metrics reported by agents
export const metrics = sqliteTable("metrics", {
  id: integer("id").primaryKey({ autoIncrement: true }),
  nodeId: text("node_id").notNull(),
  cpuPercent: real("cpu_percent").notNull().default(0),
  memoryPercent: real("memory_percent").notNull().default(0),
  diskPercent: real("disk_percent").notNull().default(0),
  loadAvg1: real("load_avg_1").notNull().default(0),
  loadAvg5: real("load_avg_5").notNull().default(0),
  loadAvg15: real("load_avg_15").notNull().default(0),
  networkInKb: real("network_in_kb").notNull().default(0),
  networkOutKb: real("network_out_kb").notNull().default(0),
  uptimeSec: integer("uptime_sec").notNull().default(0),
  processCount: integer("process_count").notNull().default(0),
  recordedAt: integer("recorded_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
});

// Remote commands queued / executed on nodes
export const commands = sqliteTable("commands", {
  id: text("id").primaryKey(),
  nodeId: text("node_id").notNull(),
  commandType: text("command_type").notNull(), // restart_service | restart_agent | refresh_metrics | run_health_check
  argument: text("argument").notNull().default(""), // e.g. service name
  status: text("status").notNull().default("queued"), // queued | running | success | failed
  output: text("output").notNull().default(""),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  completedAt: integer("completed_at", { mode: "timestamp" }),
});

// Alerts raised by the control plane
export const alerts = sqliteTable("alerts", {
  id: text("id").primaryKey(),
  nodeId: text("node_id").notNull(),
  alertType: text("alert_type").notNull(), // heartbeat_missed | cpu_high | memory_high | disk_high | agent_unreachable
  severity: text("severity").notNull().default("warning"), // info | warning | critical
  message: text("message").notNull(),
  resolved: integer("resolved", { mode: "boolean" }).notNull().default(false),
  createdAt: integer("created_at", { mode: "timestamp" })
    .notNull()
    .$defaultFn(() => new Date()),
  resolvedAt: integer("resolved_at", { mode: "timestamp" }),
});
