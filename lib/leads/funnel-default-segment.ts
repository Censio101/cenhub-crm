import type { LeadFunnelRow } from "@/lib/db/types"
import { isLeadSegmentId, type Lead } from "@/lib/leads"

/** Applies the webhook funnel default when the payload did not set segment. */
export function applyFunnelDefaultSegment(lead: Lead, funnel: LeadFunnelRow): Lead {
  if (lead.segment) return lead
  const fallback = funnel.default_segment
  if (!fallback || !isLeadSegmentId(fallback)) return lead
  return { ...lead, segment: fallback }
}
