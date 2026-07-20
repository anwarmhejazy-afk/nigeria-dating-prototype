"use client";

import Image from "next/image";
import { useMemo, useState } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import type {
  AdminDashboardData,
  AdminProfile,
  SafetyReport,
  VerificationRequest,
} from "@/lib/admin";

type Tab = "overview" | "reports" | "members" | "verification" | "audit";

type ApiResult = { error?: string; success?: boolean };

const reportLabels: Record<string, string> = {
  harassment: "Harassment or rude language",
  racism_hate_speech: "Racism or hate speech",
  threats: "Threats or intimidation",
  sexual_harassment: "Sexual harassment",
  scam_fraud: "Scam or fraud",
  asking_for_money: "Asking for money",
  business_solicitation: "Business solicitation",
  spam: "Spam or advertising",
  fake_profile: "Fake identity",
  illegal_content: "Illegal content",
  inappropriate_content: "Inappropriate content",
  underage: "Possible underage member",
  other: "Other safety concern",
};

function formatDate(value: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("en", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

async function apiRequest(url: string, options?: RequestInit) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(options?.headers || {}),
    },
  });
  const payload = (await response.json().catch(() => ({}))) as ApiResult;
  if (!response.ok) throw new Error(payload.error || "The admin action failed.");
  return payload;
}

function Avatar({ member, size = 44 }: { member: AdminProfile | null; size?: number }) {
  const name = member?.displayName || "AfroLove member";
  return (
    <span
      className="relative flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-[#F2C94C] font-black text-black"
      style={{ width: size, height: size }}
    >
      {member?.avatarUrl ? (
        <Image src={member.avatarUrl} alt={name} fill sizes={`${size}px`} className="object-cover" />
      ) : (
        name
          .split(/\s+/)
          .slice(0, 2)
          .map((part) => part[0])
          .join("")
          .toUpperCase()
      )}
    </span>
  );
}

function StatusBadge({ value }: { value: string }) {
  const styles: Record<string, string> = {
    active: "bg-emerald-400/10 text-emerald-300",
    warned: "bg-amber-400/10 text-amber-200",
    restricted: "bg-orange-400/10 text-orange-200",
    suspended: "bg-red-400/10 text-red-200",
    banned: "bg-red-700/20 text-red-200",
    open: "bg-red-400/10 text-red-200",
    reviewing: "bg-blue-400/10 text-blue-200",
    actioned: "bg-orange-400/10 text-orange-200",
    resolved: "bg-emerald-400/10 text-emerald-200",
    dismissed: "bg-white/10 text-white/55",
    pending: "bg-amber-400/10 text-amber-200",
    approved: "bg-emerald-400/10 text-emerald-200",
    rejected: "bg-red-400/10 text-red-200",
  };
  return (
    <span className={`rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-wide ${styles[value] || "bg-white/10 text-white/55"}`}>
      {value.replaceAll("_", " ")}
    </span>
  );
}

function Metric({ label, value, hint }: { label: string; value: number; hint: string }) {
  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.035] p-5">
      <p className="text-3xl font-black text-[#FFE58C]">{value.toLocaleString()}</p>
      <p className="mt-2 text-sm font-black">{label}</p>
      <p className="mt-1 text-xs leading-5 text-white/35">{hint}</p>
    </div>
  );
}

