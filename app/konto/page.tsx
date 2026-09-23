import type { Metadata } from "next"

import { KontoPageGate } from "@/components/account/KontoPageGate"

export const metadata: Metadata = {
  title: "Min konto – Censio",
}

export default function KontoPage() {
  return <KontoPageGate />
}
