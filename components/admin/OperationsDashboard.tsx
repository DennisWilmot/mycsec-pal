"use client";

import { AlertTriangle, Database, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useState } from "react";

type StatusRow = { status: string; count: number; oldest: string | null };
type Failure = { display_code: string; subject: string; paper_type: string; attempt_count: number; last_error: string; updated_at: string };
type Operations = { generatedAt: string; outbox: StatusRow[]; marking: StatusRow[]; failures: Failure[]; connections: { max_connections: number; current_connections: number } };

export default function OperationsDashboard() {
  const [data, setData] = useState<Operations | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const load = useCallback(async () => {
    try {
      const response = await fetch("/api/admin/operations", { cache: "no-store" });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload?.error?.message ?? "Operations data is unavailable.");
      setData(payload.data);
      setError("");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : "Operations data is unavailable.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
    const timer = window.setInterval(() => { if (!document.hidden) void load(); }, 15_000);
    return () => window.clearInterval(timer);
  }, [load]);

  const connectionPercent = data ? Math.round(100 * data.connections.current_connections / data.connections.max_connections) : 0;
  return <main className="operations-page">
    <header className="operations-header"><div><p className="eyebrow">Restricted operations</p><h1>Release health</h1><p>Queue pressure, marking failures and database connection headroom.</p></div><button className="button outline" onClick={() => void load()} disabled={loading}><RefreshCw size={17}/>{loading ? "Refreshing…" : "Refresh"}</button></header>
    {error && <section className="operations-access"><ShieldCheck/><h2>Operations unavailable</h2><p>{error}</p></section>}
    {data && <>
      <section className="operations-metrics"><article><Database/><span>Database connections</span><strong>{data.connections.current_connections} / {data.connections.max_connections}</strong><small>{connectionPercent}% in use</small></article><article><span>Pending outbox</span><strong>{data.outbox.find((row)=>row.status==="pending")?.count ?? 0}</strong><small>Waiting to dispatch</small></article><article><span>Active marking</span><strong>{data.marking.filter((row)=>["pending","processing"].includes(row.status)).reduce((sum,row)=>sum+row.count,0)}</strong><small>Pending or processing</small></article><article><AlertTriangle/><span>Failed marking</span><strong>{data.marking.find((row)=>row.status==="failed")?.count ?? 0}</strong><small>Needs attention</small></article></section>
      <section className="operations-grid"><article><h2>Outbox state</h2>{data.outbox.map((row)=><div className="operations-row" key={row.status}><span>{row.status}</span><strong>{row.count}</strong><small>{row.oldest ? `Oldest ${new Date(row.oldest).toLocaleString()}` : "None"}</small></div>)}</article><article><h2>Marking state</h2>{data.marking.map((row)=><div className="operations-row" key={row.status}><span>{row.status}</span><strong>{row.count}</strong><small>{row.oldest ? `Oldest ${new Date(row.oldest).toLocaleString()}` : "None"}</small></div>)}</article></section>
      <section className="operations-failures"><div><h2>Recent marking failures</h2><p>References are safe to share with the learner; provider details remain restricted here.</p></div>{data.failures.length ? <div className="operations-table">{data.failures.map((failure)=><article key={`${failure.display_code}-${failure.updated_at}`}><strong>{failure.display_code}</strong><span>{failure.subject} · {failure.paper_type.replace("_"," ")}</span><span>{failure.attempt_count} attempts</span><p>{failure.last_error || "No error recorded"}</p><time>{new Date(failure.updated_at).toLocaleString()}</time></article>)}</div> : <p className="operations-empty">No failed marking jobs.</p>}</section>
      <footer className="operations-updated">Updated {new Date(data.generatedAt).toLocaleTimeString()}</footer>
    </>}
  </main>;
}
