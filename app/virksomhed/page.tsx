import type { Metadata } from "next"

import { CompanyDetailsBoard } from "@/components/account/CompanyDetailsBoard"

export const metadata: Metadata = {
  title: "Virksomhedsoplysninger – Censio",
}

export default function VirksomhedPage() {
  return <CompanyDetailsBoard />
}
