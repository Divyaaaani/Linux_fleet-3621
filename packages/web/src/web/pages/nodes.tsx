import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import { api } from "../lib/api";
import { Layout, PageHeader } from "../components/layout";
import { Card, StatusPill, Spinner } from "../components/ui-bits";
import { timeAgo } from "../lib/fleet";
import { Trash2, Search, ChevronRight } from "lucide-react";

export default function NodesPage() {
  const qc = useQueryClient();
  const [q, setQ] = useState("");
  const [filter, setFilter] = useState<string>("all");

  const nodes = useQuery({
    queryKey: ["nodes"],
    queryFn: async () => (await api.nodes.$get()).json(),
    refetchInterval: 5000,
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      await api.nodes[":id"].$delete({ param: { id } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["nodes"] }),
  });

  let list = nodes.data?.nodes ?? [];
  if (filter !== "all") list = list.filter((n) => n.status === filter);
  if (q)
    list = list.filter(
      (n) =>
        n.hostname.toLowerCase().includes(q.toLowerCase()) ||
        n.ipAddress.includes(q),
    );

  const filters = ["all", "online", "degraded", "offline"];

  return (
    <Layout>
      <PageHeader title="Nodes" subtitle="All managed Linux machines in the fleet" />
      <div className="space-y-4 p-8">
        <div className="flex items-center gap-3">
          <div
            className="flex flex-1 items-center gap-2 rounded-lg border px-3 py-2"
            style={{ background: "#111722", borderColor: "#1e2733" }}
          >
            <Search size={16} style={{ color: "#8b98a9" }} />
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Search hostname or IP…"
              className="flex-1 bg-transparent text-sm outline-none"
              style={{ color: "#e6edf3" }}
            />
          </div>
          <div className="flex gap-1">
            {filters.map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className="rounded-lg px-3 py-2 text-xs font-medium capitalize transition-colors"
                style={{
                  background: filter === f ? "#161d2b" : "#111722",
                  color: filter === f ? "#e6edf3" : "#8b98a9",
                  border: "1px solid #1e2733",
                }}
              >
                {f}
              </button>
            ))}
          </div>
        </div>

        <Card className="!p-0">
          {nodes.isLoading ? (
            <Spinner />
          ) : list.length === 0 ? (
            <div className="py-12 text-center text-sm" style={{ color: "#8b98a9" }}>
              No nodes match.
            </div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr
                  className="border-b text-left text-xs uppercase tracking-wide"
                  style={{ borderColor: "#1e2733", color: "#8b98a9" }}
                >
                  <th className="px-5 py-3 font-medium">Status</th>
                  <th className="px-5 py-3 font-medium">Hostname</th>
                  <th className="px-5 py-3 font-medium">IP</th>
                  <th className="px-5 py-3 font-medium">OS</th>
                  <th className="px-5 py-3 font-medium">CPU</th>
                  <th className="px-5 py-3 font-medium">Mem</th>
                  <th className="px-5 py-3 font-medium">Disk</th>
                  <th className="px-5 py-3 font-medium">Env</th>
                  <th className="px-5 py-3 font-medium">Last seen</th>
                  <th className="px-5 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {list.map((n) => (
                  <tr
                    key={n.id}
                    className="border-b transition-colors hover:bg-[#0d1320]"
                    style={{ borderColor: "#161d2b" }}
                  >
                    <td className="px-5 py-3">
                      <StatusPill status={n.status} />
                    </td>
                    <td className="px-5 py-3">
                      <Link
                        to={`/nodes/${n.id}`}
                        className="font-medium hover:underline"
                        style={{ color: "#e6edf3" }}
                      >
                        {n.hostname}
                      </Link>
                    </td>
                    <td className="px-5 py-3 mono" style={{ color: "#58a6ff" }}>
                      {n.ipAddress || "—"}
                    </td>
                    <td className="px-5 py-3" style={{ color: "#8b98a9" }}>
                      {n.osName} {n.osVersion}
                    </td>
                    <Metric val={n.latest?.cpuPercent} />
                    <Metric val={n.latest?.memoryPercent} />
                    <Metric val={n.latest?.diskPercent} />
                    <td className="px-5 py-3">
                      <span
                        className="rounded px-2 py-0.5 text-xs mono"
                        style={{ background: "#161d2b", color: "#8b98a9" }}
                      >
                        {n.environment}
                      </span>
                    </td>
                    <td className="px-5 py-3 mono text-xs" style={{ color: "#8b98a9" }}>
                      {timeAgo(n.lastSeenAt)}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${n.hostname} from fleet?`))
                              del.mutate(n.id);
                          }}
                          className="rounded p-1.5 transition-colors hover:bg-[#f8514922]"
                          title="Remove node"
                        >
                          <Trash2 size={15} style={{ color: "#f85149" }} />
                        </button>
                        <Link to={`/nodes/${n.id}`}>
                          <ChevronRight size={16} style={{ color: "#8b98a9" }} />
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Card>
      </div>
    </Layout>
  );
}

function Metric({ val }: { val?: number }) {
  const v = val ?? 0;
  const color = v >= 90 ? "#f85149" : v >= 75 ? "#d29922" : "#3fb950";
  return (
    <td className="px-5 py-3 mono" style={{ color: val == null ? "#8b98a9" : color }}>
      {val == null ? "—" : `${v.toFixed(0)}%`}
    </td>
  );
}
