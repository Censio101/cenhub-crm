import { Suspense } from "react"

import { AdminAccountSettingsProvider } from "@/components/admin/AdminAccountSettingsProvider"
import { AdminTabOrganizationBootstrap } from "@/components/admin/AdminTabOrganizationBootstrap"
import { LanguageProvider } from "@/components/i18n/LanguageProvider"
import { AppFrame } from "@/components/layout/AppFrame"
import { SessionProvider } from "@/components/session/SessionProvider"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <SessionProvider>
        <Suspense fallback={null}>
          <AdminTabOrganizationBootstrap />
        </Suspense>
        <AdminAccountSettingsProvider>
          <AppFrame>{children}</AppFrame>
        </AdminAccountSettingsProvider>
      </SessionProvider>
    </LanguageProvider>
  )
}
