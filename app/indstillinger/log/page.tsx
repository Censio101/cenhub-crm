import type { Metadata } from "next"

import { AuditLogBoard } from "@/components/account/AuditLogBoard"

export const metadata: Metadata = {
  title: "Log – Censio Internal",
}

export default function LogPage() {
  return <AuditLogBoard />
}
