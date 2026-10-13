"use client"

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { usePathname } from "next/navigation"

import { MainContentTransition } from "@/components/client/MainContentTransition"
import { useWarmClientWorkspaceCaches } from "@/hooks/useWarmClientWorkspaceCaches"
import { useActiveOrganization } from "@/hooks/useActiveOrganization"
import {
  CLIENT_ORG_CHANGED_EVENT,
  hasCustomersCache,
  hasLeadsCache,
  isClientWorkspaceWarm,
  markClientWorkspaceWarm,
} from "@/lib/data/client-cache"
import {
  shouldAnimateBoardEnter,
  shouldAnimateSettingsEnter,
} from "@/lib/layout/client-navigation-enter"
import {
  getNavigationZone,
  isClientCorePath,
  type NavigationZone,
} from "@/lib/layout/client-navigation-zones"

type ClientNavigationContextValue = {
  zone: NavigationZone
  zoneChanged: boolean
  workspaceWarm: boolean
  animateBoardEnter: boolean
  animateSettingsEnter: boolean
  markWorkspaceWarm: () => void
}

const ClientNavigationContext = createContext<ClientNavigationContextValue | null>(null)

export function useClientNavigation() {
  const ctx = useContext(ClientNavigationContext)
  if (!ctx) {
    return {
      zone: "other" as NavigationZone,
      zoneChanged: false,
      workspaceWarm: false,
      animateBoardEnter: true,
      animateSettingsEnter: false,
      markWorkspaceWarm: () => {},
    }
  }
  return ctx
}

export function ClientNavigationProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname() ?? ""
  const { organization } = useActiveOrganization()
  const activeSlug = organization?.slug ?? null

  const [navState, setNavState] = useState(() => {
    const initial = getNavigationZone(pathname)
    return { zone: initial, previous: null as NavigationZone | null }
  })

  useEffect(() => {
    setNavState((current) => {
      const nextZone = getNavigationZone(pathname)
      if (current.zone === nextZone) return current
      return { zone: nextZone, previous: current.zone }
    })
  }, [pathname])

  const zone = navState.zone
  const previousZone = navState.previous
  const zoneChanged = previousZone !== null && previousZone !== zone
  const [workspaceWarm, setWorkspaceWarm] = useState(() => isClientWorkspaceWarm())

  useEffect(() => {
    setWorkspaceWarm(isClientWorkspaceWarm())
  }, [pathname])

  useEffect(() => {
    if (isClientCorePath(pathname) && (hasLeadsCache(activeSlug) || hasCustomersCache(activeSlug))) {
      markClientWorkspaceWarm()
      setWorkspaceWarm(true)
    }
  }, [pathname, activeSlug])

  useEffect(() => {
    const onOrgChanged = () => {
      setWorkspaceWarm(isClientWorkspaceWarm())
    }
    window.addEventListener(CLIENT_ORG_CHANGED_EVENT, onOrgChanged)
    return () => window.removeEventListener(CLIENT_ORG_CHANGED_EVENT, onOrgChanged)
  }, [])

  useWarmClientWorkspaceCaches()

  const markWorkspaceWarm = () => {
    markClientWorkspaceWarm()
    setWorkspaceWarm(true)
  }

  const boardCtx = useMemo(
    () => ({
      pathname,
      previousZone,
      workspaceWarm,
      hasLeadsCache: hasLeadsCache(activeSlug),
      hasCustomersCache: hasCustomersCache(activeSlug),
    }),
    [pathname, previousZone, workspaceWarm, activeSlug]
  )

  const value = useMemo(
    (): ClientNavigationContextValue => ({
      zone,
      zoneChanged,
      workspaceWarm,
      animateBoardEnter: shouldAnimateBoardEnter(boardCtx),
      animateSettingsEnter: shouldAnimateSettingsEnter(boardCtx),
      markWorkspaceWarm,
    }),
    [zone, zoneChanged, workspaceWarm, boardCtx]
  )

  return (
    <ClientNavigationContext.Provider value={value}>
      <MainContentTransition zone={zone} zoneChanged={zoneChanged}>
        {children}
      </MainContentTransition>
    </ClientNavigationContext.Provider>
  )
}
