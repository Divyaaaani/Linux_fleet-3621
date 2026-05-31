import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { api } from "../lib/api";
import { Layout, PageHeader } from "../components/layout";
import { Card, Spinner } from "../components/ui-bits";
import { timeAgo } from "../lib/fleet";
import { Copy, Check, KeyRound, Trash2, Terminal } from "lucide-react";

export default function OnboardingPage() {
  const qc = useQueryClient();
  const [label, setLabel] = useState("");
  const [env, setEnv] = useState("production");
  const [copied, setCopied] = useState<string | null>(null);

  const origin = typeof window !== "undefined" ? window.location.origin : "";

  const tokens = useQuery({
    queryKey: ["tokens"],
    queryFn: async () => (await api.tokens.$get()).json(),
  });

  const create = useMutation({
    mutationFn: async () => {
      await api.tokens.$post({ json: { label, environment: env } });
    },
    onSuccess: () => {
      setLabel("");
      qc.invalidateQueries({ queryKey: ["tokens"] });
    },
  });

  const del = useMutation({
    mutationFn: async (id: string) => {
      await api.tokens[":id"].$delete({ param: { id } });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["tokens"] }),
  });

  function copy(text: string, key: string) {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 1500);
  }

  const list = tokens.data?.tokens ?? [];
  const latestUnused = list.find((t) => !t.used);
  const installCmd = `curl -fsSL ${origin}/agent.sh | sudo bash -s -- \\
  --server ${origin} \\
  --token ${latestUnused?.token ?? "<TOKEN>"}`;

  return (
    <Layout>
      <PageHeader
        title="Onboarding"
        subtitle="Generate a token and install the agent on any Linux node"
      />
      <div className="grid grid-cols-1 gap-6 p-8 lg:grid-cols-2">
        {/* Generate token */}
        <div className="space-y-6">
          <Card>
            <div className="mb-4 flex items-center gap-2">
              <KeyRound size={18} style={{ color: "#3fb950" }} />
              <h2 className="font-semibold">Generate Onboarding Token</h2>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs" style={{ color: "#8b98a9" }}>
                  Label (optional)
                </label>
                <input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder="web-server-01"
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ background: "#0d1320", borderColor: "#1e2733", color: "#e6edf3" }}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs" style={{ color: "#8b98a9" }}>
                  Environment
                </label>
                <select
                  value={env}
                  onChange={(e) => setEnv(e.target.value)}
                  className="w-full rounded-lg border px-3 py-2 text-sm outline-none"
                  style={{ background: "#0d1320", borderColor: "#1e2733", color: "#e6edf3" }}
                >
                  <option value="production">production</option>
                  <option value="staging">staging</option>
                  <option value="dev">dev</option>
                </select>
              </div>
              <button
                onClick={() => create.mutate()}
                disabled={create.isPending}
                className="w-full rounded-lg py-2.5 text-sm font-semibold disabled:opacity-50"
                style={{ background: "#3fb950", color: "#0a0e14" }}
              >
                {create.isPending ? "Generating…" : "Generate Token"}
              </button>
            </div>
          </Card>

          {/* Install command */}
          <Card>
            <div className="mb-3 flex items-center gap-2">
              <Terminal size={18} style={{ color: "#58a6ff" }} />
              <h2 className="font-semibold">Install Agent</h2>
            </div>
            <p className="mb-3 text-xs" style={{ color: "#8b98a9" }}>
              Run this on the target Linux machine. Uses the latest unused token.
            </p>
            <div
              className="relative rounded-lg border p-3"
              style={{ background: "#0a0e14", borderColor: "#1e2733" }}
            >
              <button
                onClick={() => copy(installCmd, "install")}
                className="absolute right-2 top-2 rounded p-1.5 hover:bg-[#161d2b]"
              >
                {copied === "install" ? (
                  <Check size={14} style={{ color: "#3fb950" }} />
                ) : (
                  <Copy size={14} style={{ color: "#8b98a9" }} />
                )}
              </button>
              <pre className="overflow-x-auto pr-8 text-xs mono" style={{ color: "#3fb950" }}>
                {installCmd}
              </pre>
            </div>
            <p className="mt-3 text-xs" style={{ color: "#8b98a9" }}>
              No spare machine? Simulate a fleet from your terminal:
            </p>
            <div
              className="relative mt-1 rounded-lg border p-3"
              style={{ background: "#0a0e14", borderColor: "#1e2733" }}
            >
              <button
                onClick={() => copy(`SERVER=${origin} bash simulate-fleet.sh`, "sim")}
                className="absolute right-2 top-2 rounded p-1.5 hover:bg-[#161d2b]"
              >
                {copied === "sim" ? (
                  <Check size={14} style={{ color: "#3fb950" }} />
                ) : (
                  <Copy size={14} style={{ color: "#8b98a9" }} />
                )}
              </button>
              <pre className="overflow-x-auto pr-8 text-xs mono" style={{ color: "#58a6ff" }}>
                {`SERVER=${origin} bash simulate-fleet.sh`}
              </pre>
            </div>
          </Card>
        </div>

        {/* Token list */}
        <Card>
          <h2 className="mb-4 font-semibold">Tokens</h2>
          {tokens.isLoading ? (
            <Spinner />
          ) : list.length === 0 ? (
            <div className="py-8 text-center text-sm" style={{ color: "#8b98a9" }}>
              No tokens generated yet.
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((t) => (
                <div
                  key={t.id}
                  className="rounded-lg border p-3"
                  style={{ background: "#0d1320", borderColor: "#1e2733" }}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className="rounded px-2 py-0.5 text-[11px] font-semibold mono"
                        style={{
                          background: t.used ? "#8b98a91a" : "#3fb9501a",
                          color: t.used ? "#8b98a9" : "#3fb950",
                        }}
                      >
                        {t.used ? "used" : "active"}
                      </span>
                      {t.label && (
                        <span className="text-sm">{t.label}</span>
                      )}
                      <span
                        className="rounded px-1.5 py-0.5 text-[11px] mono"
                        style={{ background: "#161d2b", color: "#8b98a9" }}
                      >
                        {t.environment}
                      </span>
                    </div>
                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => copy(t.token, t.id)}
                        className="rounded p-1.5 hover:bg-[#161d2b]"
                      >
                        {copied === t.id ? (
                          <Check size={13} style={{ color: "#3fb950" }} />
                        ) : (
                          <Copy size={13} style={{ color: "#8b98a9" }} />
                        )}
                      </button>
                      <button
                        onClick={() => del.mutate(t.id)}
                        className="rounded p-1.5 hover:bg-[#f8514922]"
                      >
                        <Trash2 size={13} style={{ color: "#f85149" }} />
                      </button>
                    </div>
                  </div>
                  <div className="mt-1.5 flex items-center justify-between">
                    <code className="text-xs mono" style={{ color: "#58a6ff" }}>
                      {t.token}
                    </code>
                    <span className="text-[11px] mono" style={{ color: "#8b98a9" }}>
                      {timeAgo(t.createdAt)}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  );
}
