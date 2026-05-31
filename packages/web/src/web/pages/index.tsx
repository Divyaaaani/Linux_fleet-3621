import { useQuery } from "@tanstack/react-query";
import { Link } from "wouter";
import { api } from "../lib/api";
import { Layout, PageHeader } from "../components/layout";
import { Card, StatusPill, MetricBar, Spinner, SeverityPill } from "../components/ui-bits";
import { Sparkline } from "../components/sparkline";
import { timeAgo } from "../lib/fleet";
import { Server, CheckCircle2, AlertTriangle, WifiOff, Activity, ArrowRight } from "lucide-react";

export default function Index() {
  const summary = useQuery({
    queryKey: ["summary"],
    queryFn: async () => (await api.summary.$get()).json(),
    refetchInterval: 5000,
  });
  const nodes = useQuery({
    queryKey: ["nodes"],
    queryFn: async () => (await api.nodes.$get()).json(),
    refetchInterval: 5000,
  });
  const alerts = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => (await api.alerts.$get()).json(),
    refetchInterval: 5000,
  });

  const s = summary.data?.summary;
  const openAlerts = (alerts.data?.alerts ?? []).filter((a) => !a.resolved).slice(0, 5);

  const stats = [
    { label: "Total Nodes", value: s?.total ?? 0, icon: Server, color: "#58a6ff" },
    { label: "Online", value: s?.online ?? 0, icon: CheckCircle2, color: "#3fb950" },
    { label: "Degraded", value: s?.degraded ?? 0, icon: AlertTriangle, color: "#d29922" },
    { label: "Offline", value: s?.offline ?? 0, icon: WifiOff, color: "#f85149" },
  ];

  return (
    <Layout>
      <PageHeader
        title="Fleet Overview"
        subtitle="Real-time health across all managed Linux nodes"
        action={
          <span className="flex items-center gap-2 text-xs mono" style={{ color: "#8b98a9" }}>
            <Activity size={14} style={{ color: "#3fb950" }} className="pulse-dot" />
            live · 5s
          </span>
        }
      />

      <div className="space-y-6 p-8">
        {/* Stat cards */}
        <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          {stats.map((st, i) => {
            const Icon = st.icon;
            return (
              <Card key={st.label} className={`fade-up`}>
                <div style={{ animationDelay: `${i * 50}ms` }}>
                  <div className="flex items-center justify-between">
                    <span className="text-sm" style={{ color: "#8b98a9" }}>
                      {st.label}
                    </span>
                    <Icon size={18} style={{ color: st.color }} />
                  </div>
                  <div className="mt-2 text-3xl font-semibold mono">{st.value}</div>
                </div>
              </Card>
            );
          })}
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Node list */}
          <div className="lg:col-span-2">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Nodes</h2>
                <Link
                  to="/nodes"
                  className="flex items-center gap-1 text-xs"
                  style={{ color: "#58a6ff" }}
                >
                  view all <ArrowRight size={13} />
                </Link>
              </div>
              {nodes.isLoading ? (
                <Spinner />
              ) : (nodes.data?.nodes ?? []).length === 0 ? (
                <EmptyNodes />
              ) : (
                <div className="space-y-2">
                  {(nodes.data?.nodes ?? []).slice(0, 6).map((n) => (
                    <Link key={n.id} to={`/nodes/${n.id}`}>
                      <div
                        className="flex items-center justify-between rounded-lg border px-4 py-3 transition-colors hover:border-[#2f3e57]"
                        style={{ background: "#0d1320", borderColor: "#1e2733" }}
                      >
                        <div className="flex items-center gap-3">
                          <StatusPill status={n.status} />
                          <div>
                            <div className="text-sm font-medium">{n.hostname}</div>
                            <div className="text-xs mono" style={{ color: "#8b98a9" }}>
                              {n.ipAddress || "—"} · {n.osName} {n.osVersion}
                            </div>
                          </div>
                        </div>
                        <div className="hidden items-center gap-6 md:flex">
                          <MiniStat
                            label="CPU"
                            value={n.latest?.cpuPercent ?? 0}
                          />
                          <MiniStat
                            label="MEM"
                            value={n.latest?.memoryPercent ?? 0}
                          />
                          <span className="text-xs mono" style={{ color: "#8b98a9" }}>
                            {timeAgo(n.lastSeenAt)}
                          </span>
                        </div>
                      </div>
                    </Link>
                  ))}
                </div>
              )}
            </Card>
          </div>

          {/* Alerts + load */}
          <div className="space-y-6">
            <Card>
              <div className="mb-4 flex items-center justify-between">
                <h2 className="font-semibold">Active Alerts</h2>
                <Link to="/alerts" className="text-xs" style={{ color: "#58a6ff" }}>
                  all
                </Link>
              </div>
              {alerts.isLoading ? (
                <Spinner />
              ) : openAlerts.length === 0 ? (
                <div className="py-6 text-center text-sm" style={{ color: "#8b98a9" }}>
                  <CheckCircle2 size={24} className="mx-auto mb-2" style={{ color: "#3fb950" }} />
                  All clear. No active alerts.
                </div>
              ) : (
                <div className="space-y-2">
                  {openAlerts.map((a) => (
                    <div
                      key={a.id}
                      className="rounded-lg border px-3 py-2.5"
                      style={{ background: "#0d1320", borderColor: "#1e2733" }}
                    >
                      <div className="mb-1 flex items-center justify-between">
                        <SeverityPill severity={a.severity} />
                        <span className="text-[11px] mono" style={{ color: "#8b98a9" }}>
                          {timeAgo(a.createdAt)}
                        </span>
                      </div>
                      <div className="text-sm">{a.message}</div>
                      <div className="text-xs mono" style={{ color: "#58a6ff" }}>
                        {a.hostname}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </Layout>
  );
}

function MiniStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="w-20">
      <MetricBar label={label} value={value} />
    </div>
  );
}

function EmptyNodes() {
  return (
    <div className="py-10 text-center">
      <Server size={28} className="mx-auto mb-3" style={{ color: "#8b98a9" }} />
      <p className="text-sm" style={{ color: "#8b98a9" }}>
        No nodes onboarded yet.
      </p>
      <Link
        to="/onboarding"
        className="mt-3 inline-block rounded-lg px-4 py-2 text-sm font-medium"
        style={{ background: "#3fb950", color: "#0a0e14" }}
      >
        Onboard a node
      </Link>
    </div>
  );
}
