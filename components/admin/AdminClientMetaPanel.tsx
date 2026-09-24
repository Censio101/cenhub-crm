"use client"

import { AdminMetaConfigForm } from "@/components/admin/AdminMetaConfigForm"
import { useAdminClient } from "@/components/admin/AdminClientContext"

export function AdminClientMetaPanel() {
  const { slug, organization, metaConfig, reload } = useAdminClient()

  return (
    <AdminMetaConfigForm
      slug={slug}
      organizationName={organization?.name}
      initialConfig={metaConfig}
      onSaved={() => {
        void reload()
      }}
    />
  )
}
