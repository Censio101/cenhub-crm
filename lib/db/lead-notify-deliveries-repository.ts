import type { SupabaseClient } from "@supabase/supabase-js"

export const LEAD_NOTIFY_DELIVERY_RETENTION_DAYS = 7
export const LEAD_NOTIFY_DELIVERY_PAGE_SIZE = 10

export type LeadNotifyDeliveryStatus = "sent" | "skipped" | "failed"

export type LeadNotifySkipReason =
  | "notify_disabled"
  | "funnel_not_selected"
  | "no_recipients"
  | "mailgun_missing"
  | "no_sheet"
  | "duplicate_lead"
  | "stepped_form_disabled"
  | "step_merge"

export type LeadNotifyDeliveryRow = {
  id: string
  organization_id: string
  lead_id: string | null
  funnel_id: string | null
  funnel_name: string | null
  lead_name: string
  recipients: string[]
  status: LeadNotifyDeliveryStatus
  skip_reason: LeadNotifySkipReason | null
  error_message: string | null
  mailgun_message_id: string | null
  created_at: string
}

export type RecordLeadNotifyDeliveryInput = {
  organizationId: string
  leadId?: string | null
  funnelId?: string | null
  funnelName?: string | null
  leadName?: string
  recipients?: readonly string[]
  status: LeadNotifyDeliveryStatus
  skipReason?: LeadNotifySkipReason | null
  errorMessage?: string | null
  mailgunMessageId?: string | null
}

export type LeadNotifyDeliveryPage = {
  deliveries: LeadNotifyDeliveryRow[]
  page: number
  pageSize: number
  total: number
  totalPages: number
}

function parseRecipients(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === "string")
}

function truncateError(message: string | null | undefined, max = 500): string | null {
  if (!message?.trim()) return null
  const trimmed = message.trim()
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed
}

export function leadNotifyRetentionCutoff(now = new Date()): string {
  const cutoff = new Date(now.getTime() - LEAD_NOTIFY_DELIVERY_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  return cutoff.toISOString()
}

function mapDeliveryRow(row: Record<string, unknown>): LeadNotifyDeliveryRow {
  return {
    id: row.id as string,
    organization_id: row.organization_id as string,
    lead_id: (row.lead_id as string | null) ?? null,
    funnel_id: (row.funnel_id as string | null) ?? null,
    funnel_name: (row.funnel_name as string | null) ?? null,
    lead_name: (row.lead_name as string) ?? "",
    recipients: parseRecipients(row.recipients),
    status: row.status as LeadNotifyDeliveryStatus,
    skip_reason: (row.skip_reason as LeadNotifySkipReason | null) ?? null,
    error_message: (row.error_message as string | null) ?? null,
    mailgun_message_id: (row.mailgun_message_id as string | null) ?? null,
    created_at: row.created_at as string,
  }
}

const DELIVERY_COLUMNS =
  "id, organization_id, lead_id, funnel_id, funnel_name, lead_name, recipients, status, skip_reason, error_message, mailgun_message_id, created_at"

/** Best-effort insert; drops rows older than {@link LEAD_NOTIFY_DELIVERY_RETENTION_DAYS}. */
export async function recordLeadNotifyDelivery(
  supabase: SupabaseClient,
  input: RecordLeadNotifyDeliveryInput
): Promise<void> {
  try {
    const row = {
      organization_id: input.organizationId,
      lead_id: input.leadId ?? null,
      funnel_id: input.funnelId ?? null,
      funnel_name: input.funnelName?.trim() || null,
      lead_name: input.leadName?.trim() || "",
      recipients: input.recipients ?? [],
      status: input.status,
      skip_reason: input.skipReason ?? null,
      error_message: truncateError(input.errorMessage),
      mailgun_message_id: input.mailgunMessageId?.trim() || null,
    }

    const { error: insertError } = await supabase
      .from("organization_lead_notify_deliveries")
      .insert(row)

    if (insertError) {
      console.error("recordLeadNotifyDelivery insert failed:", insertError.message)
      return
    }

    const { error: deleteError } = await supabase
      .from("organization_lead_notify_deliveries")
      .delete()
      .eq("organization_id", input.organizationId)
      .lt("created_at", leadNotifyRetentionCutoff())

    if (deleteError) {
      console.error("recordLeadNotifyDelivery trim delete failed:", deleteError.message)
    }
  } catch (err) {
    console.error("recordLeadNotifyDelivery failed:", err)
  }
}

export async function listRecentLeadNotifyDeliveries(
  supabase: SupabaseClient,
  organizationId: string,
  options: { page?: number; pageSize?: number } = {}
): Promise<LeadNotifyDeliveryPage> {
  const pageSize = Math.min(
    50,
    Math.max(1, options.pageSize ?? LEAD_NOTIFY_DELIVERY_PAGE_SIZE)
  )
  const page = Math.max(1, options.page ?? 1)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1
  const since = leadNotifyRetentionCutoff()

  const { data, error, count } = await supabase
    .from("organization_lead_notify_deliveries")
    .select(DELIVERY_COLUMNS, { count: "exact" })
    .eq("organization_id", organizationId)
    .gte("created_at", since)
    .order("created_at", { ascending: false })
    .range(from, to)

  if (error) throw error

  const total = count ?? 0
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  return {
    deliveries: (data ?? []).map((row) => mapDeliveryRow(row as Record<string, unknown>)),
    page: Math.min(page, totalPages),
    pageSize,
    total,
    totalPages,
  }
}
