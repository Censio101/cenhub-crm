import { sanitizeStoredProfileImage } from "@/lib/auth/profile-image-sanitize"
import { notifyStorageChange, readStorageRaw } from "@/lib/react/storage-store"

export const ACCOUNT_SETTINGS_KEY = "censio-account-settings"

export type EmployeeRole = "admin" | "medarbejder"

export type EmployeeAccess = {
  id: string
  name: string
  email: string
  role: EmployeeRole
  status: "active" | "invited"
}

export type AccountSettings = {
  displayName: string
  profileImage: string
  logo: string
  email: string
  employees: EmployeeAccess[]
  hvidbjergPartner: boolean
}

export const DEFAULT_ACCOUNT_SETTINGS: AccountSettings = {
  displayName: "",
  profileImage: "",
  logo: "",
  email: "",
  employees: [],
  hvidbjergPartner: false,
}

export function parseHvidbjergPartner(value: unknown): boolean {
  return typeof value === "boolean" ? value : DEFAULT_ACCOUNT_SETTINGS.hvidbjergPartner
}

export function getEmployeeRoleLabel(role: EmployeeRole): string {
  return role === "admin" ? "Admin" : "Medarbejder"
}

/** Pure: turns the stored JSON (or nothing) into settings, filling defaults. */
export function parseAccountSettings(raw: string | null): AccountSettings {
  if (!raw) return DEFAULT_ACCOUNT_SETTINGS
  try {
    const parsed = JSON.parse(raw) as Partial<AccountSettings>
    return {
      profileImage: sanitizeStoredProfileImage(
        typeof parsed.profileImage === "string" ? parsed.profileImage : ""
      ),
      displayName:
        typeof parsed.displayName === "string"
          ? parsed.displayName
          : DEFAULT_ACCOUNT_SETTINGS.displayName,
      logo: sanitizeStoredProfileImage(typeof parsed.logo === "string" ? parsed.logo : ""),
      email: typeof parsed.email === "string" ? parsed.email : DEFAULT_ACCOUNT_SETTINGS.email,
      employees: Array.isArray(parsed.employees)
        ? parsed.employees
        : DEFAULT_ACCOUNT_SETTINGS.employees,
      hvidbjergPartner: parseHvidbjergPartner(parsed.hvidbjergPartner),
    }
  } catch {
    return DEFAULT_ACCOUNT_SETTINGS
  }
}

/** Raw stored value; used as the `useSyncExternalStore` snapshot. */
export function readAccountSettingsRaw(): string | null {
  return readStorageRaw(ACCOUNT_SETTINGS_KEY)
}

export function readAccountSettings(): AccountSettings {
  return parseAccountSettings(readAccountSettingsRaw())
}

export function writeAccountSettings(settings: AccountSettings) {
  window.localStorage.setItem(ACCOUNT_SETTINGS_KEY, JSON.stringify(settings))
  notifyStorageChange()
}
