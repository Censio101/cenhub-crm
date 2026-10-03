import type { Metadata } from "next"

import { InternalDashboard } from "@/components/internal/InternalDashboard"

export const metadata: Metadata = {
  title: "Dashboard – Censio Internal",
}

export default function InternalDashboardPage() {
  return <InternalDashboard />
}
