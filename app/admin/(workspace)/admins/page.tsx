import type { Metadata } from "next"

import { AdminAdminsPanel } from "@/components/admin/AdminAdminsPanel"

export const metadata: Metadata = {
  title: "Invite admins – Censio Admin",
}

export default function AdminAdminsPage() {
  return <AdminAdminsPanel />
}
