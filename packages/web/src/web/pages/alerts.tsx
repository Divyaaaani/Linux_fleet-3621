import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Link } from "wouter";
import { useState } from "react";
import { api } from "../lib/api";
import { Layout, PageHeader } from "../components/layout";
import { Card, SeverityPill, Spinner } from "../components/ui-bits";
import { timeAgo } from "../lib/fleet";
import { CheckCircle2, Bell } from "lucide-react";

export default function AlertsPage() {
  const qc = useQueryClient();
  const [showResolved, setShowResolved] = useState(false);

  const alerts = useQuery({
    queryKey: ["alerts"],
    queryFn: async () => (await api.alerts.$get()).json(),
    refetchInterval: 5000,
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      await api.alerts[":id"].resolve.$post({ param: { id } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["alerts"] }),
  });

  let list = alerts.data?.alerts ?? [];
  if (!showResolved) list = list.filter((a) => !a.resolved);

  return (
    <Layout>
      <PageHeader
        title="Alerts"
        subtitle="Threshold breaches, missed heartbeats, and node failures"
        action={
          <label className="flex items-center gap-2 text-sm" style={{ color: "#8b98a9" }}>
            <input
              type="checkbox"
              checked={showResolved}
              onChange={(e) => setShowResolved(e.target.checked)}
            />
            show resolved
          </label>
        }
      />
      <div className="p-8">
        {alerts.isLoading ? (
          <Spinner />
        ) : list.length === 0 ? (
          <Card>
            <div className="py-12 text-center">
              <CheckCircle2 size={32} className="mx-auto mb-3" style={{ color: "#3fb950" }} />
              <p className="text-sm" style={{ color: "#8b98a9" }}>
                No {showResolved ? "" : "active "}alerts. Fleet is healthy.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {list.map((a) => (
              <Card key={a.id} className="!p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <Bell
                      size={18}
                      style={{ color: a.resolved ? "#8b98a9" : "#f85149" }}
                    />
                    <div>
                      <div className="flex items-center gap-2">
                        <SeverityPill severity={a.severity} />
                        <span
                          className="rounded px-2 py-0.5 text-[11px] mono"
                          style={{ background: "#161d2b", color: "#8b98a9" }}
                        >
                          {a.alertType}
                        </span>
                        {a.resolved && (
                          <span className="text-[11px] mono" style={{ color: "#3fb950" }}>
                            resolved
                          </span>
                        )}
                      </div>
                      <div className="mt-1 text-sm">{a.message}</div>
                      <Link
                        to={`/nodes/${a.nodeId}`}
                        className="text-xs mono hover:underline"
                        style={{ color: "#58a6ff" }}
                      >
                        {a.hostname}
                      </Link>
                    </div>
                  </div>
                  <div className="flex items-center gap-4">
                    <span className="text-xs mono" style={{ color: "#8b98a9" }}>
                      {timeAgo(a.createdAt)}
                    </span>
                    {!a.resolved && (
                      <button
                        onClick={() => resolve.mutate(a.id)}
                        disabled={resolve.isPending}
                        className="rounded-lg px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                        style={{ background: "#161d2b", color: "#e6edf3" }}
                      >
                        Resolve
                      </button>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
