"use client";

import { useMemo, useState } from "react";
import { createClient } from "@/lib/supabase/client";

type ProfileState = {
  dateOfBirth: string | null;
  ageStatus: string;
  photoStatus: string;
  idStatus: string;
  restricted: boolean;
  reason: string | null;
};

type RequestState = {
  status: string;
  requestType: string;
  adminNote: string | null;
} | null;

function readable(value: string) {
  return value
    .replaceAll("_", " ")
    .replace(/\b\w/g, (letter) =>
      letter.toUpperCase(),
    );
}

function extension(file: File) {
  if (file.type === "image/png") return "png";
  if (file.type === "image/webp") return "webp";
  return "jpg";
}

export function VerificationCenter({
  userId,
  email,
  emailConfirmed,
  initialProfile,
  initialRequest,
}: {
  userId: string;
  email: string;
  emailConfirmed: boolean;
  initialProfile: ProfileState;
  initialRequest: RequestState;
}) {
  const supabase = useMemo(
    () => createClient(),
    [],
  );

  const [profile, setProfile] =
    useState(initialProfile);

  const [request, setRequest] =
    useState(initialRequest);

  const [selfie, setSelfie] =
    useState<File | null>(null);

  const [identityDocument, setIdentityDocument] =
    useState<File | null>(null);

  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const requiresId = [
    "required",
    "pending",
    "reviewing",
    "rejected",
  ].includes(profile.idStatus);

  const approved =
    emailConfirmed &&
    profile.ageStatus === "confirmed" &&
    profile.photoStatus === "approved" &&
    ["not_required", "approved"].includes(
      profile.idStatus,
    ) &&
    !profile.restricted;

  const underReview =
    request?.status === "pending" &&
    profile.photoStatus === "reviewing" &&
    profile.idStatus !== "required";

  async function uploadEvidence(
    file: File,
    label: "selfie" | "id",
  ) {
    if (file.size > 8 * 1024 * 1024) {
      throw new Error(
        "Each verification image must be smaller than 8 MB.",
      );
    }

    if (
      ![
        "image/jpeg",
        "image/png",
        "image/webp",
      ].includes(file.type)
    ) {
      throw new Error(
        "Use a JPG, PNG or WebP image.",
      );
    }

    const path =
      `${userId}/${label}-${Date.now()}.` +
      extension(file);

    const { error: uploadError } =
      await supabase.storage
        .from("verification-evidence")
        .upload(path, file, {
          cacheControl: "3600",
          upsert: false,
          contentType: file.type,
        });

    if (uploadError) throw uploadError;

    return path;
  }

  async function submit() {
    setError("");
    setSuccess("");

    if (!emailConfirmed) {
      setError(
        "Confirm your email address before requesting verification.",
      );
      return;
    }

    if (!selfie) {
      setError(
        "Take or upload a clear current selfie.",
      );
      return;
    }

    if (requiresId && !identityDocument) {
      setError(
        "Government ID is required for this review.",
      );
      return;
    }

    setLoading(true);

    try {
      const selfiePath =
        await uploadEvidence(selfie, "selfie");

      const idDocumentPath =
        identityDocument
          ? await uploadEvidence(
              identityDocument,
              "id",
            )
          : null;

      const response = await fetch(
        "/api/verification/request",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            selfiePath,
            idDocumentPath,
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
            : "Unable to submit verification.",
        );
      }

      setProfile((current) => ({
        ...current,
        ageStatus: "confirmed",
        photoStatus: "reviewing",
        idStatus: requiresId
          ? "reviewing"
          : current.idStatus,
        restricted: true,
        reason: requiresId
          ? "Identity verification is under review"
          : "Photo verification is under review",
      }));

      setRequest({
        status: "pending",
        requestType: requiresId
          ? "identity"
          : "photo",
        adminNote: null,
      });

      setSelfie(null);
      setIdentityDocument(null);
      setNote("");

      setSuccess(
        "Your evidence was submitted securely for review.",
      );
    } catch (caught) {
      setError(
        caught instanceof Error
          ? caught.message
          : "Unable to submit verification.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#080a0f] px-4 py-8 text-white">
      <section className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-[#101218] p-5 shadow-2xl sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xl font-black tracking-[0.2em]">
              AFRO<span className="text-red-400">LOVE</span>
            </p>

            <p className="mt-7 text-[10px] font-black uppercase tracking-[0.28em] text-[#F2C94C]">
              Trust and safety
            </p>

            <h1 className="mt-2 text-3xl font-black">
              Verify your profile
            </h1>

            <p className="mt-3 max-w-xl text-sm leading-6 text-white/50">
              AfroLove is an adults-only platform.
              Email, age and a current selfie are
              checked before full verification.
              Government ID is requested only when
              an additional age or identity review
              is necessary.
            </p>
          </div>

          <a
            href="/profile/edit"
            className="rounded-full border border-white/10 px-4 py-2 text-xs font-black text-white/60"
          >
            Edit profile
          </a>
        </div>

        <div className="mt-8 grid gap-3 sm:grid-cols-2">
          <StatusCard
            title="Email"
            status={
              emailConfirmed
                ? "Confirmed"
                : "Pending"
            }
            passed={emailConfirmed}
            detail={email}
          />

          <StatusCard
            title="Age 18+"
            status={readable(profile.ageStatus)}
            passed={
              profile.ageStatus === "confirmed"
            }
            detail={
              profile.dateOfBirth
                ? `DOB: ${profile.dateOfBirth}`
                : "Date of birth is required."
            }
          />

          <StatusCard
            title="Photo"
            status={readable(profile.photoStatus)}
            passed={
              profile.photoStatus === "approved"
            }
            detail="A current selfie is compared with your profile photos."
          />

          <StatusCard
            title="Government ID"
            status={readable(profile.idStatus)}
            passed={[
              "not_required",
              "approved",
            ].includes(profile.idStatus)}
            detail={
              requiresId
                ? "ID is required for this review."
                : "Requested only when an additional review is needed."
            }
          />
        </div>

        {approved ? (
          <div className="mt-7 rounded-3xl border border-emerald-400/20 bg-emerald-400/[0.07] p-6 text-center">
            <p className="font-black text-emerald-200">
              Verification complete
            </p>

            <p className="mt-2 text-sm text-emerald-100/60">
              Your verification badges are active.
            </p>

            <a
              href="/app"
              className="mt-5 inline-flex rounded-2xl bg-[#F2C94C] px-6 py-3 text-sm font-black text-black"
            >
              Enter AfroLove
            </a>
          </div>
        ) : profile.ageStatus === "blocked" ? (
          <div className="mt-7 rounded-3xl border border-red-400/20 bg-red-400/[0.07] p-6 text-center">
            <p className="font-black text-red-200">
              Access unavailable
            </p>

            <p className="mt-2 text-sm text-red-100/60">
              AfroLove is available only to adults
              aged 18 or older.
            </p>
          </div>
        ) : underReview ? (
          <div className="mt-7 rounded-3xl border border-blue-400/20 bg-blue-400/[0.06] p-6 text-center">
            <p className="font-black text-blue-100">
              Verification under review
            </p>

            <p className="mt-2 text-sm text-blue-100/55">
              Your selfie has been submitted securely.
              An administrator will review it.
            </p>
          </div>
        ) : (
          <div className="mt-7 rounded-3xl border border-white/10 bg-black/20 p-5">
            {(profile.reason ||
              request?.adminNote) && (
              <div className="mb-5 rounded-2xl border border-amber-300/20 bg-amber-300/[0.06] p-4 text-sm leading-6 text-amber-100/75">
                <strong className="block">
                  Verification notice
                </strong>

                {request?.adminNote ||
                  profile.reason}
              </div>
            )}

            <h2 className="text-xl font-black">
              Submit verification evidence
            </h2>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-2 block text-xs font-black text-white/65">
                  Current selfie
                </span>

                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="user"
                  onChange={(event) =>
                    setSelfie(
                      event.target.files?.[0] ??
                        null,
                    )
                  }
                  className="block w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs file:mr-3 file:rounded-full file:border-0 file:bg-[#F2C94C] file:px-3 file:py-2 file:font-black file:text-black"
                />

                <span className="mt-2 block text-[11px] leading-5 text-white/35">
                  Use a clear front-facing photo
                  without filters.
                </span>
              </label>

              {requiresId && (
                <label className="block">
                  <span className="mb-2 block text-xs font-black text-white/65">
                    Government ID
                  </span>

                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    capture="environment"
                    onChange={(event) =>
                      setIdentityDocument(
                        event.target.files?.[0] ??
                          null,
                      )
                    }
                    className="block w-full rounded-2xl border border-white/10 bg-white/[0.04] p-3 text-xs file:mr-3 file:rounded-full file:border-0 file:bg-[#F2C94C] file:px-3 file:py-2 file:font-black file:text-black"
                  />

                  <span className="mt-2 block text-[11px] leading-5 text-white/35">
                    It must show your photo, name and
                    date of birth.
                  </span>
                </label>
              )}
            </div>

            <label className="mt-4 block">
              <span className="mb-2 block text-xs font-black text-white/65">
                Note for the reviewer (optional)
              </span>

              <textarea
                value={note}
                onChange={(event) =>
                  setNote(event.target.value)
                }
                maxLength={1000}
                rows={3}
                placeholder="Add anything helpful for the verification review."
                className="w-full rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm outline-none focus:border-[#F2C94C]/60"
              />
            </label>

            {error && (
              <p className="mt-4 rounded-2xl border border-red-400/20 bg-red-400/[0.07] p-3 text-sm text-red-200">
                {error}
              </p>
            )}

            {success && (
              <p className="mt-4 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.07] p-3 text-sm text-emerald-200">
                {success}
              </p>
            )}

            <button
              type="button"
              onClick={submit}
              disabled={loading}
              className="mt-5 w-full rounded-2xl bg-[#F2C94C] py-3.5 text-sm font-black text-black disabled:opacity-50"
            >
              {loading
                ? "Submitting securely..."
                : "Submit verification"}
            </button>
          </div>
        )}

        <div className="mt-6 rounded-2xl border border-blue-400/15 bg-blue-400/[0.04] p-4 text-[11px] leading-5 text-blue-100/50">
          Verification images are stored privately.
          They are never displayed in your public
          profile gallery.
        </div>

        <form
          action="/auth/signout"
          method="post"
          className="mt-5"
        >
          <button className="w-full rounded-2xl border border-white/10 py-3 text-sm font-black text-white/55">
            Sign out
          </button>
        </form>
      </section>
    </main>
  );
}

function StatusCard({
  title,
  status,
  passed,
  detail,
}: {
  title: string;
  status: string;
  passed: boolean;
  detail: string;
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-white/[0.035] p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-sm font-black">
          {title}
        </p>

        <span
          className={[
            "rounded-full px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.1em]",
            passed
              ? "bg-emerald-400/15 text-emerald-200"
              : "bg-amber-300/10 text-amber-100",
          ].join(" ")}
        >
          {status}
        </span>
      </div>

      <p className="mt-2 text-xs leading-5 text-white/38">
        {detail}
      </p>
    </article>
  );
}
