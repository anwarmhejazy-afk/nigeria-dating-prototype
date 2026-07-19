export type LifestylePreferences = {
  drinking: string;
  smoking: string;
  exercise: string;
  children: string;
  wants_children: string;
};

export type MemberProfile = {
  id: string;
  email: string | null;
  display_name: string;
  avatar_url: string | null;
  photo_urls: string[];
  bio: string | null;
  date_of_birth: string | null;
  gender: string | null;
  show_me: string | null;
  city: string | null;
  state: string | null;
  country: string;
  tribe: string | null;
  occupation: string | null;
  education: string | null;
  religion: string | null;
  height_cm: number | null;
  languages: string[];
  interests: string[];
  looking_for: string | null;
  relationship_goal: string | null;
  lifestyle: LifestylePreferences;
  profile_completion: number;
  onboarding_completed: boolean;
  is_verified: boolean;
  is_online: boolean;
};

const defaultLifestyle: LifestylePreferences = {
  drinking: "Prefer not to say",
  smoking: "Prefer not to say",
  exercise: "Prefer not to say",
  children: "Prefer not to say",
  wants_children: "Prefer not to say",
};

function stringValue(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableString(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function stringArray(value: unknown) {
  return Array.isArray(value)
    ? value.filter((item): item is string => typeof item === "string")
    : [];
}

export function toMemberProfile(row: Record<string, unknown>): MemberProfile {
  const lifestyleValue =
    row.lifestyle && typeof row.lifestyle === "object" && !Array.isArray(row.lifestyle)
      ? (row.lifestyle as Record<string, unknown>)
      : {};

  return {
    id: stringValue(row.id),
    email: nullableString(row.email),
    display_name: stringValue(row.display_name, "NAIJA MATCH Member"),
    avatar_url: nullableString(row.avatar_url),
    photo_urls: stringArray(row.photo_urls),
    bio: nullableString(row.bio),
    date_of_birth: nullableString(row.date_of_birth),
    gender: nullableString(row.gender),
    show_me: nullableString(row.show_me),
    city: nullableString(row.city),
    state: nullableString(row.state),
    country: stringValue(row.country, "Nigeria"),
    tribe: nullableString(row.tribe),
    occupation: nullableString(row.occupation),
    education: nullableString(row.education),
    religion: nullableString(row.religion),
    height_cm: typeof row.height_cm === "number" ? row.height_cm : null,
    languages: stringArray(row.languages),
    interests: stringArray(row.interests),
    looking_for: nullableString(row.looking_for),
    relationship_goal: nullableString(row.relationship_goal),
    lifestyle: {
      drinking: stringValue(lifestyleValue.drinking, defaultLifestyle.drinking),
      smoking: stringValue(lifestyleValue.smoking, defaultLifestyle.smoking),
      exercise: stringValue(lifestyleValue.exercise, defaultLifestyle.exercise),
      children: stringValue(lifestyleValue.children, defaultLifestyle.children),
      wants_children: stringValue(
        lifestyleValue.wants_children,
        defaultLifestyle.wants_children,
      ),
    },
    profile_completion:
      typeof row.profile_completion === "number" ? row.profile_completion : 0,
    onboarding_completed: Boolean(row.onboarding_completed),
    is_verified: Boolean(row.is_verified),
    is_online: Boolean(row.is_online),
  };
}

export function calculateAge(dateOfBirth: string | null) {
  if (!dateOfBirth) return null;
  const birthday = new Date(`${dateOfBirth}T00:00:00`);
  if (Number.isNaN(birthday.getTime())) return null;

  const today = new Date();
  let age = today.getFullYear() - birthday.getFullYear();
  const monthDifference = today.getMonth() - birthday.getMonth();

  if (
    monthDifference < 0 ||
    (monthDifference === 0 && today.getDate() < birthday.getDate())
  ) {
    age -= 1;
  }

  return age;
}

export function initialsFromName(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "NM";
  return parts.slice(0, 2).map((part) => part[0]?.toUpperCase()).join("");
}

export function normaliseList(value: string) {
  return Array.from(
    new Set(
      value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  ).slice(0, 10);
}

export function calculateProfileCompletion(profile: {
  display_name: string;
  date_of_birth: string;
  gender: string;
  show_me: string;
  city: string;
  state: string;
  photo_urls: string[];
  bio: string;
  occupation: string;
  education: string;
  religion: string;
  height_cm: string;
  languages: string[];
  interests: string[];
  looking_for: string;
  relationship_goal: string;
  tribe: string;
  lifestyle: LifestylePreferences;
}) {
  const checks = [
    profile.display_name.trim().length >= 2,
    Boolean(profile.date_of_birth),
    Boolean(profile.gender),
    Boolean(profile.show_me),
    Boolean(profile.city),
    Boolean(profile.state),
    profile.photo_urls.length >= 1,
    profile.bio.trim().length >= 30,
    Boolean(profile.occupation),
    Boolean(profile.education),
    Boolean(profile.religion),
    Boolean(profile.height_cm),
    profile.languages.length >= 1,
    profile.interests.length >= 3,
    profile.looking_for.trim().length >= 20,
    Boolean(profile.relationship_goal),
    Boolean(profile.tribe),
    profile.lifestyle.drinking !== "Prefer not to say",
    profile.lifestyle.smoking !== "Prefer not to say",
    profile.lifestyle.exercise !== "Prefer not to say",
  ];

  return Math.round((checks.filter(Boolean).length / checks.length) * 100);
}
