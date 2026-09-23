import type { Metadata } from "next"

import { MinKontoBoard } from "@/components/account/MinKontoBoard"

export const metadata: Metadata = {
  title: "Min konto – Censio",
}

export default function KontoPage() {
  return <MinKontoBoard />
}
