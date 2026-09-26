import Image from "next/image";
import { redirect } from "next/navigation";
import { isAdmin } from "@/lib/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ id: string }>;
};

function valueOrDash(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return "—";
  }

  if (Array.isArray(value)) {
    return value.length ? value.join(", ") : "—";
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}

function calculateAge(dateOfBirth: unknown) {
  if (typeof dateOfBirth !== "string" || !dateOfBirth) {
    return "—";
  }

  const birth = new Date(dateOfBirth);

  if (Number.isNaN(birth.getTime())) {
    return "—";
  }

  const today = new Date();
  let age = today.getFullYear() - birth.getFullYear();

  const monthDifference =
    today.getMonth() - birth.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 &&
      today.getDate() < birth.getDate())
  ) {
    age--;
  }

  return String(age);
}

function Detail({
  label,
  value,
}: {
  label: string;
  value: unknown;
}) {
  return (
    <div className="rounded-2xl border border-white/[0.07] bg-white/[0.025] p-4">
      <p className="text-[10px] font-black uppercase tracking-wider text-white/30">
        {label}
      </p>
      <p className="mt-2 break-words text-sm font-semibold text-white/80">
        {valueOrDash(value)}
      </p>
    </div>
  );
}

export default async function AdminMemberProfilePage({
  params,
}: PageProps) {
  const { id } = await params;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login?next=/admin");
  }

  if (!(await isAdmin(supabase))) {
    redirect("/app");
  }

  const { data: profile, error } = await (
    supabase as any
  )
    .from("profiles")
    .select("*")
    .eq("id", id)
    .maybeSingle();

  if (error || !profile) {
    return (
      <main className="min-h-screen bg-[#07090e] p-6 text-white">
        <div className="mx-auto max-w-5xl">
          <a
            href="/admin"
            className="text-sm font-black text-[#F2C94C]"
          >
            ? Back to Member Management
          </a>

          <div className="mt-8 rounded-3xl border border-red-400/20 bg-red-400/[0.05] p-8">
            <h1 className="text-2xl font-black">
              Member profile not found
            </h1>
          </div>
        </div>
      </main>
    );
  }

  const photos = Array.from(
    new Set(
      [
        ...(Array.isArray(profile.photo_urls)
          ? profile.photo_urls
          : []),
        profile.avatar_url,
      ].filter(
        (item): item is string =>
          typeof item === "string" &&
          item.trim().length > 0,
      ),
    ),
  );

  return (
    <main className="min-h-screen bg-[#07090e] p-4 text-white sm:p-6 lg:p-8">
      <div className="mx-auto max-w-6xl">

        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <a
              href="/admin"
              className="text-sm font-black text-[#F2C94C] hover:text-[#FFE58C]"
            >
              ? Back to Member Management
            </a>

            <h1 className="mt-4 text-3xl font-black sm:text-4xl">
              Member Profile
            </h1>

            <p className="mt-1 text-sm text-white/35">
              Read-only admin profile review
            </p>
          </div>

          <div className="rounded-full border border-[#F2C94C]/25 bg-[#F2C94C]/10 px-4 py-2 text-xs font-black uppercase tracking-wide text-[#FFE58C]">
            {valueOrDash(profile.account_status)}
          </div>
        </div>


        <section className="mt-7 rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5 sm:p-7">

          <div className="flex flex-col gap-5 sm:flex-row sm:items-center">

            <div className="relative h-28 w-28 shrink-0 overflow-hidden rounded-full bg-[#F2C94C] text-black">

              {profile.avatar_url ? (
                <Image
                  src={profile.avatar_url}
                  alt={profile.display_name || "Member"}
                  fill
                  sizes="112px"
                  className="object-cover"
                />
              ) : (
                <div className="flex h-full w-full items-center justify-center text-3xl font-black">
                  {(profile.display_name || "A")
                    .split(/\s+/)
                    .slice(0, 2)
                    .map((part: string) => part[0])
                    .join("")
                    .toUpperCase()}
                </div>
              )}

            </div>

            <div className="min-w-0">
              <h2 className="text-3xl font-black">
                {profile.display_name || "AfroLove member"}
              </h2>

              <p className="mt-1 break-all text-sm text-white/40">
                {profile.email || "No email"}
              </p>

              <div className="mt-3 flex flex-wrap gap-2">

                {profile.is_verified && (
                  <span className="rounded-full bg-emerald-400/10 px-3 py-1 text-[10px] font-black uppercase tracking-wide text-emerald-300">
                    Verified
                  </span>
                )}

                <span className="rounded-full bg-white/[0.06] px-3 py-1 text-[10px] font-black uppercase tracking-wide text-white/50">
                  {profile.city || "—"}, {profile.country || "—"}
                </span>

              </div>
            </div>

          </div>

        </section>


        {photos.length > 0 && (
          <section className="mt-6">
            <h2 className="text-xl font-black">
              Profile photos
            </h2>

            <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">

              {photos.map((photo) => (
                <div
                  key={photo}
                  className="relative aspect-[4/5] overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025]"
                >
                  <Image
                    src={photo}
                    alt="Member profile photo"
                    fill
                    sizes="(max-width: 640px) 50vw, 25vw"
                    className="object-cover"
                  />
                </div>
              ))}

            </div>
          </section>
        )}


        <section className="mt-7">
          <h2 className="text-xl font-black">
            Profile information
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            <Detail
              label="Display name"
              value={profile.display_name}
            />

            <Detail
              label="Email"
              value={profile.email}
            />

            <Detail
              label="Age"
              value={calculateAge(profile.date_of_birth)}
            />

            <Detail
              label="Date of birth"
              value={profile.date_of_birth}
            />

            <Detail
              label="Gender"
              value={profile.gender}
            />

            <Detail
              label="Interested in"
              value={profile.show_me}
            />

            <Detail
              label="City"
              value={profile.city}
            />

            <Detail
              label="Country"
              value={profile.country}
            />

            <Detail
              label="Occupation"
              value={profile.occupation}
            />

            <Detail
              label="Education"
              value={profile.education}
            />

            <Detail
              label="Religion"
              value={profile.religion}
            />

            <Detail
              label="Height"
              value={
                profile.height_cm
                  ? `${profile.height_cm} cm`
                  : null
              }
            />

            <Detail
              label="Languages"
              value={profile.languages}
            />

            <Detail
              label="Interests"
              value={profile.interests}
            />

            <Detail
              label="Relationship goal"
              value={profile.relationship_goal}
            />

            <Detail
              label="Looking for"
              value={profile.looking_for}
            />

            <Detail
              label="Tribe / heritage"
              value={profile.tribe}
            />

            <Detail
              label="Profile completion"
              value={
                typeof profile.profile_completion === "number"
                  ? `${profile.profile_completion}%`
                  : null
              }
            />

          </div>
        </section>


        <section className="mt-7 grid gap-4 lg:grid-cols-2">

          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5">

            <p className="text-[10px] font-black uppercase tracking-wider text-white/30">
              About me
            </p>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/70">
              {profile.bio || "No bio provided."}
            </p>

          </div>


          <div className="rounded-3xl border border-white/[0.08] bg-white/[0.025] p-5">

            <p className="text-[10px] font-black uppercase tracking-wider text-white/30">
              What I am looking for
            </p>

            <p className="mt-3 whitespace-pre-wrap text-sm leading-7 text-white/70">
              {profile.looking_for ||
                "No preference provided."}
            </p>

          </div>

        </section>


        <section className="mt-7">
          <h2 className="text-xl font-black">
            Verification & account
          </h2>

          <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">

            <Detail
              label="Account status"
              value={profile.account_status}
            />

            <Detail
              label="Verified"
              value={profile.is_verified ? "Yes" : "No"}
            />

            <Detail
              label="Age verification"
              value={profile.age_verification_status}
            />

            <Detail
              label="Photo verification"
              value={profile.photo_verification_status}
            />

            <Detail
              label="ID verification"
              value={profile.id_verification_status}
            />

            <Detail
              label="Verification restricted"
              value={
                profile.verification_restricted
                  ? "Yes"
                  : "No"
              }
            />

            <Detail
              label="Onboarding completed"
              value={
                profile.onboarding_completed
                  ? "Yes"
                  : "No"
              }
            />

            <Detail
              label="Joined"
              value={
                profile.created_at
                  ? new Date(
                      profile.created_at,
                    ).toLocaleString()
                  : null
              }
            />

            <Detail
              label="Member ID"
              value={profile.id}
            />

          </div>
        </section>


        <div className="mt-8">
          <a
            href="/admin"
            className="inline-flex rounded-2xl bg-[#F2C94C] px-5 py-3 text-sm font-black text-black transition hover:bg-[#FFE58C]"
          >
            Back to Member Management
          </a>
        </div>

      </div>
    </main>
  );
}