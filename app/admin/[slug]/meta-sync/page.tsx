import { redirect } from "next/navigation"

import { adminClientSettingsSectionPath } from "@/lib/admin/admin-routes"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function AdminClientLegacyMetaSyncPage({ params }: PageProps) {
  const { slug } = await params
  redirect(adminClientSettingsSectionPath(slug, "meta-sync"))
}
