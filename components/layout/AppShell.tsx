import { AccountSettingsProvider } from "@/components/account/AccountSettingsProvider"
import { AdminAccountSettingsProvider } from "@/components/admin/AdminAccountSettingsProvider"
import { LanguageProvider } from "@/components/i18n/LanguageProvider"
import { AppFrame } from "@/components/layout/AppFrame"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AccountSettingsProvider>
        <AdminAccountSettingsProvider>
          <AppFrame>{children}</AppFrame>
        </AdminAccountSettingsProvider>
      </AccountSettingsProvider>
    </LanguageProvider>
  )
}
