import type { Metadata } from "next"

import { OffersBoard } from "@/components/internal/OffersBoard"

export const metadata: Metadata = {
  title: "Tilbud – Censio Internal",
}

export default function AdminOffersPage() {
  return <OffersBoard />
}
