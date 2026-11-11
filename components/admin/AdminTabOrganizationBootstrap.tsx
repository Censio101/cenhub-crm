"use client"

import { useSearchParams } from "next/navigation"
import { useEffect, useRef } from "react"

import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import {
  CLIENT_ORG_QUERY_PARAM,
  setTabActiveOrgSlug,
} from "@/lib/auth/tab-active-organization"

/**
 * When an admin opens a client dashboard in a new tab (`?client=slug`), bind that tab to the
 * client before dashboard hooks load data.
 */
export function AdminTabOrganizationBootstrap() {
  const searchParams = useSearchParams()
  const { role, setActiveOrganization } = useActiveOrganization()
  const appliedRef = useRef<string | null>(null)

  useEffect(() => {
    if (role !== "censio_admin") return

    const fromUrl = searchParams.get(CLIENT_ORG_QUERY_PARAM)?.trim()
    if (!fromUrl) return
    if (appliedRef.current === fromUrl) return
    appliedRef.current = fromUrl

    setTabActiveOrgSlug(fromUrl)
    void setActiveOrganization(fromUrl).then(() => {
      const url = new URL(window.location.href)
      if (!url.searchParams.has(CLIENT_ORG_QUERY_PARAM)) return
      url.searchParams.delete(CLIENT_ORG_QUERY_PARAM)
      const next = `${url.pathname}${url.search}${url.hash}`
      window.history.replaceState(window.history.state, "", next)
    })
  }, [role, searchParams, setActiveOrganization])

  return null
}
