"use client"

import { AdminClientProvider } from "@/components/admin/AdminClientContext"
import { AdminClientSwitchProvider } from "@/components/admin/AdminClientSwitchContext"
import { AdminClientLayout } from "@/components/admin/AdminClientLayout"
import { AdminClientScopeBar } from "@/components/admin/AdminClientScopeBar"
import { ClientManageSidebar } from "@/components/admin/ClientManageSidebar"
import { poppins } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

export function ClientManageShell({
  slug,
  children,
}: {
  slug: string
  children: React.ReactNode
}) {
  return (
    <AdminClientSwitchProvider>
      <AdminClientProvider slug={slug}>
        <div className={cn("flex min-h-full flex-1 flex-col md:flex-row", poppins.className)}>
          <ClientManageSidebar />
          <div className="min-h-full min-w-0 flex-1 overflow-x-clip px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
            <AdminClientScopeBar />
            <AdminClientLayout>{children}</AdminClientLayout>
          </div>
        </div>
      </AdminClientProvider>
    </AdminClientSwitchProvider>
  )
}
