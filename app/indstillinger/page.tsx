import type { Metadata } from "next"

import { UserSettingsBoard } from "@/components/account/UserSettingsBoard"

export const metadata: Metadata = {
  title: "Indstillinger – Censio Internal",
}

export default function IndstillingerPage() {
  return <UserSettingsBoard />
}
