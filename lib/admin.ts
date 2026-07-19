import type { SupabaseClient } from "@supabase/supabase-js";

export type AdminProfile = {
  id: string;
  email: string | null;
  displayName: string;
  avatarUrl: string | null;
  country: string;
  city: string;
  accountStatus: string;
  isVerified: boolean;
  onboardingCompleted: boolean;
  messagingRestrictedUntil: string | null;
  suspendedUntil: string | null;
  moderationNote: string | null;
  createdAt: string;
};

export type ReportEvidenceItem = {
  id: string;
  messageId: string | null;
  senderId: string | null;
  senderDisplayName: string;
  body: string | null;
  messageType: string;
  mediaUrl: string | null;
  messageCreatedAt: string | null;
};

export type SafetyReport = {
  id: string;
  reporterId: string;
  reportedId: string;
  matchId: string | null;
  category: string;
  details: string | null;
  status: string;
  evidenceScope: string;
  priority: string;
  resolution: string | null;
  adminAction: string | null;
  reporterBlocked: boolean;
  reporterUnmatched: boolean;
  createdAt: string;
  reviewedAt: string | null;
  reporter: AdminProfile | null;
  reported: AdminProfile | null;
  evidence: ReportEvidenceItem[];
};

export type VerificationRequest = {
  id: string;
  userId: string;
  status: string;
  memberNote: string | null;
  adminNote: string | null;
  createdAt: string;
  reviewedAt: string | null;
  member: AdminProfile | null;
};

export type AuditEntry = {
  id: string;
  adminId: string | null;
  action: string;
  targetUserId: string | null;
  reportId: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
  adminName: string;
  targetName: string;
};

export type AdminDashboardData = {
  metrics: {
    members: number;
    activeMembers: number;
    openReports: number;
    urgentReports: number;
    pendingVerifications: number;
    activeMatches: number;
    messages: number;
    countries: number;
  };
  members: AdminProfile[];
  reports: SafetyReport[];
  verificationRequests: VerificationRequest[];
  audit: AuditEntry[];
};

type Row = Record<string, unknown>;

function text(value: unknown, fallback = "") {
  return typeof value === "string" ? value : fallback;
}

function nullableText(value: unknown) {
  return typeof value === "string" && value.trim() ? value : null;
}

function bool(value: unknown) {
  return Boolean(value);
}

function toAdminProfile(row: Row | undefined): AdminProfile | null {
  if (!row) return null;
  return {
    id: text(row.id),
    email: nullableText(row.email),
    displayName: text(row.display_name, "AfroLove member"),
    avatarUrl: nullableText(row.avatar_url),
    country: text(row.country, "Africa"),
    city: text(row.city),
    accountStatus: text(row.account_status, "active"),
    isVerified: bool(row.is_verified),
    onboardingCompleted: bool(row.onboarding_completed),
    messagingRestrictedUntil: nullableText(row.messaging_restricted_until),
    suspendedUntil: nullableText(row.suspended_until),
    moderationNote: nullableText(row.moderation_note),
    createdAt: text(row.created_at),
  };
}

export async function isAdmin(supabase: SupabaseClient) {
  const { data, error } = await supabase.rpc("is_afrolove_admin");
  return !error && Boolean(data);
}

