import { redirect } from "next/navigation"

import { adminClientSettingsBasePath } from "@/lib/admin/admin-routes"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function AdminClientLegacyDemoPage({ params }: PageProps) {
  const { slug } = await params
  redirect(adminClientSettingsBasePath(slug))
}
