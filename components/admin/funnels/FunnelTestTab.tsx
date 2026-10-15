"use client"

import { useMemo } from "react"

import { FunnelTestPanel } from "@/components/admin/funnels/FunnelTestPanel"
import type { FunnelFormat } from "@/components/admin/funnels/FunnelFieldsTab"
import type { FunnelDto } from "@/components/admin/funnels/types"
import {
  buildExamplePayload,
  buildStandardInboundExample,
  type WebhookCustomFieldSpec,
} from "@/lib/lead-sheet/webhook-spec"
import type { ClientService } from "@/lib/services/types"

type Props = {
  slug: string
  funnel: FunnelDto
  format: FunnelFormat
  customFields: WebhookCustomFieldSpec[]
  enabledServices: readonly ClientService[]
  sample: Record<string, unknown> | null
  sampleLoading: boolean
}

/** Dry run of what is saved: request on the left, the lead it would create on the right. */
export function FunnelTestTab({
  slug,
  funnel,
  format,
  customFields,
  enabledServices,
  sample,
  sampleLoading,
}: Props) {
  const example = useMemo(
    () => buildExamplePayload(buildStandardInboundExample(enabledServices), customFields),
    [customFields, enabledServices]
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
