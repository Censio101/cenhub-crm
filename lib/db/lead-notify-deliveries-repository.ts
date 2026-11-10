import type { SupabaseClient } from "@supabase/supabase-js"

export const LEAD_NOTIFY_DELIVERY_RETENTION = 20

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

function parseRecipients(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value.filter((entry): entry is string => typeof entry === "string")
}

function truncateError(message: string | null | undefined, max = 500): string | null {
  if (!message?.trim()) return null
  const trimmed = message.trim()
  return trimmed.length > max ? `${trimmed.slice(0, max)}…` : trimmed
}

/** Best-effort insert; trims org history to {@link LEAD_NOTIFY_DELIVERY_RETENTION}. */
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

    const { data: orderedRows, error: listError } = await supabase
      .from("organization_lead_notify_deliveries")
      .select("id")
      .eq("organization_id", input.organizationId)
      .order("created_at", { ascending: false })

    if (listError) {
      console.error("recordLeadNotifyDelivery trim list failed:", listError.message)
      return
    }

    const staleIds = (orderedRows ?? [])
      .slice(LEAD_NOTIFY_DELIVERY_RETENTION)
      .map((r) => r.id as string)
    if (staleIds.length === 0) return

    const { error: deleteError } = await supabase
      .from("organization_lead_notify_deliveries")
      .delete()
      .in("id", staleIds)

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
  limit = LEAD_NOTIFY_DELIVERY_RETENTION
): Promise<LeadNotifyDeliveryRow[]> {
  const { data, error } = await supabase
    .from("organization_lead_notify_deliveries")
    .select(
      "id, organization_id, lead_id, funnel_id, funnel_name, lead_name, recipients, status, skip_reason, error_message, mailgun_message_id, created_at"
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error

  return (data ?? []).map((row) => ({
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
  }))
}
