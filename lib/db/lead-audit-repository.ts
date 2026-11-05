import type { SupabaseClient } from "@supabase/supabase-js"

export type LeadAuditAction =
  | "created"
  | "updated"
  | "soft_deleted"
  | "restored"
  | "hard_deleted"

export type LeadAuditSource = "api" | "webhook" | "import" | "meta" | "system"

export type LeadAuditContext = {
  actorUserId?: string | null
  actorRole?: string | null
  source?: LeadAuditSource
  metadata?: Record<string, unknown>
}

/** Best-effort audit row; never throws into the caller's transaction path. */
export async function recordLeadAuditEvent(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string | null,
  action: LeadAuditAction,
  context: LeadAuditContext = {}
): Promise<void> {
  try {
    const { error } = await supabase.from("lead_audit_events").insert({
      organization_id: organizationId,
      lead_id: leadId,
      action,
      actor_user_id: context.actorUserId ?? null,
      actor_role: context.actorRole ?? null,
      source: context.source ?? "api",
      metadata: context.metadata ?? {},
    })
    if (error) console.error("recordLeadAuditEvent failed:", error.message)
  } catch (err) {
    console.error("recordLeadAuditEvent failed:", err)
  }
}
