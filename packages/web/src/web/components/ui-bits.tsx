import { statusColor, statusLabel, severityColor } from "../lib/fleet";

export function StatusPill({ status }: { status: string }) {
  const color = statusColor[status] ?? "#8b98a9";
  return (
    <span
      className="inline-flex items-center gap-2 rounded-full px-2.5 py-1 text-xs font-medium"
      style={{ background: `${color}1a`, color }}
    >
      <span
        className={`h-2 w-2 rounded-full ${status === "online" ? "pulse-dot" : ""}`}
        style={{ background: color }}
      />
      {statusLabel[status] ?? status}
    </span>
  );
}

export function SeverityPill({ severity }: { severity: string }) {
  const color = severityColor[severity] ?? "#8b98a9";
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded px-2 py-0.5 text-xs font-semibold uppercase tracking-wide"
      style={{ background: `${color}1a`, color }}
    >
      {severity}
    </span>
  );
}

export function MetricBar({
  label,
  value,
  unit = "%",
  danger = 90,
  warn = 75,
}: {
  label: string;
  value: number;
  unit?: string;
  danger?: number;
  warn?: number;
}) {
  const color =
    value >= danger ? "#f85149" : value >= warn ? "#d29922" : "#3fb950";
  return (
    <div>
      <div className="mb-1 flex items-center justify-between text-xs">
        <span style={{ color: "#8b98a9" }}>{label}</span>
        <span className="mono font-medium" style={{ color }}>
          {value.toFixed(0)}
          {unit}
        </span>
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full"
        style={{ background: "#1e2733" }}
      >
        <div
          className="h-full rounded-full transition-all duration-500"
          style={{ width: `${Math.min(value, 100)}%`, background: color }}
        />
      </div>
    </div>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-xl border p-5 ${className}`}
      style={{ background: "#111722", borderColor: "#1e2733" }}
    >
      {children}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-12">
      <div
        className="h-6 w-6 animate-spin rounded-full border-2 border-t-transparent"
        style={{ borderColor: "#3fb950", borderTopColor: "transparent" }}
      />
    </div>
  );
}
