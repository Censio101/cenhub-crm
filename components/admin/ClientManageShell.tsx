"use client"

import { AdminClientProvider } from "@/components/admin/AdminClientContext"
import { AdminClientSwitchProvider } from "@/components/admin/AdminClientSwitchContext"
import { AdminClientLayout } from "@/components/admin/AdminClientLayout"
import { AdminClientScopeBar } from "@/components/admin/AdminClientScopeBar"
import { ClientManageHeaderBand } from "@/components/admin/ClientManageHeaderBand"
import { ClientManageSidebar } from "@/components/admin/ClientManageSidebar"
import { poppins } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

export function ClientManageShell({ slug, children }: { slug: string; children: React.ReactNode }) {
  return (
    <AdminClientSwitchProvider>
      <AdminClientProvider slug={slug}>
        <div className={cn("flex min-h-0 flex-1 flex-col md:flex-row", poppins.className)}>
          <ClientManageSidebar />
          <div
            className={cn(
              "min-h-full min-w-0 flex-1 overflow-x-clip px-4 pt-4 pb-28 sm:px-6 sm:pb-32 md:pt-0 lg:px-8 xl:px-10",
              "2xl:pb-40"
            )}
          >
            <ClientManageHeaderBand variant="mainAlign" />
            <div className={cn("min-w-0", "md:mt-3")}>
              <AdminClientScopeBar />
            </div>
            <AdminClientLayout>{children}</AdminClientLayout>
          </div>
        </div>
      </AdminClientProvider>
    </AdminClientSwitchProvider>
  )
}
