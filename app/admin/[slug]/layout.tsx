import { AdminClientLayout } from "@/components/admin/AdminClientLayout"

type LayoutProps = {
  children: React.ReactNode
}

export default function AdminClientSectionLayout({ children }: LayoutProps) {
  return <AdminClientLayout>{children}</AdminClientLayout>
}
