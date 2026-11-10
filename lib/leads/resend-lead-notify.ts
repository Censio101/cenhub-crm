import type { SupabaseClient } from "@supabase/supabase-js"

import { getLeadFunnelById } from "@/lib/db/lead-funnels-repository"
import { getLeadById } from "@/lib/db/leads-repository"
import { getOrganizationById } from "@/lib/db/organizations-repository"
import { notifyNewLeadFromFunnelWebhook } from "@/lib/leads/notify-new-lead"

export async function resendLeadNotificationEmail(
  supabase: SupabaseClient,
  organizationId: string,
  leadId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const lead = await getLeadById(supabase, organizationId, leadId)
  if (!lead) return { ok: false, error: "Lead not found" }

  const funnelId = lead.leadFunnelId
  if (!funnelId) {
    return { ok: false, error: "This lead was not created from a webhook" }
  }

  const funnel = await getLeadFunnelById(supabase, funnelId)
  if (!funnel || funnel.organization_id !== organizationId) {
    return { ok: false, error: "Webhook not found for this lead" }
  }

  const org = await getOrganizationById(supabase, organizationId)
  if (!org) return { ok: false, error: "Organization not found" }

  await notifyNewLeadFromFunnelWebhook(supabase, {
    organizationId,
    primaryContactEmail: org.primary_contact_email ?? null,
    funnelId: funnel.id,
    funnelName: funnel.name,
    lead,
  })

  return { ok: true }
}
