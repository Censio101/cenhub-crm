"use client"

import { useCallback, useEffect, useMemo, useSyncExternalStore } from "react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  fetchCompanyConfig,
  getServerServicesSnapshot,
  getServicesSnapshot,
  markServicesLoadedEmpty,
  resetServices,
  subscribeToServices,
} from "@/lib/data/company-config"
import { CLIENT_ORG_CHANGED_EVENT } from "@/lib/data/client-cache"
import { serviceName, type ClientService } from "@/lib/services/types"

/** Minimum time between focus-triggered refreshes. */
const REFRESH_MIN_MS = 60_000

/**
 * The services the signed-in client offers, as managed by Censio (industry defaults plus
 * extras). Shared by every component, loaded once, refreshed when the client changes or the
 * tab is used again.
 */
export function useCompanyServices() {
  const { locale } = useLanguage()
  const { services, loaded } = useSyncExternalStore(
    subscribeToServices,
    getServicesSnapshot,
    getServerServicesSnapshot
  )

  const refresh = useCallback(() => {
    void fetchCompanyConfig().then((result) => {
      // A refused request (no client selected) still ends the loading state with no services.
      if (!result) markServicesLoadedEmpty()
    })
  }, [])

  useEffect(() => {
    let last = Date.now()
    if (!getServicesSnapshot().loaded) refresh()

    const onOrgChanged = () => {
      resetServices()
      last = Date.now()
      refresh()
    }
    const onFocus = () => {
      if (document.visibilityState !== "visible") return
      if (Date.now() - last < REFRESH_MIN_MS) return
      last = Date.now()
      refresh()
    }
    window.addEventListener(CLIENT_ORG_CHANGED_EVENT, onOrgChanged)
    window.addEventListener("focus", onFocus)
    document.addEventListener("visibilitychange", onFocus)
    return () => {
      window.removeEventListener(CLIENT_ORG_CHANGED_EVENT, onOrgChanged)
      window.removeEventListener("focus", onFocus)
      document.removeEventListener("visibilitychange", onFocus)
    }
  }, [refresh])

  const enabledServices = useMemo(
    () =>
      services.map((service: ClientService) => ({
        id: service.id,
        label: serviceName(service, locale),
      })),
    [services, locale]
  )
  const enabledServiceIds = useMemo(() => services.map((service) => service.id), [services])

  return { enabledServiceIds, enabledServices, loaded }
}
