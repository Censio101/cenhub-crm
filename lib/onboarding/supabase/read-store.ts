import type {
  AuditLog,
  AuthSession,
  AuthUser,
  CommercialLine,
  CustomerContact,
  CustomerDocument,
  FixedExpense,
  Invite,
  Membership,
  Offer,
  OfferEngagement,
  StoreData,
  Workspace,
  WorkspaceStatus,
} from "@/lib/onboarding/types"
import { getSupabaseAdmin } from "@/lib/onboarding/supabase/client"

function iso(value: string | null | undefined): string {
  if (!value) return ""
  return value.includes("T") ? value : `${value}T00:00:00.000Z`
}

export async function readStoreFromSupabase(): Promise<StoreData> {
  const supabase = getSupabaseAdmin()
  const [
    workspacesRes,
    usersRes,
    membershipsRes,
    invitesRes,
    sessionsRes,
    commercialRes,
    expensesRes,
    contactsRes,
    documentsRes,
    auditRes,
    offersRes,
    engagementRes,
  ] = await Promise.all([
    supabase.from("ci_workspaces").select("*"),
    supabase.from("ci_users").select("*"),
    supabase.from("ci_memberships").select("*"),
    supabase.from("ci_invites").select("*"),
    supabase.from("ci_sessions").select("*"),
    supabase.from("ci_commercial_lines").select("*"),
    supabase.from("ci_fixed_expenses").select("*"),
    supabase.from("ci_customer_contacts").select("*"),
    supabase.from("ci_customer_documents").select("*"),
    supabase.from("ci_audit_logs").select("*"),
    supabase.from("ci_offers").select("*"),
    supabase.from("ci_offer_engagement").select("*"),
  ])

  const errors = [
    workspacesRes.error,
    usersRes.error,
    membershipsRes.error,
    invitesRes.error,
    sessionsRes.error,
    commercialRes.error,
    expensesRes.error,
    contactsRes.error,
    documentsRes.error,
    auditRes.error,
    offersRes.error,
    engagementRes.error,
  ].filter(Boolean)
  if (errors.length > 0) {
    throw new Error(errors.map((item) => item?.message).join("; "))
  }

  const workspaces: Workspace[] = (workspacesRes.data ?? []).map((row) => ({
    id: row.id,
    name: row.name,
    email: row.email,
    logo: row.logo ?? "",
    profileImage: row.profile_image ?? "",
    enabledServiceIds: (row.enabled_service_ids as string[]) ?? [],
    customServices: (row.custom_services as Workspace["customServices"]) ?? [],
    hvidbjergPartner: Boolean(row.hvidbjerg_partner),
    status: row.status as WorkspaceStatus,
    useDemoData: Boolean(row.use_demo_data),
    createdAt: iso(row.created_at),
    provisionedAt: row.provisioned_at ? iso(row.provisioned_at) : null,
  }))

  const users: AuthUser[] = (usersRes.data ?? []).map((row) => ({
    id: row.id,
    email: row.email,
    name: row.name,
    username: row.username,
    title: row.title ?? "",
    profileImage: row.profile_image ?? "",
    headAdmin: Boolean(row.head_admin),
    censioStaffRole:
      row.censio_staff_role === "medarbejder"
        ? "medarbejder"
        : row.censio_staff_role === "admin"
          ? "admin"
          : undefined,
    passwordHash: row.password_hash,
    globalRole: row.global_role as AuthUser["globalRole"],
    createdAt: iso(row.created_at),
  }))

  const memberships: Membership[] = (membershipsRes.data ?? []).map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    role: row.role as Membership["role"],
    status: row.status as Membership["status"],
  }))

  const invites: Invite[] = (invitesRes.data ?? []).map((row) => ({
    id: row.id,
    token: row.token,
    workspaceId: row.workspace_id,
    userId: row.user_id,
    email: row.email,
    name: row.name,
    role: row.role as Invite["role"],
    kind: row.kind as Invite["kind"],
    expiresAt: iso(row.expires_at),
    usedAt: row.used_at ? iso(row.used_at) : null,
    lastSentAt: row.last_sent_at ? iso(row.last_sent_at) : null,
    lastInviteUrl: row.last_invite_url ?? "",
    mailSent: Boolean(row.mail_sent),
  }))

  const sessions: AuthSession[] = (sessionsRes.data ?? []).map((row) => ({
    id: row.id,
    userId: row.user_id,
    workspaceId: row.workspace_id,
    expiresAt: iso(row.expires_at),
  }))

  const commercialLines: CommercialLine[] = (commercialRes.data ?? []).map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    category: row.category as CommercialLine["category"],
    name: row.name,
    amount: Number(row.amount),
    cadence: row.cadence as CommercialLine["cadence"],
    startsOn: String(row.starts_on).slice(0, 10),
    endsOn: row.ends_on ? String(row.ends_on).slice(0, 10) : null,
    note: row.note ?? "",
    billingPeriods: (row.billing_periods as CommercialLine["billingPeriods"]) ?? [],
  }))

  const fixedExpenses: FixedExpense[] = (expensesRes.data ?? []).map((row) => ({
    id: row.id,
    type: row.type as FixedExpense["type"],
    name: row.name,
    amount: Number(row.amount),
    startsOn: String(row.starts_on).slice(0, 10),
    endsOn: row.ends_on ? String(row.ends_on).slice(0, 10) : null,
    pricePeriods: (row.price_periods as FixedExpense["pricePeriods"]) ?? [],
    note: row.note ?? "",
    url: row.url ?? "",
  }))

  const customerContacts: CustomerContact[] = (contactsRes.data ?? []).map((row) => ({
    workspaceId: row.workspace_id,
    website: row.website ?? "",
    cvr: row.cvr ?? "",
    phone: row.phone ?? "",
    subEmail: row.sub_email ?? "",
    contactName: row.contact_name ?? "",
    people: (row.people as CustomerContact["people"]) ?? [],
  }))

  const customerDocuments: CustomerDocument[] = (documentsRes.data ?? []).map((row) => ({
    id: row.id,
    workspaceId: row.workspace_id,
    fileName: row.file_name,
    storedName: row.stored_name,
    uploadedAt: iso(row.uploaded_at),
    size: row.size_bytes,
    name: row.name ?? "",
    note: row.note ?? "",
  }))

  const auditLogs: AuditLog[] = (auditRes.data ?? []).map((row) => ({
    id: row.id,
    at: iso(row.at),
    userId: row.user_id,
    userName: row.user_name,
    action: row.action,
    target: row.target,
    change: row.change,
  }))

  const offers: Offer[] = (offersRes.data ?? []).map((row) => ({
    id: row.id,
    slug: row.slug,
    status: row.status as Offer["status"],
    workspaceId: row.workspace_id,
    companyName: row.company_name,
    contactName: row.contact_name,
    email: row.email,
    phone: row.phone ?? "",
    cvr: row.cvr ?? "",
    packages: (row.packages as Offer["packages"]) ?? [],
    publicPackageView: row.public_package_view as Offer["publicPackageView"],
    services: (row.services as Offer["services"]) ?? [],
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    sentAt: row.sent_at ? iso(row.sent_at) : null,
    acceptedAt: row.accepted_at ? iso(row.accepted_at) : null,
    acceptedVia: (row.accepted_via as Offer["acceptedVia"]) ?? null,
    signatureName: row.signature_name,
  }))

  const offerEngagement: OfferEngagement[] = (engagementRes.data ?? []).map((row) => ({
    id: row.id,
    offerId: row.offer_id,
    slug: row.slug,
    startedAt: iso(row.started_at),
    endedAt: row.ended_at ? iso(row.ended_at) : null,
    opened: Boolean(row.opened),
    maxScrollPct: Number(row.max_scroll_pct),
    durationSec: Number(row.duration_sec),
  }))

  return {
    workspaces,
    users,
    memberships,
    invites,
    sessions,
    commercialLines,
    fixedExpenses,
    customerContacts,
    customerDocuments,
    auditLogs,
    offers,
    offerEngagement,
  }
}
