import { AdminShell } from "@/components/admin/AdminShell"
import { outfit } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <div className={cn("admin-ui flex min-h-full flex-1 flex-col", outfit.className)}>
      <AdminShell>{children}</AdminShell>
    </div>
  )
}
