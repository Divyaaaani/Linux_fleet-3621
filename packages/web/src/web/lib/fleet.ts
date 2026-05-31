export type NodeStatus = "online" | "offline" | "degraded" | "pending";

export const statusColor: Record<string, string> = {
  online: "#3fb950",
  degraded: "#d29922",
  offline: "#f85149",
  pending: "#58a6ff",
};

export const statusLabel: Record<string, string> = {
  online: "Online",
  degraded: "Degraded",
  offline: "Offline",
  pending: "Pending",
};

export const severityColor: Record<string, string> = {
  info: "#58a6ff",
  warning: "#d29922",
  critical: "#f85149",
};

export function timeAgo(ts: string | number | Date | null | undefined): string {
  if (!ts) return "never";
  const d = new Date(ts).getTime();
  const sec = Math.floor((Date.now() - d) / 1000);
  if (sec < 5) return "just now";
  if (sec < 60) return `${sec}s ago`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `${min}m ago`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `${hr}h ago`;
  return `${Math.floor(hr / 24)}d ago`;
}

export function fmtUptime(sec: number): string {
  if (!sec) return "—";
  const d = Math.floor(sec / 86400);
  const h = Math.floor((sec % 86400) / 3600);
  const m = Math.floor((sec % 3600) / 60);
  if (d > 0) return `${d}d ${h}h`;
  if (h > 0) return `${h}h ${m}m`;
  return `${m}m`;
}

export function fmtBytes(mb: number): string {
  if (mb >= 1024) return `${(mb / 1024).toFixed(1)} GB`;
  return `${mb} MB`;
}
