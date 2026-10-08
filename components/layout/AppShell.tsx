import { AdminAccountSettingsProvider } from "@/components/admin/AdminAccountSettingsProvider"
import { LanguageProvider } from "@/components/i18n/LanguageProvider"
import { AppFrame } from "@/components/layout/AppFrame"
import { SessionProvider } from "@/components/session/SessionProvider"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <SessionProvider>
        <AdminAccountSettingsProvider>
          <AppFrame>{children}</AppFrame>
        </AdminAccountSettingsProvider>
      </SessionProvider>
    </LanguageProvider>
  )
}
