import { useState, useEffect, useCallback } from "react";
import { Layout, PageHeader } from "../components/layout";
import { Card } from "../components/ui-bits";
import { ExternalLink, BarChart3, RefreshCw, Settings } from "lucide-react";

// Default Grafana base URL when running the docker-compose stack locally.
// Override by setting VITE_GRAFANA_URL at build time, or via the in-page field.
const DEFAULT_GRAFANA =
  import.meta.env.VITE_GRAFANA_URL || "http://localhost:3000";
const DASHBOARD_UID = "fleetops-overview";

function buildEmbedUrl(base: string) {
  const clean = base.replace(/\/+$/, "");
  // kiosk mode hides Grafana chrome so it embeds cleanly; theme matches the NOC UI
  return `${clean}/d/${DASHBOARD_UID}/fleetops-overview?orgId=1&theme=dark&kiosk&refresh=15s`;
}

export default function GrafanaPage() {
  const [base, setBase] = useState(DEFAULT_GRAFANA);
  const [activeBase, setActiveBase] = useState(DEFAULT_GRAFANA);
  const [showSettings, setShowSettings] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);
  // "checking" | "up" | "down" — probe Grafana before mounting the iframe so we
  // never show the browser's broken-page chrome when the stack isn't running.
  const [status, setStatus] = useState<"checking" | "up" | "down">("checking");

  const probe = useCallback(async () => {
    setStatus("checking");
    const url = `${activeBase.replace(/\/+$/, "")}/api/health`;
    try {
      // no-cors: we only care that the request resolves (Grafana is reachable),
      // not the response body (which is opaque cross-origin).
      await fetch(url, { mode: "no-cors", signal: AbortSignal.timeout(4000) });
      setStatus("up");
    } catch {
      setStatus("down");
    }
  }, [activeBase]);

  useEffect(() => {
    probe();
  }, [probe, reloadKey]);

  const embedUrl = buildEmbedUrl(activeBase);
  const openUrl = `${activeBase.replace(/\/+$/, "")}/d/${DASHBOARD_UID}/fleetops-overview?orgId=1`;

  return (
    <Layout>
      <PageHeader
        title="Grafana"
        subtitle="Prometheus-backed metrics, embedded from the FleetOps dashboard"
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => setReloadKey((k) => k + 1)}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
              style={{ borderColor: "#1e2733", color: "#8b98a9" }}
            >
              <RefreshCw size={15} /> Reload
            </button>
            <button
              onClick={() => setShowSettings((s) => !s)}
              className="flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors"
              style={{ borderColor: "#1e2733", color: "#8b98a9" }}
            >
              <Settings size={15} /> Source
            </button>
            <a
              href={openUrl}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium"
              style={{ background: "#3fb950", color: "#04130a" }}
            >
              <ExternalLink size={15} /> Open in Grafana
            </a>
          </div>
        }
      />

      <div className="p-8 space-y-4">
        {showSettings && (
          <Card>
            <div className="p-4">
              <div
                className="mb-2 flex items-center gap-2 text-xs font-semibold uppercase tracking-wide"
                style={{ color: "#8b98a9" }}
              >
                <BarChart3 size={14} style={{ color: "#58a6ff" }} /> Grafana base URL
              </div>
              <div className="flex gap-2">
                <input
                  aria-label="Grafana base URL"
                  value={base}
                  onChange={(e) => setBase(e.target.value)}
                  placeholder="http://localhost:3000"
                  className="mono flex-1 rounded-lg border bg-transparent px-3 py-2 text-sm outline-none"
                  style={{ borderColor: "#1e2733", color: "#e6edf3" }}
                />
                <button
                  onClick={() => {
                    setActiveBase(base);
                    setReloadKey((k) => k + 1);
                  }}
                  className="rounded-lg px-4 py-2 text-sm font-medium"
                  style={{ background: "#161d2b", color: "#e6edf3" }}
                >
                  Apply
                </button>
              </div>
              <p className="mt-2 text-xs" style={{ color: "#5a6675" }}>
                Start the stack with{" "}
                <span className="mono" style={{ color: "#8b98a9" }}>
                  docker compose up -d
                </span>
                . Grafana runs on port 3000, Prometheus on 9090. Anonymous access &
                embedding are enabled in the compose file.
              </p>
            </div>
          </Card>
        )}

        <Card>
          <div
            className="relative overflow-hidden rounded-xl"
            style={{ height: "calc(100vh - 220px)", minHeight: 520, background: "#0a0e14" }}
          >
            {status === "up" ? (
              <iframe
                key={reloadKey}
                src={embedUrl}
                title="FleetOps Grafana Dashboard"
                width="100%"
                height="100%"
                frameBorder="0"
                className="absolute inset-0"
                style={{ border: "none", display: "block", background: "#0a0e14" }}
              />
            ) : (
              <div
                className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center"
                style={{ background: "#0a0e14" }}
              >
                {status === "checking" ? (
                  <>
                    <BarChart3 size={40} style={{ color: "#1e2733" }} />
                    <div className="text-sm" style={{ color: "#5a6675" }}>
                      Connecting to Grafana at{" "}
                      <span className="mono" style={{ color: "#8b98a9" }}>
                        {activeBase}
                      </span>
                      …
                    </div>
                  </>
                ) : (
                  <>
                    <BarChart3 size={40} style={{ color: "#1e2733" }} />
                    <div className="text-sm font-medium" style={{ color: "#e6edf3" }}>
                      Grafana isn’t reachable yet
                    </div>
                    <div className="text-sm" style={{ color: "#5a6675" }}>
                      Start the observability stack, then hit Reload.
                    </div>
                    <div
                      className="mono mt-1 rounded-lg border px-3 py-2 text-xs"
                      style={{ borderColor: "#1e2733", color: "#3fb950", background: "#0d1320" }}
                    >
                      docker compose up -d --build
                    </div>
                    <div className="mono mt-1 text-xs" style={{ color: "#3a4453" }}>
                      Grafana → :3000 · Prometheus → :9090 · target: {activeBase}
                    </div>
                  </>
                )}
              </div>
            )}
          </div>
        </Card>

        <p className="text-center text-xs" style={{ color: "#5a6675" }}>
          Not seeing the dashboard? Make sure Grafana is running and reachable at{" "}
          <span className="mono" style={{ color: "#8b98a9" }}>
            {activeBase}
          </span>
          . The FleetOps custom monitoring (live charts & alerts) keeps working
          independently.
        </p>
      </div>
    </Layout>
  );
}
