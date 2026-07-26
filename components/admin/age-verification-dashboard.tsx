"use client";

import {
  useCallback,
  useEffect,
  useState,
} from "react";

type Item = {
  id: string;
  userId: string;
  requestType: string;
  selfieUrl: string | null;
  idUrl: string | null;
  memberNote: string | null;
  adminNote: string | null;
  createdAt: string;
  member: {
    displayName: string;
    email: string;
    dateOfBirth: string | null;
    ageStatus: string;
    photoStatus: string;
    idStatus: string;
  };
};

function readable(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

export function AgeVerificationDashboard() {
  const [items, setItems] =
    useState<Item[]>([]);

  const [loading, setLoading] =
    useState(true);

  const [busy, setBusy] =
    useState<string | null>(null);

  const [error, setError] =
    useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");

    try {
      const response = await fetch(
        "/api/admin/age-verifications",
        { cache: "no-store" },
      );

      const payload =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Unable to load requests.",
        );
      }

      setItems(
        Array.isArray(payload.items)
          ? payload.items
          : [],
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to load requests.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  async function decide(
    item: Item,
    decision: string,
  ) {
    const note = window.prompt(
      "Reason or review note:",
      "",
    );

    if (note === null) return;

    if (
      decision === "underage" &&
      !window.confirm(
        "This will ban the account as underage. Continue?",
      )
    ) {
      return;
    }

    setBusy(item.id);
    setError("");

    try {
      const response = await fetch(
        `/api/admin/age-verifications/${item.id}`,
        {
          method: "PATCH",
          headers: {
            "Content-Type":
              "application/json",
          },
          body: JSON.stringify({
            decision,
            note: note.trim() || null,
          }),
        },
      );

      const payload =
        await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(
          typeof payload.error === "string"
            ? payload.error
            : "Review action failed.",
        );
      }

      await load();
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Review action failed.",
      );
    } finally {
      setBusy(null);
    }
  }

  return (
    <main className="min-h-screen bg-[#080a0f] px-4 py-8 text-white">
      <section className="mx-auto max-w-7xl">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-[10px] font-black uppercase tracking-[0.28em] text-[#F2C94C]">
              AfroLove safety administration
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Age and identity verification
            </h1>

            <p className="mt-2 max-w-2xl text-sm leading-6 text-white/45">
              Review private evidence carefully.
              Approve only when the selfie reasonably
              matches the profile and the member is
              confirmed to be at least 18.
            </p>
          </div>

          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => void load()}
              className="rounded-full border border-white/10 px-4 py-2 text-xs font-black text-white/60"
            >
              Refresh
            </button>

            <a
              href="/admin"
              className="rounded-full bg-[#F2C94C] px-4 py-2 text-xs font-black text-black"
            >
              Back to admin
            </a>
          </div>
        </div>

        {error && (
          <p className="mt-5 rounded-2xl border border-red-400/20 bg-red-400/[0.07] p-4 text-sm text-red-200">
            {error}
          </p>
        )}

        {loading ? (
          <p className="mt-8 text-sm text-white/45">
            Loading verification requests...
          </p>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-3xl border border-white/10 bg-white/[0.035] p-8 text-center">
            <p className="font-black">
              No open verification requests
            </p>
          </div>
        ) : (
          <div className="mt-7 grid gap-5">
            {items.map((item) => (
              <article
                key={item.id}
                className="rounded-3xl border border-white/10 bg-[#101218] p-5"
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div>
                    <h2 className="text-xl font-black">
                      {item.member.displayName}
                    </h2>

                    <p className="mt-1 text-xs text-white/40">
                      {item.member.email}
                    </p>

                    <p className="mt-2 text-xs font-bold text-[#FFE58C]">
                      DOB:{" "}
                      {item.member.dateOfBirth ||
                        "Not provided"}{" "}
                      · {readable(item.requestType)}
                    </p>
                  </div>

                  <div className="flex flex-wrap gap-2">
                    <Pill
                      text={`Age: ${readable(
                        item.member.ageStatus,
                      )}`}
                    />

                    <Pill
                      text={`Photo: ${readable(
                        item.member.photoStatus,
                      )}`}
                    />

                    <Pill
                      text={`ID: ${readable(
                        item.member.idStatus,
                      )}`}
                    />
                  </div>
                </div>

                <div className="mt-5 grid gap-4 md:grid-cols-2">
                  <Evidence
                    title="Current selfie"
                    url={item.selfieUrl}
                  />

                  <Evidence
                    title="Government ID"
                    url={item.idUrl}
                  />
                </div>

                {(item.memberNote ||
                  item.adminNote) && (
                  <div className="mt-4 rounded-2xl border border-white/10 bg-black/20 p-4 text-xs leading-5 text-white/55">
                    {item.memberNote && (
                      <p>
                        <strong className="text-white/80">
                          Member:
                        </strong>{" "}
                        {item.memberNote}
                      </p>
                    )}

                    {item.adminNote && (
                      <p className="mt-2">
                        <strong className="text-white/80">
                          Previous review:
                        </strong>{" "}
                        {item.adminNote}
                      </p>
                    )}
                  </div>
                )}

                <div className="mt-5 flex flex-wrap gap-2">
                  <Action
                    label="Approve photo"
                    primary
                    disabled={busy === item.id}
                    onClick={() =>
                      void decide(
                        item,
                        "approve_photo",
                      )
                    }
                  />

                  <Action
                    label="Require ID"
                    disabled={busy === item.id}
                    onClick={() =>
                      void decide(
                        item,
                        "require_id",
                      )
                    }
                  />

                  <Action
                    label="Approve ID"
                    primary
                    disabled={busy === item.id}
                    onClick={() =>
                      void decide(
                        item,
                        "approve_id",
                      )
                    }
                  />

                  <Action
                    label="Reject"
                    danger
                    disabled={busy === item.id}
                    onClick={() =>
                      void decide(
                        item,
                        "reject",
                      )
                    }
                  />

                  <Action
                    label="Under 18 — ban"
                    danger
                    disabled={busy === item.id}
                    onClick={() =>
                      void decide(
                        item,
                        "underage",
                      )
                    }
                  />
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

function Pill({ text }: { text: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.08em] text-white/55">
      {text}
    </span>
  );
}

function Evidence({
  title,
  url,
}: {
  title: string;
  url: string | null;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <p className="text-xs font-black text-white/65">
        {title}
      </p>

      {url ? (
        <>
          <img
            src={url}
            alt={title}
            className="mt-3 h-64 w-full rounded-xl bg-black object-contain"
          />

          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="mt-3 inline-flex text-xs font-black text-[#FFE58C]"
          >
            Open full image
          </a>
        </>
      ) : (
        <p className="mt-3 text-xs text-white/30">
          Not submitted
        </p>
      )}
    </div>
  );
}

function Action({
  label,
  onClick,
  disabled,
  primary = false,
  danger = false,
}: {
  label: string;
  onClick: () => void;
  disabled: boolean;
  primary?: boolean;
  danger?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={[
        "rounded-xl border px-3 py-2 text-xs font-black disabled:opacity-40",
        primary
          ? "border-[#F2C94C] bg-[#F2C94C] text-black"
          : danger
            ? "border-red-400/25 bg-red-400/[0.08] text-red-200"
            : "border-white/10 bg-white/[0.04] text-white/65",
      ].join(" ")}
    >
      {label}
    </button>
  );
}
