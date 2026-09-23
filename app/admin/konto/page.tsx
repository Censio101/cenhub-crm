import type { Metadata } from "next"

import { AdminKontoBoard } from "@/components/admin/AdminKontoBoard"

export const metadata: Metadata = {
  title: "Min konto – Censio Admin",
}

export default function AdminKontoPage() {
  return <AdminKontoBoard />
}
