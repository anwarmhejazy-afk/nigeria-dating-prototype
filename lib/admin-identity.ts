const ADMIN_NAMES: Record<string, string> = {
  "anwar_hejazy@hotmail.com": "Anwar Hegazy",
  "ungwadaemmanuel19@gmail.com": "Emmanuel Ungwada",
};

export function getAdminDisplayName(
  email: string | null | undefined,
) {
  const normalizedEmail = email?.trim().toLowerCase() || "";

  return ADMIN_NAMES[normalizedEmail] || "AfroLove Administrator";
}
