"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useRef, useState, type ChangeEvent } from "react";
import { BrandLogo } from "@/components/brand/brand-logo";
import {
  calculateAge,
  calculateProfileCompletion,
  initialsFromName,
  normaliseList,
  type LifestylePreferences,
  type MemberProfile,
} from "@/lib/profile";
import { createClient } from "@/lib/supabase/client";

const steps = ["Basics", "About you", "Compatibility", "Review"] as const;

const africanCountries = [
  "Algeria", "Angola", "Benin", "Botswana", "Burkina Faso", "Burundi",
  "Cabo Verde", "Cameroon", "Central African Republic", "Chad", "Comoros",
  "Democratic Republic of the Congo", "Djibouti", "Egypt", "Equatorial Guinea",
  "Eritrea", "Eswatini", "Ethiopia", "Gabon", "Gambia", "Ghana", "Guinea",
  "Guinea-Bissau", "Ivory Coast", "Kenya", "Lesotho", "Liberia", "Libya",
  "Madagascar", "Malawi", "Mali", "Mauritania", "Mauritius", "Morocco",
  "Mozambique", "Namibia", "Niger", "Nigeria", "Republic of the Congo",
  "Rwanda", "São Tomé and Príncipe", "Senegal", "Seychelles", "Sierra Leone",
  "Somalia", "South Africa", "South Sudan", "Sudan", "Tanzania", "Togo",
  "Tunisia", "Uganda", "Zambia", "Zimbabwe",
];

const interestOptions = [
  "Afrobeats", "Business", "Cooking", "Fitness", "Football", "Faith",
  "Fashion", "Movies", "Music", "Photography", "Reading", "Travel",
  "Tech", "Art", "Family", "Volunteering", "Food", "Nature",
];

const relationshipOptions = [
  "A serious relationship",
  "Marriage",
  "Dating with intention",
  "Friendship first",
  "Still figuring it out",
];

const defaultLifestyle: LifestylePreferences = {
  drinking: "Prefer not to say",
  smoking: "Prefer not to say",
  exercise: "Prefer not to say",
  children: "Prefer not to say",
  wants_children: "Prefer not to say",
};

type FormState = {
  display_name: string;
  date_of_birth: string;
  gender: string;
  show_me: string;
  country: string;
  city: string;
  state: string;
  tribe: string;
  occupation: string;
  education: string;
  religion: string;
  height_cm: string;
  languagesText: string;
  bio: string;
  looking_for: string;
  relationship_goal: string;
  interests: string[];
  lifestyle: LifestylePreferences;
};

function initialForm(profile: MemberProfile | null): FormState {
  return {
    display_name: profile?.display_name ?? "",
    date_of_birth: profile?.date_of_birth ?? "",
    gender: profile?.gender ?? "",
    show_me: profile?.show_me ?? "",
    country: profile?.onboarding_completed ? profile.country : "",
    city: profile?.city ?? "",
    state: profile?.state ?? "",
    tribe: profile?.tribe ?? "",
    occupation: profile?.occupation ?? "",
    education: profile?.education ?? "",
    religion: profile?.religion ?? "",
    height_cm: profile?.height_cm ? String(profile.height_cm) : "",
    languagesText: profile?.languages.join(", ") ?? "English",
    bio: profile?.bio ?? "",
    looking_for: profile?.looking_for ?? "",
    relationship_goal: profile?.relationship_goal ?? "",
    interests: profile?.interests ?? [],
    lifestyle: profile?.lifestyle ?? defaultLifestyle,
  };
}

