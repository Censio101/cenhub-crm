"use client"

import { FunnelServiceMetaAliasEditor } from "@/components/admin/funnels/FunnelServiceMetaAliasEditor"
import type { ClientService, Service } from "@/lib/services/types"

type CatalogService = Pick<Service, "id" | "slug" | "nameDa" | "nameEn">

type Props = {
  slug: string
  sample: Record<string, unknown> | null
  serviceIdsPath: string
  catalog: readonly CatalogService[]
  enabledServices: readonly ClientService[]
}

/** Map Meta / form service labels → CRM services (persists as org inbound aliases). */
export function FunnelServiceValueMap(props: Props) {
  return <FunnelServiceMetaAliasEditor {...props} />
}