export function AdminDashboard({ initialData }: { initialData: AdminDashboardData }) {
  const [data, setData] = useState(initialData);
  const [tab, setTab] = useState<Tab>("overview");
  const [query, setQuery] = useState("");
  const [selectedReport, setSelectedReport] = useState<SafetyReport | null>(
    initialData.reports.find((report) => ["open", "reviewing"].includes(report.status)) || null,
  );
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState("");

  const refresh = async () => {
    const response = await fetch("/api/admin/dashboard", { cache: "no-store" });
    const next = (await response.json()) as AdminDashboardData & { error?: string };
    if (!response.ok) throw new Error(next.error || "Unable to refresh dashboard.");
    setData(next);
    if (selectedReport) {
      setSelectedReport(next.reports.find((report) => report.id === selectedReport.id) || null);
    }
  };

  const run = async (callback: () => Promise<void>, message: string) => {
    setBusy(true);
    try {
      await callback();
      await refresh();
      setToast(message);
      window.setTimeout(() => setToast(""), 3000);
    } catch (error) {
      setToast(error instanceof Error ? error.message : "Admin action failed.");
    } finally {
      setBusy(false);
    }
  };

  const filteredMembers = useMemo(() => {
    const search = query.trim().toLowerCase();
    if (!search) return data.members;
    return data.members.filter((member) =>
      [member.displayName, member.email || "", member.country, member.city, member.accountStatus]
        .join(" ")
        .toLowerCase()
        .includes(search),
    );
  }, [data.members, query]);

  return (
    <main className="min-h-screen bg-[#07080b] text-white">
      <header className="sticky top-0 z-40 border-b border-white/[0.08] bg-[#090b10]/95 backdrop-blur-xl">
        <div className="mx-auto flex max-w-[1500px] items-center gap-4 px-4 py-4 lg:px-8">
          <BrandLogo size="sm" className="shrink-0" />
          <div className="h-8 w-px bg-white/10" />
          <div className="min-w-0 flex-1">
            <p className="text-sm font-black">Safety & Administration</p>
            <p className="text-[11px] text-white/35">Selective evidence review. Every action is audited.</p>
          </div>
          <a href="/admin/monetization" className="rounded-full border border-[#F2C94C]/25 px-4 py-2 text-xs font-black text-[#FFE58C] hover:bg-[#F2C94C]/10">
            Monetisation
          </a>
          <a href="/app" className="rounded-full border border-white/10 px-4 py-2 text-xs font-black text-white/55 hover:bg-white/5">
            Member app
          </a>
          <form action="/auth/signout" method="post">
            <button className="rounded-full bg-[#F2C94C] px-4 py-2 text-xs font-black text-black">Sign out</button>
          </form>
        </div>
      </header>

      <div className="mx-auto grid max-w-[1500px] gap-5 px-4 py-6 lg:grid-cols-[230px_minmax(0,1fr)] lg:px-8">
        <aside className="h-fit rounded-3xl border border-white/[0.08] bg-white/[0.025] p-3 lg:sticky lg:top-24">
          {([
            ["overview", "Overview"],
            ["reports", `Safety reports (${data.metrics.openReports})`],
            ["members", "Members"],
            ["verification", `Verification (${data.metrics.pendingVerifications})`],
            ["audit", "Audit history"],
          ] as [Tab, string][]).map(([id, label]) => (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={`mb-1 w-full rounded-2xl px-4 py-3 text-left text-sm font-black transition ${tab === id ? "bg-[#F2C94C] text-black" : "text-white/50 hover:bg-white/5 hover:text-white"}`}
            >
              {label}
            </button>
          ))}
          <a
            href="/admin/monetization"
            className="mb-1 mt-2 block w-full rounded-2xl border border-[#F2C94C]/25 bg-[#F2C94C]/[0.06] px-4 py-3 text-left text-sm font-black text-[#FFE58C] transition hover:bg-[#F2C94C]/12"
          >
            Monetisation & memberships
          </a>
          <div className="mt-4 rounded-2xl border border-blue-400/15 bg-blue-400/[0.05] p-4 text-[11px] leading-5 text-blue-100/55">
            Admins cannot browse unrelated private conversations. Only evidence intentionally submitted in a safety report is shown here.
          </div>
        </aside>

        <section className="min-w-0">
          {tab === "overview" && (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div>
                  <p className="text-[10px] font-black tracking-[0.28em] text-[#F2C94C]">AFROLOVE CONTROL CENTRE</p>
                  <h1 className="mt-2 text-4xl font-black">Platform overview</h1>
                  <p className="mt-2 text-sm text-white/40">Live safety, membership and community health indicators.</p>
                </div>
                <button onClick={() => void run(refresh, "Dashboard refreshed")} disabled={busy} className="rounded-2xl border border-white/10 px-4 py-3 text-xs font-black text-white/60 disabled:opacity-40">Refresh data</button>
              </div>
              <div className="mt-6 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
                <Metric label="Members" value={data.metrics.members} hint={`${data.metrics.activeMembers} available or under light moderation`} />
                <Metric label="Open reports" value={data.metrics.openReports} hint={`${data.metrics.urgentReports} urgent safety cases`} />
                <Metric label="Active matches" value={data.metrics.activeMatches} hint={`${data.metrics.messages} saved chat messages`} />
                <Metric label="Countries" value={data.metrics.countries} hint={`${data.metrics.pendingVerifications} verification requests waiting`} />
              </div>
              <div className="mt-6 grid gap-5 xl:grid-cols-2">
                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5">
                  <h2 className="text-lg font-black">Priority safety queue</h2>
                  <div className="mt-4 space-y-3">
                    {data.reports.filter((report) => ["open", "reviewing"].includes(report.status)).slice(0, 6).map((report) => (
                      <button key={report.id} onClick={() => { setSelectedReport(report); setTab("reports"); }} className="flex w-full items-center gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3 text-left hover:bg-white/[0.045]">
                        <Avatar member={report.reported} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-sm font-black">{reportLabels[report.category] || report.category}</span>
                          <span className="mt-1 block truncate text-[11px] text-white/35">Reported member: {report.reported?.displayName || "Unknown"}</span>
                        </span>
                        <StatusBadge value={report.priority} />
                      </button>
                    ))}
                    {!data.metrics.openReports && <p className="rounded-2xl border border-dashed border-white/10 p-8 text-center text-sm text-white/35">No safety reports are waiting.</p>}
                  </div>
                </div>
                <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5">
                  <h2 className="text-lg font-black">Recent moderation activity</h2>
                  <div className="mt-4 space-y-3">
                    {data.audit.slice(0, 7).map((entry) => (
                      <div key={entry.id} className="rounded-2xl border border-white/[0.06] p-3">
                        <p className="text-sm font-black">{entry.action.replaceAll("_", " ")}</p>
                        <p className="mt-1 text-[11px] text-white/35">{entry.adminName} · {entry.targetName} · {formatDate(entry.createdAt)}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {tab === "reports" && (
            <div className="grid gap-5 xl:grid-cols-[380px_minmax(0,1fr)]">
              <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-4">
                <h1 className="text-2xl font-black">Safety reports</h1>
                <p className="mt-1 text-xs text-white/35">Evidence is visible only because a member submitted it.</p>
                <div className="mt-4 max-h-[72vh] space-y-2 overflow-y-auto pr-1">
                  {data.reports.map((report) => (
                    <button key={report.id} onClick={() => setSelectedReport(report)} className={`w-full rounded-2xl border p-3 text-left ${selectedReport?.id === report.id ? "border-[#F2C94C]/50 bg-[#F2C94C]/[0.07]" : "border-white/[0.06] bg-white/[0.02]"}`}>
                      <div className="flex items-center gap-2">
                        <StatusBadge value={report.priority} />
                        <StatusBadge value={report.status} />
                      </div>
                      <p className="mt-3 text-sm font-black">{reportLabels[report.category] || report.category}</p>
                      <p className="mt-1 truncate text-[11px] text-white/35">{report.reported?.displayName || "Unknown member"} · {formatDate(report.createdAt)}</p>
                    </button>
                  ))}
                </div>
              </div>
              <ReportReview report={selectedReport} busy={busy} run={run} />
            </div>
          )}

          {tab === "members" && (
            <div>
              <div className="flex flex-wrap items-end justify-between gap-4">
                <div><h1 className="text-3xl font-black">Member management</h1><p className="mt-1 text-sm text-white/35">Search, warn, restrict, suspend, ban or restore accounts.</p></div>
                <input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search name, email, country or status" className="w-full max-w-md rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-[#F2C94C]/50" />
              </div>
              <div className="mt-5 overflow-hidden rounded-3xl border border-white/[0.08]">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[900px] text-left">
                    <thead className="bg-white/[0.04] text-[10px] uppercase tracking-wider text-white/35"><tr><th className="p-4">Member</th><th className="p-4">Location</th><th className="p-4">Status</th><th className="p-4">Verification</th><th className="p-4">Joined</th><th className="p-4">Actions</th></tr></thead>
                    <tbody>{filteredMembers.map((member) => <MemberRow key={member.id} member={member} busy={busy} run={run} />)}</tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {tab === "verification" && (
            <div>
              <h1 className="text-3xl font-black">Verification requests</h1>
              <p className="mt-1 text-sm text-white/35">Approve badges only after the configured identity review process is completed.</p>
              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                {data.verificationRequests.map((request) => <VerificationCard key={request.id} request={request} busy={busy} run={run} />)}
                {!data.verificationRequests.length && <p className="rounded-3xl border border-dashed border-white/10 p-10 text-center text-white/35">No verification requests yet.</p>}
              </div>
            </div>
          )}

          {tab === "audit" && (
            <div>
              <h1 className="text-3xl font-black">Audit history</h1>
              <p className="mt-1 text-sm text-white/35">Immutable records of reports and moderator actions.</p>
              <div className="mt-5 space-y-2">
                {data.audit.map((entry) => (
                  <div key={entry.id} className="grid gap-2 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4 md:grid-cols-[180px_1fr_220px]">
                    <p className="text-xs font-black text-[#FFE58C]">{entry.action.replaceAll("_", " ")}</p>
                    <p className="text-xs text-white/50">{entry.adminName} → {entry.targetName}</p>
                    <p className="text-xs text-white/30 md:text-right">{formatDate(entry.createdAt)}</p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </div>

      {toast && <div className="fixed bottom-5 left-1/2 z-[100] -translate-x-1/2 rounded-2xl border border-[#F2C94C]/25 bg-[#1b1a14] px-5 py-3 text-sm font-black text-[#FFE58C] shadow-2xl">{toast}</div>}
    </main>
  );
}

function ReportReview({ report, busy, run }: { report: SafetyReport | null; busy: boolean; run: (callback: () => Promise<void>, message: string) => Promise<void> }) {
  const [note, setNote] = useState("");
  const [duration, setDuration] = useState("72");
  if (!report) return <div className="rounded-3xl border border-dashed border-white/10 p-12 text-center text-white/35">Select a report to review its submitted evidence.</div>;

  const decide = (status: string, action: string) => run(
    () => apiRequest(`/api/admin/reports/${report.id}`, { method: "PATCH", body: JSON.stringify({ status, action, note, durationHours: Number(duration) || null }) }).then(() => undefined),
    "Safety case updated",
  );

  return (
    <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5">
      <div className="flex flex-wrap items-center gap-2"><StatusBadge value={report.priority} /><StatusBadge value={report.status} /><span className="text-xs text-white/30">{formatDate(report.createdAt)}</span></div>
      <h2 className="mt-4 text-2xl font-black">{reportLabels[report.category] || report.category}</h2>
      <p className="mt-2 text-sm leading-6 text-white/55">{report.details || "No additional explanation was provided."}</p>
      <div className="mt-5 grid gap-3 sm:grid-cols-2">
        <PersonCard label="Reporter" member={report.reporter} />
        <PersonCard label="Reported member" member={report.reported} />
      </div>
      <div className="mt-5 rounded-2xl border border-blue-400/15 bg-blue-400/[0.05] p-4 text-xs leading-5 text-blue-100/55">
        Evidence scope: <strong>{report.evidenceScope.replaceAll("_", " ")}</strong>. {report.evidence.length} message snapshot{report.evidence.length === 1 ? "" : "s"} submitted. Unrelated chats are not available.
      </div>
      <div className="mt-5 max-h-[360px] space-y-2 overflow-y-auto rounded-3xl border border-white/[0.07] bg-black/20 p-4">
        {report.evidence.map((item) => (
          <div key={item.id} className="rounded-2xl bg-white/[0.045] p-3">
            <div className="flex justify-between gap-3 text-[10px] text-white/30"><strong className="text-white/55">{item.senderDisplayName}</strong><span>{formatDate(item.messageCreatedAt)}</span></div>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-5 text-white/75">{item.body || `[${item.messageType} attachment]`}</p>
          </div>
        ))}
        {!report.evidence.length && <p className="py-8 text-center text-sm text-white/30">This is a profile-only report; no private messages were submitted.</p>}
      </div>
      <label className="mt-5 block text-xs font-black text-white/55">Moderator case note</label>
      <textarea value={note} onChange={(event) => setNote(event.target.value)} rows={4} maxLength={4000} placeholder="Document the evidence reviewed and the reason for your decision..." className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm outline-none focus:border-[#F2C94C]/50" />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <select value={duration} onChange={(event) => setDuration(event.target.value)} className="rounded-xl border border-white/10 bg-[#15171d] px-3 py-2 text-xs"><option value="24">24 hours</option><option value="72">3 days</option><option value="168">7 days</option><option value="720">30 days</option></select>
        <button disabled={busy} onClick={() => void decide("reviewing", "none")} className="admin-action">Mark reviewing</button>
        <button disabled={busy} onClick={() => void decide("actioned", "warn")} className="admin-action">Warn</button>
        <button disabled={busy} onClick={() => void decide("actioned", "restrict_messaging")} className="admin-action">Restrict chat</button>
        <button disabled={busy} onClick={() => void decide("actioned", "suspend")} className="admin-action admin-danger">Suspend</button>
        <button disabled={busy} onClick={() => void decide("actioned", "ban")} className="admin-action admin-danger">Ban</button>
        <button disabled={busy} onClick={() => void decide("resolved", "require_verification")} className="admin-action">Require verification</button>
        <button disabled={busy} onClick={() => void decide("dismissed", "none")} className="admin-action">Dismiss</button>
      </div>
    </div>
  );
}

function PersonCard({ label, member }: { label: string; member: AdminProfile | null }) {
  return <div className="flex items-center gap-3 rounded-2xl border border-white/[0.07] bg-white/[0.025] p-3"><Avatar member={member} /><span className="min-w-0"><span className="block text-[9px] font-black uppercase tracking-wider text-white/25">{label}</span><span className="mt-1 block truncate text-sm font-black">{member?.displayName || "Unknown"}</span><span className="block truncate text-[10px] text-white/35">{member?.email || "No email shown"}</span></span></div>;
}

function MemberRow({ member, busy, run }: { member: AdminProfile; busy: boolean; run: (callback: () => Promise<void>, message: string) => Promise<void> }) {
  const action = (value: string, durationHours?: number) => {
    const note = window.prompt(`Reason for ${value.replaceAll("_", " ")} action:`) || "";
    if (["warn", "restrict_messaging", "suspend", "ban"].includes(value) && !note.trim()) return;
    void run(() => apiRequest(`/api/admin/members/${member.id}`, { method: "PATCH", body: JSON.stringify({ action: value, note, durationHours }) }).then(() => undefined), "Member account updated");
  };
  return (
    <tr className="border-t border-white/[0.06] text-sm">
      <td className="p-4"><div className="flex items-center gap-3"><Avatar member={member} /><div><p className="font-black">{member.displayName}</p><p className="mt-1 text-[10px] text-white/35">{member.email}</p></div></div></td>
      <td className="p-4 text-xs text-white/50">{member.city || "—"}, {member.country}</td>
      <td className="p-4"><StatusBadge value={member.accountStatus} /></td>
      <td className="p-4 text-xs">{member.isVerified ? "✓ Verified" : "Not verified"}</td>
      <td className="p-4 text-xs text-white/35">{formatDate(member.createdAt)}</td>
      <td className="p-4"><div className="flex flex-wrap gap-1.5"><button disabled={busy} onClick={() => action("warn")} className="mini-action">Warn</button><button disabled={busy} onClick={() => action("restrict_messaging", 72)} className="mini-action">Restrict</button><button disabled={busy} onClick={() => action("suspend", 168)} className="mini-action">Suspend</button><button disabled={busy} onClick={() => action("ban")} className="mini-action text-red-200">Ban</button><button disabled={busy} onClick={() => action("restore")} className="mini-action text-emerald-200">Restore</button><button disabled={busy} onClick={() => action(member.isVerified ? "remove_verification" : "verify")} className="mini-action">{member.isVerified ? "Unverify" : "Verify"}</button></div></td>
    </tr>
  );
}

function VerificationCard({ request, busy, run }: { request: VerificationRequest; busy: boolean; run: (callback: () => Promise<void>, message: string) => Promise<void> }) {
  const decide = (decision: string) => {
    const note = window.prompt("Admin note (optional):") || "";
    void run(() => apiRequest(`/api/admin/verifications/${request.id}`, { method: "PATCH", body: JSON.stringify({ decision, note }) }).then(() => undefined), "Verification request updated");
  };
  return <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5"><div className="flex items-center gap-3"><Avatar member={request.member} size={56} /><div className="min-w-0 flex-1"><p className="truncate text-lg font-black">{request.member?.displayName || "Unknown member"}</p><p className="mt-1 text-xs text-white/35">{request.member?.country} · {formatDate(request.createdAt)}</p></div><StatusBadge value={request.status} /></div><p className="mt-4 rounded-2xl bg-white/[0.035] p-4 text-sm leading-6 text-white/55">{request.memberNote || "The member requested profile verification."}</p><div className="mt-4 flex gap-2"><button disabled={busy} onClick={() => decide("reviewing")} className="admin-action">Reviewing</button><button disabled={busy} onClick={() => decide("approved")} className="admin-action text-emerald-200">Approve</button><button disabled={busy} onClick={() => decide("rejected")} className="admin-action text-red-200">Reject</button></div></div>;
}
