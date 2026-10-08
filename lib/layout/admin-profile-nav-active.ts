import { isAdminWorkspacePath, isClientManagePath } from "@/lib/admin/admin-routes"
import { isClientDashboardPath } from "@/lib/layout/app-paths"

export function isAdminWorkspaceNavActive(pathname: string): boolean {
  return (
    pathname === "/admin/overview" ||
    (isAdminWorkspacePath(pathname) &&
      pathname !== "/admin" &&
      pathname !== "/admin/clients" &&
      !isClientManagePath(pathname))
  )
}

export function isAdminAllClientsNavActive(pathname: string): boolean {
  return pathname === "/admin/clients" || isClientManagePath(pathname)
}

export function isAdminCompanyDetailsNavActive(pathname: string): boolean {
  return pathname === "/virksomhed" || pathname.startsWith("/virksomhed/")
}

export function isAdminClientDashboardNavActive(pathname: string): boolean {
  return (
    isClientDashboardPath(pathname) &&
    !isAdminCompanyDetailsNavActive(pathname) &&
    !pathname.startsWith("/konto")
  )
}

export function isAdminMyAccountNavActive(pathname: string): boolean {
  return pathname.startsWith("/admin/konto")
}

/** Profile dropdown: hover / keyboard highlight (Base UI uses data-highlighted). */
export const profileMenuContentClassName =
  "min-w-56 w-56 [&_[data-slot=dropdown-menu-item]:not([data-disabled])]:data-highlighted:bg-primary [&_[data-slot=dropdown-menu-item]:not([data-disabled])]:data-highlighted:text-white [&_[data-slot=dropdown-menu-item]:not([data-disabled])]:data-highlighted:**:text-white [&_[data-slot=dropdown-menu-item]:not([data-disabled])]:focus:bg-primary [&_[data-slot=dropdown-menu-item]:not([data-disabled])]:focus:text-white [&_[data-slot=dropdown-menu-item]:not([data-disabled])]:focus:**:text-white [&_[data-slot=dropdown-menu-item][data-variant=destructive]:not([data-disabled])]:data-highlighted:bg-primary [&_[data-slot=dropdown-menu-item][data-variant=destructive]:not([data-disabled])]:data-highlighted:text-white [&_[data-slot=dropdown-menu-item][data-variant=destructive]:not([data-disabled])]:data-highlighted:**:text-white [&_[data-slot=dropdown-menu-item][data-variant=destructive]:not([data-disabled])]:focus:bg-primary [&_[data-slot=dropdown-menu-item][data-variant=destructive]:not([data-disabled])]:focus:text-white [&_[data-slot=dropdown-menu-item][data-variant=destructive]:not([data-disabled])]:focus:**:text-white"

/** Dropdown item styles when it matches the current page. */
export const profileMenuActiveItemClassName =
  "bg-primary font-medium text-white [&_svg]:text-white data-highlighted:bg-primary data-highlighted:text-white data-highlighted:**:text-white focus:bg-primary focus:text-white focus:**:text-white"
