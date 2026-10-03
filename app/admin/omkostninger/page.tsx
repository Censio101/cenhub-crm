import type { Metadata } from "next"

import { ExpensesBoard } from "@/components/internal/ExpensesBoard"

export const metadata: Metadata = {
  title: "Omkostninger – Censio Internal",
}

export default function ExpensesPage() {
  return <ExpensesBoard />
}