function Icon({ name }: { name: "back" | "camera" | "check" | "close" | "sparkle" | "upload" }) {
  const paths = {
    back: <><path d="m15 18-6-6 6-6"/><path d="M9 12h10"/></>,
    camera: <><path d="M14.5 4 16 7h3a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2h3l1.5-3h5Z"/><circle cx="12" cy="13" r="3"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    close: <><path d="m6 6 12 12"/><path d="M18 6 6 18"/></>,
    sparkle: <><path d="m12 3 1.3 3.5L17 8l-3.7 1.5L12 13l-1.3-3.5L7 8l3.7-1.5L12 3Z"/><path d="m19 14 .7 1.8 1.8.7-1.8.7L19 19l-.7-1.8-1.8-.7 1.8-.7L19 14Z"/></>,
    upload: <><path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M5 20h14"/></>,
  };
  return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden="true">{paths[name]}</svg>;
}

export function ProfileEditor({
  mode,
  userId,
  email,
  initialProfile,
}: {
  mode: "onboarding" | "edit";
  userId: string;
  email: string;
  initialProfile: MemberProfile | null;
}) {
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(() => initialForm(initialProfile));
  const [photos, setPhotos] = useState<string[]>(() => {
    const profilePhotos = initialProfile?.photo_urls ?? [];
    if (profilePhotos.length) return profilePhotos;
    return initialProfile?.avatar_url ? [initialProfile.avatar_url] : [];
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const languages = normaliseList(form.languagesText);
  const completion = calculateProfileCompletion({
    ...form,
    photo_urls: photos,
    languages,
  });
  const age = calculateAge(form.date_of_birth);
  const maxBirthDate = useMemo(() => {
    const date = new Date();
    date.setFullYear(date.getFullYear() - 18);
    return date.toISOString().slice(0, 10);
  }, []);

  const update = <Key extends keyof FormState>(key: Key, value: FormState[Key]) => {
    setForm((previous) => ({ ...previous, [key]: value }));
  };

  const setLifestyle = (key: keyof LifestylePreferences, value: string) => {
    setForm((previous) => ({
      ...previous,
      lifestyle: { ...previous.lifestyle, [key]: value },
    }));
  };

  const toggleInterest = (interest: string) => {
    setForm((previous) => {
      const selected = previous.interests.includes(interest);
      if (!selected && previous.interests.length >= 8) return previous;
      return {
        ...previous,
        interests: selected
          ? previous.interests.filter((item) => item !== interest)
          : [...previous.interests, interest],
      };
    });
  };

  const validateStep = (currentStep: number) => {
    if (currentStep === 0) {
      if (photos.length < 1) return "Add at least one clear profile photo.";
      if (form.display_name.trim().length < 2) return "Enter your name.";
      if (!form.date_of_birth || age === null || age < 18) return "You must be at least 18 years old.";
      if (!form.gender) return "Choose your gender.";
      if (!form.show_me) return "Choose who you would like to meet.";
      if (!form.country) return "Choose your country.";
      if (!form.state.trim() || !form.city.trim()) return "Add your region and city.";
    }

    if (currentStep === 1) {
      if (form.bio.trim().length < 30) return "Write at least 30 characters about yourself.";
      if (!form.occupation.trim()) return "Add your occupation.";
      if (!form.height_cm || Number(form.height_cm) < 120 || Number(form.height_cm) > 230) return "Enter a valid height between 120 and 230 cm.";
      if (languages.length < 1) return "Add at least one language.";
    }

    if (currentStep === 2) {
      if (!form.relationship_goal) return "Choose your relationship goal.";
      if (form.looking_for.trim().length < 20) return "Tell potential matches what you are looking for.";
      if (form.interests.length < 3) return "Choose at least three interests.";
    }

    return "";
  };

  const nextStep = () => {
    const validationError = validateStep(step);
    if (validationError) {
      setError(validationError);
      return;
    }
    setError("");
    setStep((previous) => Math.min(previous + 1, steps.length - 1));
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const uploadPhotos = async (event: ChangeEvent<HTMLInputElement>) => {
    const selected = Array.from(event.target.files ?? []);
    event.target.value = "";
    if (!selected.length) return;

    const availableSlots = 4 - photos.length;
    if (availableSlots <= 0) {
      setError("You can upload up to four photos.");
      return;
    }

    setError("");
    setUploading(true);

    try {
      const uploadedUrls: string[] = [];

      for (const file of selected.slice(0, availableSlots)) {
        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
          throw new Error("Use JPG, PNG or WebP images only.");
        }
        if (file.size > 5 * 1024 * 1024) {
          throw new Error("Each photo must be smaller than 5MB.");
        }

        const extension = file.name.split(".").pop()?.toLowerCase() || "jpg";
        const path = `${userId}/${crypto.randomUUID()}.${extension}`;
        const { error: uploadError } = await supabase.storage
          .from("profile-photos")
          .upload(path, file, {
            cacheControl: "3600",
            contentType: file.type,
            upsert: false,
          });

        if (uploadError) throw uploadError;

        const { data } = supabase.storage.from("profile-photos").getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }

      setPhotos((previous) => [...previous, ...uploadedUrls].slice(0, 4));
      setSuccess(`${uploadedUrls.length} photo${uploadedUrls.length === 1 ? "" : "s"} uploaded.`);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Photo upload failed.");
    } finally {
      setUploading(false);
    }
  };

  const removePhoto = async (url: string) => {
    setPhotos((previous) => previous.filter((photo) => photo !== url));
    const marker = "/storage/v1/object/public/profile-photos/";
    const index = url.indexOf(marker);
    if (index >= 0) {
      const path = decodeURIComponent(url.slice(index + marker.length));
      await supabase.storage.from("profile-photos").remove([path]);
    }
  };

  const makePrimary = (url: string) => {
    setPhotos((previous) => [url, ...previous.filter((photo) => photo !== url)]);
  };

  const saveProfile = async (complete: boolean) => {
    setError("");
    setSuccess("");

    if (complete) {
      for (let index = 0; index < 3; index += 1) {
        const validationError = validateStep(index);
        if (validationError) {
          setStep(index);
          setError(validationError);
          return;
        }
      }
    }

    setSaving(true);

    try {
      const payload = {
        id: userId,
        email,
        display_name: form.display_name.trim(),
        avatar_url: photos[0] ?? null,
        photo_urls: photos,
        bio: form.bio.trim() || null,
        date_of_birth: form.date_of_birth || null,
        gender: form.gender || null,
        show_me: form.show_me || null,
        city: form.city.trim() || null,
        state: form.state.trim() || null,
        country: form.country,
        tribe: form.tribe.trim() || null,
        occupation: form.occupation.trim() || null,
        education: form.education.trim() || null,
        religion: form.religion || null,
        height_cm: form.height_cm ? Number(form.height_cm) : null,
        languages,
        interests: form.interests,
        looking_for: form.looking_for.trim() || null,
        relationship_goal: form.relationship_goal || null,
        lifestyle: form.lifestyle,
        profile_completion: completion,
        onboarding_completed: complete,
        profile_visibility: "visible",
        is_online: true,
        last_seen: new Date().toISOString(),
      };

      const { error: profileError } = await supabase
        .from("profiles")
        .upsert(payload, { onConflict: "id" });

      if (profileError) throw profileError;

      const { error: metadataError } = await supabase.auth.updateUser({
        data: {
          full_name: payload.display_name,
          avatar_url: payload.avatar_url,
        },
      });

      if (metadataError) throw metadataError;

      if (complete) {
        router.replace("/app");
        router.refresh();
      } else {
        setSuccess("Draft saved securely. You can finish your profile now.");
      }
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Unable to save your profile.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <main className="min-h-screen px-3 py-3 sm:px-6 sm:py-8">
      <section className="mx-auto max-w-5xl overflow-hidden rounded-[32px] border border-white/10 bg-[#0d0f14]/95 shadow-[0_0_100px_rgba(242,201,76,0.12)] backdrop-blur-xl">
        <header className="border-b border-white/[0.07] px-5 py-5 sm:px-8">
          <div className="flex items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              {mode === "edit" && (
                <Link href="/app" className="flex h-10 w-10 items-center justify-center rounded-full border border-white/10 bg-white/[0.04] text-white/70">
                  <Icon name="back" />
                </Link>
              )}
              <div>
                <BrandLogo href="/" size="sm" />
                <h1 className="mt-1 text-2xl font-black sm:text-3xl">
                  {mode === "onboarding" ? "Build your AfroLove profile" : "Edit your profile"}
                </h1>
              </div>
            </div>
            <div className="rounded-2xl border border-[#F2C94C]/20 bg-[#F2C94C]/[0.07] px-3 py-2 text-right">
              <p className="text-lg font-black text-[#F2C94C]">{completion}%</p>
              <p className="text-[8px] font-bold uppercase tracking-wider text-white/35">Complete</p>
            </div>
          </div>
          <div className="mt-5 grid grid-cols-4 gap-2">
            {steps.map((label, index) => (
              <button
                key={label}
                type="button"
                onClick={() => index <= step && setStep(index)}
                className="text-left"
              >
                <span className={`block h-1.5 rounded-full ${index <= step ? "bg-[#F2C94C]" : "bg-white/10"}`} />
                <span className={`mt-2 hidden text-[9px] font-bold sm:block ${index === step ? "text-[#F2C94C]" : "text-white/30"}`}>{label}</span>
              </button>
            ))}
          </div>
        </header>

        <div className="grid lg:grid-cols-[1fr_320px]">
          <div className="min-w-0 p-5 sm:p-8">
            {error && <div className="mb-5 rounded-2xl border border-red-400/20 bg-red-400/[0.08] p-4 text-sm text-red-200">{error}</div>}
            {success && <div className="mb-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/[0.08] p-4 text-sm text-emerald-200">{success}</div>}

            {step === 0 && (
              <div>
                <SectionTitle number="01" title="First impressions matter" text="Add clear recent photos and the basics people need to discover you." />
                <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {photos.map((url, index) => (
                    <div key={url} className="group relative aspect-[3/4] overflow-hidden rounded-[22px] border border-white/10 bg-white/[0.04]">
                      <Image src={url} alt={`Profile photo ${index + 1}`} fill sizes="(max-width: 640px) 45vw, 180px" className="object-cover" />
                      <div className="absolute inset-x-2 bottom-2 flex items-center justify-between gap-1">
                        <button type="button" onClick={() => makePrimary(url)} className={`rounded-full px-2 py-1 text-[8px] font-black backdrop-blur ${index === 0 ? "bg-[#F2C94C] text-black" : "bg-black/55 text-white"}`}>
                          {index === 0 ? "PRIMARY" : "MAKE PRIMARY"}
                        </button>
                        <button type="button" onClick={() => void removePhoto(url)} className="flex h-7 w-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur">
                          <Icon name="close" />
                        </button>
                      </div>
                    </div>
                  ))}
                  {photos.length < 4 && (
                    <button type="button" onClick={() => fileInputRef.current?.click()} disabled={uploading} className="flex aspect-[3/4] flex-col items-center justify-center rounded-[22px] border border-dashed border-[#F2C94C]/35 bg-[#F2C94C]/[0.045] text-center transition hover:bg-[#F2C94C]/[0.08] disabled:opacity-50">
                      <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[#F2C94C] text-black"><Icon name="camera" /></span>
                      <span className="mt-3 text-xs font-black text-[#FFE58C]">{uploading ? "Uploading..." : "Add photo"}</span>
                      <span className="mt-1 px-3 text-[9px] text-white/35">JPG, PNG or WebP · max 5MB</span>
                    </button>
                  )}
                </div>
                <input ref={fileInputRef} type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={uploadPhotos} className="hidden" />

                <div className="mt-7 grid gap-4 sm:grid-cols-2">
                  <Field label="Display name" required><input value={form.display_name} onChange={(event) => update("display_name", event.target.value)} placeholder="How should matches know you?" className="profile-input" /></Field>
                  <Field label="Date of birth" hint={age !== null ? `${age} years old` : "You must be 18+"} required><input type="date" max={maxBirthDate} value={form.date_of_birth} onChange={(event) => update("date_of_birth", event.target.value)} className="profile-input" /></Field>
                  <Field label="I am" required><select value={form.gender} onChange={(event) => update("gender", event.target.value)} className="profile-input"><option value="">Select gender</option><option>Man</option><option>Woman</option><option>Non-binary</option></select></Field>
                  <Field label="Show me" required><select value={form.show_me} onChange={(event) => update("show_me", event.target.value)} className="profile-input"><option value="">Who would you like to meet?</option><option>Men</option><option>Women</option><option>Everyone</option></select></Field>
                  <Field label="Country" required><select value={form.country} onChange={(event) => update("country", event.target.value)} className="profile-input"><option value="">Select country</option>{africanCountries.map((country) => <option key={country}>{country}</option>)}</select></Field>
                  <Field label="State / province / region" required><input value={form.state} onChange={(event) => update("state", event.target.value)} placeholder="Lagos State, Gauteng, Nairobi County..." className="profile-input" /></Field>
                  <Field label="City" required><input value={form.city} onChange={(event) => update("city", event.target.value)} placeholder="Lagos, Accra, Nairobi, Johannesburg..." className="profile-input" /></Field>
                </div>
              </div>
            )}

            {step === 1 && (
              <div>
                <SectionTitle number="02" title="Tell your story" text="A thoughtful profile attracts people who value the same things." />
                <div className="mt-6 space-y-4">
                  <Field label="About me" hint={`${form.bio.length}/500`} required><textarea rows={5} maxLength={500} value={form.bio} onChange={(event) => update("bio", event.target.value)} placeholder="Share your personality, values, passions and what makes you unique..." className="profile-input resize-none" /></Field>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <Field label="Occupation" required><input value={form.occupation} onChange={(event) => update("occupation", event.target.value)} placeholder="Product Designer" className="profile-input" /></Field>
                    <Field label="Education"><input value={form.education} onChange={(event) => update("education", event.target.value)} placeholder="University or qualification" className="profile-input" /></Field>
                    <Field label="Religion"><select value={form.religion} onChange={(event) => update("religion", event.target.value)} className="profile-input"><option value="">Select</option><option>Christian</option><option>Muslim</option><option>Traditional</option><option>Spiritual</option><option>Other</option><option>Prefer not to say</option></select></Field>
                    <Field label="Height (cm)" required><input type="number" min="120" max="230" value={form.height_cm} onChange={(event) => update("height_cm", event.target.value)} placeholder="175" className="profile-input" /></Field>
                    <Field label="Ethnic group / heritage"><input value={form.tribe} onChange={(event) => update("tribe", event.target.value)} placeholder="Igbo, Akan, Kikuyu, Zulu..." className="profile-input" /></Field>
                    <Field label="Languages" hint="Separate with commas" required><input value={form.languagesText} onChange={(event) => update("languagesText", event.target.value)} placeholder="English, French, Swahili..." className="profile-input" /></Field>
                  </div>
                </div>
              </div>
            )}

            {step === 2 && (
              <div>
                <SectionTitle number="03" title="Compatibility that matters" text="Set your intentions and help AfroLove find stronger connections." />
                <div className="mt-6 space-y-5">
                  <Field label="Relationship goal" required><select value={form.relationship_goal} onChange={(event) => update("relationship_goal", event.target.value)} className="profile-input"><option value="">Choose your goal</option>{relationshipOptions.map((option) => <option key={option}>{option}</option>)}</select></Field>
                  <Field label="What I am looking for" hint={`${form.looking_for.length}/400`} required><textarea rows={4} maxLength={400} value={form.looking_for} onChange={(event) => update("looking_for", event.target.value)} placeholder="Describe the values, energy and relationship you hope to build..." className="profile-input resize-none" /></Field>
                  <div>
                    <div className="flex items-center justify-between"><p className="text-xs font-black text-white/70">Interests <span className="text-[#F2C94C]">*</span></p><span className="text-[10px] text-white/35">Choose 3–8</span></div>
                    <div className="mt-3 flex flex-wrap gap-2">{interestOptions.map((interest) => { const selected = form.interests.includes(interest); return <button key={interest} type="button" onClick={() => toggleInterest(interest)} className={`rounded-full border px-3 py-2 text-xs font-bold transition ${selected ? "border-[#F2C94C] bg-[#F2C94C] text-black" : "border-white/10 bg-white/[0.04] text-white/55 hover:border-white/20"}`}>{interest}</button>; })}</div>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <LifestyleSelect label="Drinking" value={form.lifestyle.drinking} options={["Never", "Occasionally", "Socially", "Regularly", "Prefer not to say"]} onChange={(value) => setLifestyle("drinking", value)} />
                    <LifestyleSelect label="Smoking" value={form.lifestyle.smoking} options={["Never", "Occasionally", "Trying to quit", "Regularly", "Prefer not to say"]} onChange={(value) => setLifestyle("smoking", value)} />
                    <LifestyleSelect label="Exercise" value={form.lifestyle.exercise} options={["Daily", "Often", "Sometimes", "Rarely", "Prefer not to say"]} onChange={(value) => setLifestyle("exercise", value)} />
                    <LifestyleSelect label="Children" value={form.lifestyle.children} options={["No children", "I have children", "Prefer not to say"]} onChange={(value) => setLifestyle("children", value)} />
                    <LifestyleSelect label="Want children" value={form.lifestyle.wants_children} options={["Yes", "No", "Open to it", "Not sure", "Prefer not to say"]} onChange={(value) => setLifestyle("wants_children", value)} />
                  </div>
                </div>
              </div>
            )}

            {step === 3 && (
              <div>
                <SectionTitle number="04" title="Your profile is ready" text="Review the preview and publish when everything feels authentic." />
                <div className="mt-6 rounded-[28px] border border-white/10 bg-gradient-to-br from-[#1e1a0e] via-[#15171d] to-[#101217] p-5">
                  <div className="flex items-center gap-4">
                    <div className="relative flex h-24 w-24 shrink-0 items-center justify-center overflow-hidden rounded-[26px] bg-[#F2C94C] text-2xl font-black text-black">
                      {photos[0] ? <Image src={photos[0]} alt={form.display_name} fill sizes="96px" className="object-cover" /> : initialsFromName(form.display_name)}
                    </div>
                    <div className="min-w-0"><h2 className="truncate text-2xl font-black">{form.display_name || "Your name"}{age !== null ? `, ${age}` : ""}</h2><p className="mt-1 text-xs font-bold text-[#F2C94C]">{form.occupation || "Your occupation"} · {[form.city, form.country].filter(Boolean).join(", ") || "Your location"}</p><p className="mt-2 text-xs text-white/40">{form.relationship_goal || "Your relationship goal"}</p></div>
                  </div>
                  <p className="mt-5 text-sm leading-6 text-white/60">{form.bio || "Your story will appear here."}</p>
                  <div className="mt-4 flex flex-wrap gap-2">{form.interests.map((interest) => <span key={interest} className="rounded-full bg-white/[0.06] px-3 py-1.5 text-[10px] font-bold text-white/60">{interest}</span>)}</div>
                </div>
                <div className="mt-5 grid gap-3 sm:grid-cols-3">
                  <ReviewStat label="Profile completion" value={`${completion}%`} />
                  <ReviewStat label="Photos" value={`${photos.length}/4`} />
                  <ReviewStat label="Visibility" value="Ready" />
                </div>
                <div className="mt-5 rounded-2xl border border-emerald-400/15 bg-emerald-400/[0.06] p-4 text-xs leading-5 text-emerald-100/75">
                  By publishing, you confirm that your information and photos are genuine and that you are at least 18 years old.
                </div>
              </div>
            )}

            <div className="mt-8 flex flex-col-reverse gap-3 border-t border-white/[0.07] pt-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex gap-2">
                {step > 0 && <button type="button" onClick={() => { setError(""); setStep((previous) => previous - 1); }} className="rounded-2xl border border-white/10 bg-white/[0.04] px-5 py-3.5 text-sm font-black text-white/65">Back</button>}
                {mode === "onboarding" && step < 3 && <button type="button" disabled={saving} onClick={() => void saveProfile(false)} className="rounded-2xl px-4 py-3.5 text-xs font-black text-white/40 hover:text-white/70">Save draft</button>}
              </div>
              {step < 3 ? (
                <button type="button" onClick={nextStep} className="gold-shine rounded-2xl bg-[#F2C94C] px-7 py-4 text-sm font-black text-black">Continue</button>
              ) : (
                <button type="button" disabled={saving || uploading} onClick={() => void saveProfile(true)} className="gold-shine rounded-2xl bg-[#F2C94C] px-7 py-4 text-sm font-black text-black disabled:opacity-50">{saving ? "Saving securely..." : mode === "onboarding" ? "Publish my profile" : "Save profile changes"}</button>
              )}
            </div>
          </div>

          <aside className="border-t border-white/[0.07] bg-white/[0.018] p-5 lg:border-l lg:border-t-0 lg:p-7">
            <div className="sticky top-6">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#F2C94C] text-black"><Icon name="sparkle" /></span>
              <h2 className="mt-4 text-xl font-black">A profile built for genuine matches</h2>
              <p className="mt-2 text-sm leading-6 text-white/42">Complete profiles are easier to trust and give matching filters better information.</p>
              <div className="mt-6 space-y-3">
                {["Use clear, recent photos", "Write naturally and honestly", "State your relationship goal", "Never share private financial details"].map((tip) => <div key={tip} className="flex gap-3 rounded-2xl border border-white/[0.06] bg-white/[0.025] p-3"><span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-emerald-400/10 text-emerald-300"><Icon name="check" /></span><p className="text-xs leading-5 text-white/55">{tip}</p></div>)}
              </div>
              <div className="mt-6 overflow-hidden rounded-2xl bg-white/5"><div className="h-2 bg-white/5"><div className="h-full rounded-full bg-gradient-to-r from-[#F2C94C] to-[#FFE58C] transition-all" style={{ width: `${completion}%` }} /></div><div className="p-4"><div className="flex justify-between text-xs"><span className="font-bold text-white/55">Profile strength</span><span className="font-black text-[#F2C94C]">{completion}%</span></div></div></div>
              <div className="mt-5 flex items-center gap-2 text-[10px] text-white/28"><Icon name="upload" /> Photos are stored securely with Supabase Storage.</div>
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
}

function SectionTitle({ number, title, text }: { number: string; title: string; text: string }) {
  return <div><p className="text-[10px] font-black tracking-[0.28em] text-[#F2C94C]">STEP {number}</p><h2 className="mt-2 text-3xl font-black tracking-tight">{title}</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-white/42">{text}</p></div>;
}

function Field({ label, hint, required, children }: { label: string; hint?: string; required?: boolean; children: React.ReactNode }) {
  return <label className="block"><span className="mb-2 flex items-center justify-between gap-3 text-xs font-black text-white/65"><span>{label} {required && <span className="text-[#F2C94C]">*</span>}</span>{hint && <span className="text-[9px] font-semibold text-white/28">{hint}</span>}</span>{children}</label>;
}

function LifestyleSelect({ label, value, options, onChange }: { label: string; value: string; options: string[]; onChange: (value: string) => void }) {
  return <Field label={label}><select value={value} onChange={(event) => onChange(event.target.value)} className="profile-input">{options.map((option) => <option key={option}>{option}</option>)}</select></Field>;
}

function ReviewStat({ label, value }: { label: string; value: string }) {
  return <div className="rounded-2xl border border-white/[0.07] bg-white/[0.035] p-4"><p className="text-xl font-black text-[#F2C94C]">{value}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-wider text-white/30">{label}</p></div>;
}
