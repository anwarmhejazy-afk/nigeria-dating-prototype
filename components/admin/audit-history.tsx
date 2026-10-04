"use client";

import { useEffect, useState } from "react";
import type { AuditEntry } from "@/lib/admin";

export function AuditHistory({ actionLabel }: { actionLabel: (action: string) => string }) {
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });
  const [page, setPage] = useState(1);
  const [expanded, setExpanded] = useState(false);
  const [items, setItems] = useState<AuditEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);

  useEffect(() => {
    const controller = new AbortController();
    async function load() {
      setLoading(true);
      setError("");
      try {
        const params = new URLSearchParams({ page: String(page) });
        if (range.from) params.set("from", new Date(`${range.from}T00:00:00`).toISOString());
        if (range.to) {
          const end = new Date(`${range.to}T00:00:00`);
          end.setDate(end.getDate() + 1);
          params.set("until", end.toISOString());
        }
        const response = await fetch(`/api/admin/audit?${params}`, { cache: "no-store", signal: controller.signal });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "Unable to load audit history.");
        if (!controller.signal.aborted) { setItems(result.items); setTotal(result.total); }
      } catch (cause) {
        if (!controller.signal.aborted) setError(cause instanceof Error ? cause.message : "Unable to load audit history.");
      } finally {
        if (!controller.signal.aborted) setLoading(false);
      }
    }
    void load();
    return () => controller.abort();
  }, [page, range, retry]);

  const pages = Math.max(1, Math.ceil(total / 10));
  const button = "rounded-xl border border-white/15 px-4 py-2 text-sm font-bold disabled:opacity-40";
  return <div>
    <h1 className="text-3xl font-black">Audit history</h1>
    <p className="mt-1 text-sm text-white/35">Immutable records of reports and moderator actions.</p>
    <form className="mt-5 flex flex-wrap items-end gap-3" onSubmit={event => {
      event.preventDefault();
      if (from && to && from > to) { setError("The start date must be on or before the end date."); return; }
      setPage(1); setExpanded(false); setRange({ from, to });
    }}>
      <label className="text-sm">From<input type="date" value={from} onChange={e => setFrom(e.target.value)} className="mt-1 block rounded-xl border border-white/15 bg-[#14151a] p-2 [color-scheme:dark]" /></label>
      <label className="text-sm">To<input type="date" value={to} onChange={e => setTo(e.target.value)} className="mt-1 block rounded-xl border border-white/15 bg-[#14151a] p-2 [color-scheme:dark]" /></label>
      <button className={button} disabled={loading}>Apply dates</button>
      <button type="button" className={button} disabled={loading} onClick={() => { setFrom(""); setTo(""); setRange({ from: "", to: "" }); setPage(1); setExpanded(false); }}>Clear</button>
    </form>
    <p className="mt-2 text-xs text-white/40">Dates use your device’s time zone. Both selected dates are included.</p>
    <div className="mt-5 space-y-2" aria-busy={loading}>
      {loading ? <p role="status">Loading audit history…</p> : error ? <div role="alert"><p>{error}</p><button className={`${button} mt-2`} onClick={() => setRetry(value => value + 1)}>Retry</button></div> : <>
        <p className="mb-3 text-sm text-white/50">{total ? `${(page - 1) * 10 + 1}–${Math.min(page * 10, total)} of ${total} records` : "No activity matches these dates."}</p>
        {items.map(entry => <div key={entry.id} className="grid gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 md:grid-cols-[180px_1fr_220px]">
          <p className="text-xs font-black text-[#FFE58C]">{actionLabel(entry.action)}</p>
          <p className="text-xs text-white/50">{entry.adminName} → {entry.targetName}</p>
          <p className="text-xs text-white/30 md:text-right">{new Date(entry.createdAt).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" })}</p>
        </div>)}
      </>}
    </div>
    {!loading && !error && pages > 1 && <div className="mt-4">
      <button className={button} aria-expanded={expanded} aria-controls="audit-pagination" onClick={() => {
        if (expanded) { setPage(1); setExpanded(false); } else { setExpanded(true); setPage(2); }
      }}>{expanded ? "Hide older activity ▲" : "Show older activity ▼"}</button>
      {expanded && <nav id="audit-pagination" aria-label="Audit history pages" className="mt-3 flex flex-wrap items-center gap-3">
        <button className={button} disabled={page === 1} onClick={() => setPage(value => value - 1)}>Previous</button>
        <span className="text-sm text-white/50">Page {page} of {pages}</span>
        <button className={button} disabled={page >= pages} onClick={() => setPage(value => value + 1)}>Next</button>
      </nav>}
    </div>}
  </div>;
}
