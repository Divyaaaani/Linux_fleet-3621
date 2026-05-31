import { Link, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { api } from "../lib/api";
import {
  LayoutDashboard,
  Server,
  Bell,
  KeyRound,
  Terminal,
  BarChart3,
} from "lucide-react";

const nav = [
  { to: "/", label: "Overview", icon: LayoutDashboard },
  { to: "/nodes", label: "Nodes", icon: Server },
  { to: "/alerts", label: "Alerts", icon: Bell },
  { to: "/grafana", label: "Grafana", icon: BarChart3 },
  { to: "/onboarding", label: "Onboarding", icon: KeyRound },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [loc] = useLocation();

  const summary = useQuery({
    queryKey: ["summary"],
    queryFn: async () => (await api.summary.$get()).json(),
    refetchInterval: 5000,
  });

  const openAlerts = summary.data?.summary.openAlerts ?? 0;

  return (
    <div className="flex h-screen" style={{ background: "#0a0e14" }}>
      {/* Sidebar */}
      <aside
        className="flex w-60 flex-col border-r"
        style={{ background: "#0d1320", borderColor: "#1e2733" }}
      >
        <div
          className="flex items-center gap-2.5 border-b px-5 py-4"
          style={{ borderColor: "#1e2733" }}
        >
          <div
            className="flex h-8 w-8 items-center justify-center rounded-lg"
            style={{ background: "#3fb95022" }}
          >
            <Terminal size={18} style={{ color: "#3fb950" }} />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">FleetOps</div>
            <div className="text-[10px] mono" style={{ color: "#8b98a9" }}>
              linux fleet manager
            </div>
          </div>
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {nav.map((item) => {
            const active =
              item.to === "/" ? loc === "/" : loc.startsWith(item.to);
            const Icon = item.icon;
            return (
              <Link
                key={item.to}
                to={item.to}
                className="flex items-center justify-between rounded-lg px-3 py-2 text-sm transition-colors"
                style={{
                  background: active ? "#161d2b" : "transparent",
                  color: active ? "#e6edf3" : "#8b98a9",
                }}
              >
                <span className="flex items-center gap-3">
                  <Icon size={17} style={{ color: active ? "#3fb950" : "#8b98a9" }} />
                  {item.label}
                </span>
                {item.to === "/alerts" && openAlerts > 0 && (
                  <span
                    className="rounded-full px-1.5 py-0.5 text-[10px] font-bold"
                    style={{ background: "#f85149", color: "#fff" }}
                  >
                    {openAlerts}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        <div
          className="border-t px-5 py-3 text-[11px] mono"
          style={{ borderColor: "#1e2733", color: "#8b98a9" }}
        >
          <div className="flex items-center justify-between">
            <span>nodes</span>
            <span style={{ color: "#e6edf3" }}>
              {summary.data?.summary.total ?? 0}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span>online</span>
            <span style={{ color: "#3fb950" }}>
              {summary.data?.summary.online ?? 0}
            </span>
          </div>
        </div>
      </aside>

      {/* Main */}
      <main className="flex-1 overflow-y-auto">{children}</main>
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div
      className="sticky top-0 z-10 flex items-center justify-between border-b px-8 py-5 backdrop-blur"
      style={{ background: "#0a0e14cc", borderColor: "#1e2733" }}
    >
      <div>
        <h1 className="text-xl font-semibold">{title}</h1>
        {subtitle && (
          <p className="text-sm" style={{ color: "#8b98a9" }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
