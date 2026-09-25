"use client"

import { AdminSidebar } from "@/components/admin/AdminSidebar"
import { poppins } from "@/lib/fonts/app-fonts"
import { cn } from "cn"

export function AdminWorkspaceShell({ children }: { children: React.ReactNode }) {
  return (
    <div className={cn("flex min-h-full flex-1 flex-col md:flex-row", poppins.className)}>
      <AdminSidebar />
      <div className="min-h-full min-w-0 flex-1 overflow-x-clip px-4 py-6 sm:px-6 lg:px-8 xl:px-10">
        {children}
      </div>
    </div>
  )
}
