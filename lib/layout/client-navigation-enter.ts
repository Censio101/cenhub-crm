import {
  getNavigationZone,
  type NavigationZone,
} from "@/lib/layout/client-navigation-zones"

export type BoardEnterContext = {
  pathname: string
  previousZone: NavigationZone | null
  workspaceWarm: boolean
  hasLeadsCache: boolean
  hasCustomersCache: boolean
}

/** Fade board content only on cold load or when entering client core from another zone. */
export function shouldAnimateBoardEnter(ctx: BoardEnterContext): boolean {
  const zone = getNavigationZone(ctx.pathname)
  if (zone !== "clientCore") return false

  if (ctx.previousZone !== null && ctx.previousZone !== "clientCore") {
    return true
  }

  if (ctx.workspaceWarm) return false
  if (ctx.hasLeadsCache || ctx.hasCustomersCache) return false

  return true
}

export function shouldAnimateSettingsEnter(ctx: BoardEnterContext): boolean {
  const zone = getNavigationZone(ctx.pathname)
  if (zone !== "clientSettings") return false
  return ctx.previousZone !== null && ctx.previousZone !== "clientSettings"
}
