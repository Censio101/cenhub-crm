import { hasCacheForClientCorePath } from "@/lib/layout/client-core-cache"
import { isClientCorePath } from "@/lib/layout/client-navigation-zones"

export function isClientCoreRouteSwitch(previousPath: string, pathname: string): boolean {
  if (previousPath === pathname) return false
  return isClientCorePath(previousPath) && isClientCorePath(pathname)
}

/**
 * Body settle only when the target tab is still cold — warm switches stay instant.
 */
export function shouldSettleClientCoreNavigation(
  previousPath: string,
  pathname: string,
  zoneChanged: boolean,
  organizationSlug: string | null
): boolean {
  if (
    isClientCorePath(pathname) &&
    hasCacheForClientCorePath(pathname, organizationSlug)
  ) {
    return false
  }
  if (zoneChanged) return true
  if (isClientCoreRouteSwitch(previousPath, pathname)) return true
  return false
}
