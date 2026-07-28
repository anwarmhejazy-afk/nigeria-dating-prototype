"use client";

import Link from "next/link";
import {
  useMemo,
  useState,
} from "react";

type Member = {
  id: string;
  email: string | null;
  displayName: string;
  country: string;
  city: string;
  accountStatus: string;
  createdAt: string;
};

type ApiPayload = {
  error?: string;
};

export function AccountDeletionDashboard({
  initialMembers,
}: {
  initialMembers: Member[];
}) {
  const [members, setMembers] =
    useState(initialMembers);

  const [query, setQuery] = useState("");
  const [selected, setSelected] =
    useState<Member | null>(null);

  const [confirmation, setConfirmation] =
    useState("");

  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  const filtered = useMemo(() => {
    const value = query.trim().toLowerCase();

    if (!value) return members;

    return members.filter((member) =>
      [
        member.displayName,
        member.email,
        member.country,
        member.city,
        member.accountStatus,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(value),
    );
  }, [members, query]);

  const expected = selected
    ? `DELETE ${selected.email || selected.id}`
    : "";

  async function removeMember() {
    if (
      !selected ||
      confirmation.trim() !== expected
    ) {
      setMessage(
        "The confirmation text does not match.",
      );
      return;
    }

    if (reason.trim().length < 5) {
      setMessage(
        "Add a short administrator reason.",
      );
      return;
    }

    if (
      !window.confirm(
        `Permanently delete ${selected.displayName}? This cannot be undone.`,
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage("");

    try {
      const response = await fetch(
        `/api/admin/account-deletion/${selected.id}`,
        {
          method: "DELETE",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            confirmation:
              confirmation.trim(),
            reason: reason.trim(),
          }),
        },
      );

      const payload =
        (await response
          .json()
          .catch(() => ({}))) as ApiPayload;

      if (!response.ok) {
        throw new Error(
          payload.error ||
            "Permanent account deletion failed.",
        );
      }

      setMembers((current) =>
        current.filter(
          (member) =>
            member.id !== selected.id,
        ),
      );

      setMessage(
        `${selected.displayName} was deleted safely.`,
      );

      setSelected(null);
      setConfirmation("");
      setReason("");
    } catch (caught) {
      setMessage(
        caught instanceof Error
          ? caught.message
          : "Permanent account deletion failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080a0f] px-4 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#F2C94C]">
              Super administrator
            </p>
            <h1 className="mt-2 text-3xl font-black">
              Permanent account deletion
            </h1>
            <p className="mt-2 max-w-3xl text-sm leading-6 text-white/45">
              Delete member authentication, profiles, matches, messages,
              photos and private verification evidence. Safety reports and
              administrator audit history remain preserved with
              deleted-account snapshots.
            </p>
          </div>

          <Link
            href="/admin"
            className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm font-black text-white/65"
          >
            Back to dashboard
          </Link>
        </div>

        <div className="mt-7 grid gap-6 lg:grid-cols-[1.25fr_0.75fr]">
          <section className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5">
            <input
              value={query}
              onChange={(event) =>
                setQuery(event.target.value)
              }
              placeholder="Search members by name, email or country..."
              className="w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none placeholder:text-white/25 focus:border-[#F2C94C]/50"
            />

            <div className="mt-4 max-h-[650px] space-y-2 overflow-y-auto">
              {filtered.map((member) => (
                <button
                  key={member.id}
                  onClick={() => {
                    setSelected(member);
                    setConfirmation("");
                    setReason("");
                    setMessage("");
                  }}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selected?.id === member.id
                      ? "border-[#F2C94C]/60 bg-[#F2C94C]/10"
                      : "border-white/[0.07] bg-white/[0.025] hover:border-white/15"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-black">
                        {member.displayName}
                      </p>
                      <p className="mt-1 truncate text-[11px] text-white/40">
                        {member.email || member.id}
                      </p>
                      <p className="mt-2 text-[10px] text-white/30">
                        {[member.city, member.country]
                          .filter(Boolean)
                          .join(", ")}
                      </p>
                    </div>

                    <span className="rounded-full bg-white/[0.06] px-2.5 py-1 text-[9px] font-black uppercase text-white/45">
                      {member.accountStatus}
                    </span>
                  </div>
                </button>
              ))}

              {!filtered.length && (
                <p className="py-12 text-center text-sm text-white/30">
                  No member accounts match this search.
                </p>
              )}
            </div>
          </section>

          <aside className="rounded-3xl border border-red-400/15 bg-red-400/[0.035] p-5">
            {!selected ? (
              <div className="py-16 text-center">
                <p className="text-sm font-black text-red-100/75">
                  Select a member account
                </p>
                <p className="mt-2 text-xs leading-5 text-red-100/35">
                  Staff accounts are excluded and protected.
                </p>
              </div>
            ) : (
              <>
                <p className="text-[10px] font-black uppercase tracking-[0.22em] text-red-300">
                  Danger zone
                </p>

                <h2 className="mt-3 text-2xl font-black">
                  {selected.displayName}
                </h2>

                <p className="mt-2 text-xs leading-5 text-red-100/45">
                  This permanently removes the Auth user and member-owned
                  private media. The action cannot be reversed.
                </p>

                <label className="mt-5 block text-xs font-black text-white/65">
                  Administrator reason
                </label>

                <textarea
                  value={reason}
                  onChange={(event) =>
                    setReason(event.target.value)
                  }
                  maxLength={500}
                  rows={4}
                  placeholder="Explain why this account must be permanently removed..."
                  className="mt-2 w-full resize-none rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none placeholder:text-white/20 focus:border-red-300/50"
                />

                <label className="mt-5 block text-xs font-black text-white/65">
                  Type this exactly:
                </label>

                <code className="mt-2 block break-all rounded-xl bg-black/30 px-3 py-2 text-xs text-red-200">
                  {expected}
                </code>

                <input
                  value={confirmation}
                  onChange={(event) =>
                    setConfirmation(
                      event.target.value,
                    )
                  }
                  autoComplete="off"
                  className="mt-2 w-full rounded-2xl border border-white/10 bg-black/25 px-4 py-3 text-sm outline-none focus:border-red-300/50"
                />

                <button
                  disabled={
                    busy ||
                    confirmation.trim() !==
                      expected ||
                    reason.trim().length < 5
                  }
                  onClick={() =>
                    void removeMember()
                  }
                  className="mt-5 w-full rounded-2xl bg-red-500 py-3.5 text-sm font-black text-white disabled:cursor-not-allowed disabled:opacity-35"
                >
                  {busy
                    ? "Deleting safely..."
                    : "Permanently delete account"}
                </button>
              </>
            )}

            {message && (
              <p className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-3 text-xs leading-5 text-white/65">
                {message}
              </p>
            )}
          </aside>
        </div>
      </section>
    </main>
  );
}
