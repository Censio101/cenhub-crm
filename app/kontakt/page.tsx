import type { Metadata } from "next"

import { DiscordCommunity } from "@/components/account/DiscordCommunity"

export const metadata: Metadata = {
  title: "Kontakt Censio",
}

export default function KontaktPage() {
  return (
    <div className="mx-auto max-w-5xl">
      <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
        Support
      </p>
      <h1 className="mt-1 text-2xl font-medium tracking-tight text-foreground sm:text-[1.75rem]">
        Kontakt Censio
      </h1>
      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
        Censios support og community bor på Discord. Skriv i kanalen her på
        siden, eller log ind for at chatte direkte med teamet.
      </p>

      <div className="mt-8">
        <DiscordCommunity />
      </div>
    </div>
  )
}
