import { AccountSettingsProvider } from "@/components/account/AccountSettingsProvider"
import { LanguageProvider } from "@/components/i18n/LanguageProvider"
import { AppFrame } from "@/components/layout/AppFrame"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <LanguageProvider>
      <AccountSettingsProvider>
        <AppFrame>{children}</AppFrame>
      </AccountSettingsProvider>
    </LanguageProvider>
  )
}