export async function loadAdminDashboard(
  supabase: SupabaseClient,
): Promise<AdminDashboardData> {
  const [
    profilesResult,
    reportsResult,
    evidenceResult,
    verificationResult,
    auditResult,
    metricsResult,
  ] = await Promise.all([
    supabase
      .from("profiles")
      .select(
        "id,email,display_name,avatar_url,country,city,account_status,is_verified,onboarding_completed,messaging_restricted_until,suspended_until,moderation_note,created_at",
      )
      .order("created_at", { ascending: false })
      .limit(200),
    supabase
      .from("reports")
      .select(
        "id,reporter_id,reported_id,match_id,category,details,status,evidence_scope,priority,resolution,admin_action,reporter_blocked,reporter_unmatched,created_at,reviewed_at",
      )
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("report_evidence")
      .select(
        "id,report_id,message_id,sender_id,sender_display_name,body,message_type,media_url,message_created_at",
      )
      .order("message_created_at", { ascending: true })
      .limit(3000),
    supabase
      .from("verification_requests")
      .select("id,user_id,status,member_note,admin_note,created_at,reviewed_at")
      .order("created_at", { ascending: false })
      .limit(150),
    supabase
      .from("admin_audit_logs")
      .select("id,admin_id,action,target_user_id,report_id,metadata,created_at")
      .order("created_at", { ascending: false })
      .limit(150),
    supabase.rpc("admin_platform_metrics"),
  ]);

  const profiles = ((profilesResult.data || []) as Row[])
    .map((row) => toAdminProfile(row))
    .filter((profile): profile is AdminProfile => Boolean(profile));
  const profileMap = new Map(profiles.map((profile) => [profile.id, profile]));

  const evidenceMap = new Map<string, ReportEvidenceItem[]>();
  for (const row of (evidenceResult.data || []) as Row[]) {
    const reportId = text(row.report_id);
    const items = evidenceMap.get(reportId) || [];
    items.push({
      id: text(row.id),
      messageId: nullableText(row.message_id),
      senderId: nullableText(row.sender_id),
      senderDisplayName: text(row.sender_display_name, "AfroLove member"),
      body: nullableText(row.body),
      messageType: text(row.message_type, "text"),
      mediaUrl: nullableText(row.media_url),
      messageCreatedAt: nullableText(row.message_created_at),
    });
    evidenceMap.set(reportId, items);
  }

  const reports = ((reportsResult.data || []) as Row[]).map((row) => ({
    id: text(row.id),
    reporterId: text(row.reporter_id),
    reportedId: text(row.reported_id),
    matchId: nullableText(row.match_id),
    category: text(row.category),
    details: nullableText(row.details),
    status: text(row.status, "open"),
    evidenceScope: text(row.evidence_scope, "profile"),
    priority: text(row.priority, "normal"),
    resolution: nullableText(row.resolution),
    adminAction: nullableText(row.admin_action),
    reporterBlocked: bool(row.reporter_blocked),
    reporterUnmatched: bool(row.reporter_unmatched),
    createdAt: text(row.created_at),
    reviewedAt: nullableText(row.reviewed_at),
    reporter: profileMap.get(text(row.reporter_id)) || null,
    reported: profileMap.get(text(row.reported_id)) || null,
    evidence: evidenceMap.get(text(row.id)) || [],
  }));

  const verificationRequests = ((verificationResult.data || []) as Row[]).map((row) => ({
    id: text(row.id),
    userId: text(row.user_id),
    status: text(row.status, "pending"),
    memberNote: nullableText(row.member_note),
    adminNote: nullableText(row.admin_note),
    createdAt: text(row.created_at),
    reviewedAt: nullableText(row.reviewed_at),
    member: profileMap.get(text(row.user_id)) || null,
  }));

  const audit = ((auditResult.data || []) as Row[]).map((row) => ({
    id: text(row.id),
    adminId: nullableText(row.admin_id),
    action: text(row.action),
    targetUserId: nullableText(row.target_user_id),
    reportId: nullableText(row.report_id),
    metadata:
      row.metadata && typeof row.metadata === "object" && !Array.isArray(row.metadata)
        ? (row.metadata as Record<string, unknown>)
        : {},
    createdAt: text(row.created_at),
    adminName: profileMap.get(text(row.admin_id))?.displayName || "System / member",
    targetName: profileMap.get(text(row.target_user_id))?.displayName || "—",
  }));

  const countrySet = new Set(profiles.map((profile) => profile.country).filter(Boolean));

  return {
    metrics: {
      members: profiles.length,
      activeMembers: profiles.filter((profile) =>
        ["active", "warned", "restricted"].includes(profile.accountStatus),
      ).length,
      openReports: reports.filter((report) => ["open", "reviewing"].includes(report.status)).length,
      urgentReports: reports.filter(
        (report) => report.priority === "urgent" && ["open", "reviewing"].includes(report.status),
      ).length,
      pendingVerifications: verificationRequests.filter((request) =>
        ["pending", "reviewing"].includes(request.status),
      ).length,
      activeMatches:
        metricsResult.data && typeof metricsResult.data === "object"
          ? Number((metricsResult.data as Record<string, unknown>).active_matches || 0)
          : 0,
      messages:
        metricsResult.data && typeof metricsResult.data === "object"
          ? Number((metricsResult.data as Record<string, unknown>).messages || 0)
          : 0,
      countries: countrySet.size,
    },
    members: profiles,
    reports,
    verificationRequests,
    audit,
  };
}
