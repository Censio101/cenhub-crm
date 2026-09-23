"use client"

import { AdminMetaConfigForm } from "@/components/admin/AdminMetaConfigForm"
import { useAdminClient } from "@/components/admin/AdminClientContext"

export function AdminClientMetaPanel() {
  const { slug, metaConfig, reload } = useAdminClient()

  return (
    <AdminMetaConfigForm
      slug={slug}
      initialConfig={metaConfig}
      onSaved={() => {
        void reload()
      }}
    />
  )
}
