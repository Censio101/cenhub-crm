import type { Metadata } from "next"

import { TilmeldingPageClient } from "@/components/onboarding/TilmeldingPageClient"
import { TilmeldingPageShell } from "@/components/onboarding/TilmeldingPageShell"

export const metadata: Metadata = {
  title: "Ansøg om adgang – Censio",
  description: "Ansøg om adgang til Censio performance dashboard",
}

export default function TilmeldingPage() {
  return (
    <TilmeldingPageShell>
      <TilmeldingPageClient />
    </TilmeldingPageShell>
  )
}
