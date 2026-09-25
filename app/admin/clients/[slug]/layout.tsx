import { ClientManageShell } from "@/components/admin/ClientManageShell"

type LayoutProps = {
  children: React.ReactNode
  params: Promise<{ slug: string }>
}

export default async function AdminClientManageLayout({ children, params }: LayoutProps) {
  const { slug } = await params
  return <ClientManageShell slug={slug}>{children}</ClientManageShell>
}
