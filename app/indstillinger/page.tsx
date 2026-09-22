import type { Metadata } from "next"

import { SettingsBoard } from "@/components/account/SettingsBoard"

export const metadata: Metadata = {
  title: "Indstillinger – Censio",
}

export default function IndstillingerPage() {
  return <SettingsBoard />
}
