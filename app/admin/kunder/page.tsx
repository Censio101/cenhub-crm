import type { Metadata } from "next"

import { InternalCustomersBoard } from "@/components/internal/InternalCustomersBoard"

export const metadata: Metadata = {
  title: "Kunder – Censio Internal",
}

export default function AdminCustomersPage() {
  return <InternalCustomersBoard />
}
