import {
  getNavigationZone,
  isClientCorePath,
  type NavigationZone,
} from "@/lib/layout/client-navigation-zones"

export type BoardEnterContext = {
  pathname: string
  previousZone: NavigationZone | null
  workspaceWarm: boolean
  hasLeadsCache: boolean
  hasCustomersCache: boolean
}

/**
 * Fade the board itself only on the first cold paint.
 * Later moves (including into this zone) fade the page shell instead, so the two never stack.
 */
export function shouldAnimateBoardEnter(ctx: BoardEnterContext): boolean {
  const zone = getNavigationZone(ctx.pathname)
  if (zone !== "clientCore") return false
  // Route shell already runs `client-page-enter`; avoid stacked fades on navigation.
  if (ctx.previousZone !== null) return false
  if (ctx.workspaceWarm) return false
  if (ctx.hasLeadsCache || ctx.hasCustomersCache) return false
  return false
}

/** Soft fade when moving among dashboard, leads, and won customers. */
export function shouldFadeClientCoreSwitch(
  previousPath: string | null,
  pathname: string
): boolean {
  if (!previousPath || previousPath === pathname) return false
  return isClientCorePath(previousPath) && isClientCorePath(pathname)
}

export function shouldAnimateSettingsEnter(ctx: BoardEnterContext): boolean {
  const zone = getNavigationZone(ctx.pathname)
  if (zone !== "clientSettings") return false
  return ctx.previousZone !== null && ctx.previousZone !== "clientSettings"
}
