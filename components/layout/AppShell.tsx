import { AccountSettingsProvider } from "@/components/account/AccountSettingsProvider"
import { AppFrame } from "@/components/layout/AppFrame"

export function AppShell({ children }: { children: React.ReactNode }) {
  return (
    <AccountSettingsProvider>
      <AppFrame>{children}</AppFrame>
    </AccountSettingsProvider>
  )
}
