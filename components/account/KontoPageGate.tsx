"use client"

import { useRouter } from "next/navigation"
import { useEffect } from "react"

import { KontoPageSkeleton } from "@/components/account/KontoPageSkeleton"
import { MinKontoBoard } from "@/components/account/MinKontoBoard"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"

export function KontoPageGate() {
  const router = useRouter()
  const { role, loading } = useActiveOrganization()

  useEffect(() => {
    if (!loading && role === "censio_admin") {
      router.replace("/admin/konto")
    }
  }, [loading, role, router])

  if (loading || role === "censio_admin") {
    return <KontoPageSkeleton />
  }

  return <MinKontoBoard />
}
