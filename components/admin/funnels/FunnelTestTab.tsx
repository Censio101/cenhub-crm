"use client"

import { useMemo } from "react"

import { FunnelTestPanel } from "@/components/admin/funnels/FunnelTestPanel"
import type { FunnelFormat } from "@/components/admin/funnels/FunnelFieldsTab"
import type { FunnelDto } from "@/components/admin/funnels/types"
import { buildExamplePayload, type WebhookCustomFieldSpec } from "@/lib/lead-sheet/webhook-spec"
import { CANONICAL_INBOUND_EXAMPLE } from "@/lib/leads/inbound-payload"

type Props = {
  slug: string
  funnel: FunnelDto
  format: FunnelFormat
  customFields: WebhookCustomFieldSpec[]
  sample: Record<string, unknown> | null
  sampleLoading: boolean
}

/** Dry run of what is saved: request on the left, the lead it would create on the right. */
export function FunnelTestTab({
  slug,
  funnel,
  format,
  customFields,
  sample,
  sampleLoading,
}: Props) {
  const example = useMemo(
    () => buildExamplePayload(CANONICAL_INBOUND_EXAMPLE as Record<string, unknown>, customFields),
    [customFields]
  )

  return (
    <FunnelTestPanel
      slug={slug}
      funnelId={funnel.id}
      payload={format === "ours" ? example : sample}
      mapping={format === "ours" ? {} : funnel.fieldMapping}
      allowPaste
      loading={format === "own" && sampleLoading}
      layout="split"
    />
  )
}
