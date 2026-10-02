import { isFunnelListening } from "@/lib/db/lead-funnels-repository"
import type { LeadFunnelRow } from "@/lib/db/types"

/** What the Funnels page needs about one webhook. The sample itself is loaded separately. */
export function serializeFunnel(row: LeadFunnelRow) {
  const listening = isFunnelListening(row)
  return {
    id: row.id,
    name: row.name,
    slug: row.slug,
    platform: row.platform,
    enabled: row.enabled,
    dataFormat: row.data_format,
    fieldMapping: row.field_mapping ?? {},
    webhookSecret: row.webhook_secret,
    hasSample: row.sample_payload !== null,
    sampleReceivedAt: row.sample_received_at,
    /** Seconds left of the listening window, or null when not listening. */
    listeningSeconds: listening
      ? Math.max(
          0,
          Math.ceil((new Date(row.sample_listening_until as string).getTime() - Date.now()) / 1000)
        )
      : null,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  }
}

/** The sample state the sample step polls. */
export function serializeSample(row: LeadFunnelRow) {
  const dto = serializeFunnel(row)
  return {
    listeningSeconds: dto.listeningSeconds,
    receivedAt: row.sample_received_at,
    error: row.sample_error,
    sample: row.sample_payload,
  }
}
