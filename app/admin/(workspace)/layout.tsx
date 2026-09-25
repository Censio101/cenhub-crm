import { AdminWorkspaceShell } from "@/components/admin/AdminWorkspaceShell"

type LayoutProps = {
  children: React.ReactNode
}

export default function AdminWorkspaceLayout({ children }: LayoutProps) {
  return <AdminWorkspaceShell>{children}</AdminWorkspaceShell>
}
