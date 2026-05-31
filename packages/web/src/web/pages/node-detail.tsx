import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useParams, Link } from "wouter";
import { useState } from "react";
import { api } from "../lib/api";
import { Layout, PageHeader } from "../components/layout";
import { Card, StatusPill, MetricBar, Spinner } from "../components/ui-bits";
import { LineChart } from "../components/sparkline";
import { timeAgo, fmtUptime, fmtBytes } from "../lib/fleet";
import {
  ArrowLeft,
  RefreshCw,
  RotateCw,
  HeartPulse,
  Cpu,
  Play,
} from "lucide-react";

const COMMANDS = [
  { type: "refresh_metrics", label: "Refresh Metrics", icon: RefreshCw, arg: false },
  { type: "run_health_check", label: "Health Check", icon: HeartPulse, arg: false },
  { type: "restart_agent", label: "Restart Agent", icon: RotateCw, arg: false },
  { type: "restart_service", label: "Restart Service", icon: Play, arg: true },
];

export default function NodeDetail() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [svc, setSvc] = useState("");

  const node = useQuery({
    queryKey: ["node", id],
    queryFn: async () => (await api.nodes[":id"].$get({ param: { id } })).json(),
    refetchInterval: 5000,
  });
  const metrics = useQuery({
    queryKey: ["node-metrics", id],
    queryFn: async () =>
      (await api.nodes[":id"].metrics.$get({ param: { id } })).json(),
    refetchInterval: 5000,
  });
  const commands = useQuery({
    queryKey: ["node-commands", id],
    queryFn: async () =>
      (await api.nodes[":id"].commands.$get({ param: { id } })).json(),
    refetchInterval: 3000,
  });

  const sendCmd = useMutation({
    mutationFn: async (p: { commandType: string; argument?: string }) => {
      await api.nodes[":id"].commands.$post({ param: { id }, json: p });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["node-commands", id] }),
  });

  if (node.isLoading)
    return (
      <Layout>
        <Spinner />
      </Layout>
    );

  const n = node.data && "node" in node.data ? node.data.node : null;
  if (!n)
    return (
      <Layout>
        <div className="p-8" style={{ color: "#8b98a9" }}>
          Node not found.{" "}
          <Link to="/nodes" style={{ color: "#58a6ff" }}>
            Back to nodes
          </Link>
        </div>
      </Layout>
    );

  const m = metrics.data?.metrics ?? [];
  const cpuSeries = m.map((x) => x.cpuPercent);
  const memSeries = m.map((x) => x.memoryPercent);
  const diskSeries = m.map((x) => x.diskPercent);

  return (
    <Layout>
      <PageHeader
        title={n.hostname}
        subtitle={`${n.ipAddress || "no ip"} · agent v${n.agentVersion || "—"}`}
        action={<StatusPill status={n.status} />}
      />
      <div className="space-y-6 p-8">
        <Link
          to="/nodes"
          className="flex w-fit items-center gap-1.5 text-sm"
          style={{ color: "#8b98a9" }}
        >
          <ArrowLeft size={15} /> All nodes
        </Link>

        {/* Info + live metrics */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <h2 className="mb-4 font-semibold">System Info</h2>
            <dl className="space-y-2.5 text-sm">
              <Row k="OS" v={`${n.osName} ${n.osVersion}`} />
              <Row k="Kernel" v={n.kernelVersion || "—"} mono />
              <Row k="Arch" v={n.arch || "—"} mono />
              <Row k="CPU Cores" v={String(n.cpuCores || "—")} mono />
              <Row k="Memory" v={n.totalMemoryMb ? fmtBytes(n.totalMemoryMb) : "—"} mono />
              <Row k="Environment" v={n.environment} mono />
              <Row k="Uptime" v={fmtUptime(n.latest?.uptimeSec ?? 0)} mono />
              <Row k="Processes" v={String(n.latest?.processCount ?? "—")} mono />
              <Row k="Last seen" v={timeAgo(n.lastSeenAt)} mono />
            </dl>
          </Card>

          <Card className="lg:col-span-2">
            <h2 className="mb-4 font-semibold">Live Resources</h2>
            <div className="grid grid-cols-2 gap-x-8 gap-y-4">
              <MetricBar label="CPU" value={n.latest?.cpuPercent ?? 0} />
              <MetricBar label="Memory" value={n.latest?.memoryPercent ?? 0} />
              <MetricBar label="Disk" value={n.latest?.diskPercent ?? 0} />
              <div>
                <div className="mb-1 flex items-center justify-between text-xs">
                  <span style={{ color: "#8b98a9" }}>Load Avg (1/5/15)</span>
                </div>
                <div className="mono text-sm" style={{ color: "#e6edf3" }}>
                  {(n.latest?.loadAvg1 ?? 0).toFixed(2)} /{" "}
                  {(n.latest?.loadAvg5 ?? 0).toFixed(2)} /{" "}
                  {(n.latest?.loadAvg15 ?? 0).toFixed(2)}
                </div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4">
              <NetStat label="Net In" value={n.latest?.networkInKb ?? 0} />
              <NetStat label="Net Out" value={n.latest?.networkOutKb ?? 0} />
            </div>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <Card>
            <ChartHead icon={Cpu} label="CPU %" color="#3fb950" />
            <LineChart data={cpuSeries} color="#3fb950" label="cpu" />
          </Card>
          <Card>
            <ChartHead icon={Cpu} label="Memory %" color="#58a6ff" />
            <LineChart data={memSeries} color="#58a6ff" label="mem" />
          </Card>
          <Card>
            <ChartHead icon={Cpu} label="Disk %" color="#d29922" />
            <LineChart data={diskSeries} color="#d29922" label="disk" />
          </Card>
        </div>

        {/* Remote commands */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <h2 className="mb-4 font-semibold">Remote Actions</h2>
            <div className="grid grid-cols-2 gap-3">
              {COMMANDS.map((cmd) => {
                const Icon = cmd.icon;
                return (
                  <button
                    key={cmd.type}
                    disabled={sendCmd.isPending}
                    onClick={() =>
                      sendCmd.mutate({
                        commandType: cmd.type,
                        argument: cmd.arg ? svc : undefined,
                      })
                    }
                    className="flex items-center gap-2.5 rounded-lg border px-4 py-3 text-sm font-medium transition-colors hover:border-[#3fb950] disabled:opacity-50"
                    style={{ background: "#0d1320", borderColor: "#1e2733" }}
                  >
                    <Icon size={16} style={{ color: "#3fb950" }} />
                    {cmd.label}
                  </button>
                );
              })}
            </div>
            <input
              value={svc}
              onChange={(e) => setSvc(e.target.value)}
              placeholder="service name (e.g. nginx) for restart"
              className="mt-3 w-full rounded-lg border px-3 py-2 text-sm mono outline-none"
              style={{ background: "#0d1320", borderColor: "#1e2733", color: "#e6edf3" }}
            />
            <p className="mt-2 text-xs" style={{ color: "#8b98a9" }}>
              Commands are queued and delivered to the agent on its next report. Only
              allow-listed actions are permitted.
            </p>
          </Card>

          <Card>
            <h2 className="mb-4 font-semibold">Command History</h2>
            {(commands.data?.commands ?? []).length === 0 ? (
              <div className="py-6 text-center text-sm" style={{ color: "#8b98a9" }}>
                No commands yet.
              </div>
            ) : (
              <div className="max-h-72 space-y-2 overflow-y-auto">
                {(commands.data?.commands ?? []).map((c) => (
                  <div
                    key={c.id}
                    className="rounded-lg border p-3"
                    style={{ background: "#0d1320", borderColor: "#1e2733" }}
                  >
                    <div className="flex items-center justify-between">
                      <span className="mono text-sm" style={{ color: "#e6edf3" }}>
                        {c.commandType}
                        {c.argument ? ` ${c.argument}` : ""}
                      </span>
                      <CmdStatus status={c.status} />
                    </div>
                    {c.output && (
                      <pre
                        className="mt-2 max-h-24 overflow-auto rounded p-2 text-xs mono"
                        style={{ background: "#0a0e14", color: "#8b98a9" }}
                      >
                        {c.output}
                      </pre>
                    )}
                    <div className="mt-1 text-[11px] mono" style={{ color: "#8b98a9" }}>
                      {timeAgo(c.createdAt)}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>
      </div>
    </Layout>
  );
}

function Row({ k, v, mono }: { k: string; v: string; mono?: boolean }) {
  return (
    <div className="flex items-center justify-between">
      <dt style={{ color: "#8b98a9" }}>{k}</dt>
      <dd className={mono ? "mono" : ""} style={{ color: "#e6edf3" }}>
        {v}
      </dd>
    </div>
  );
}

function NetStat({ label, value }: { label: string; value: number }) {
  return (
    <div
      className="rounded-lg border px-3 py-2"
      style={{ background: "#0d1320", borderColor: "#1e2733" }}
    >
      <div className="text-xs" style={{ color: "#8b98a9" }}>
        {label}
      </div>
      <div className="mono text-sm" style={{ color: "#e6edf3" }}>
        {value.toFixed(0)} KB/s
      </div>
    </div>
  );
}

function ChartHead({ icon: Icon, label, color }: any) {
  return (
    <div className="mb-3 flex items-center gap-2">
      <Icon size={15} style={{ color }} />
      <h3 className="text-sm font-medium">{label}</h3>
    </div>
  );
}

function CmdStatus({ status }: { status: string }) {
  const map: Record<string, string> = {
    queued: "#8b98a9",
    running: "#58a6ff",
    success: "#3fb950",
    failed: "#f85149",
  };
  return (
    <span
      className="rounded px-2 py-0.5 text-[11px] font-semibold uppercase mono"
      style={{ background: `${map[status]}1a`, color: map[status] }}
    >
      {status}
    </span>
  );
}
