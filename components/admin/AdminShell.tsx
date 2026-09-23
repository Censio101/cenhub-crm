"use client"

import { usePathname } from "next/navigation"

import { AdminClientProvider } from "@/components/admin/AdminClientContext"
import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { parseAdminClientSlug } from "@/lib/admin/admin-routes"
import { poppins } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

export function AdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname() ?? ""
  const clientSlug = parseAdminClientSlug(pathname)

  const frame = (
    <div className={cn("flex min-h-full flex-1 flex-col md:flex-row", poppins.className)}>
      <AdminSidebar />
      <div className="min-h-full min-w-0 flex-1 px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        {children}
      </div>
    </div>
  )

  if (clientSlug) {
    return <AdminClientProvider slug={clientSlug}>{frame}</AdminClientProvider>
  }

  return frame
}
