import { CURRENT_COMPANY } from "@/lib/company"
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
  profileImage: CURRENT_COMPANY.image,
  logo: CURRENT_COMPANY.logo,
  email: "kontakt@nordkystens-tomrer.dk",
  employees: [
    {
      id: "owner-1",
      name: "Ejer",
      email: "kontakt@nordkystens-tomrer.dk",
      role: "admin",
      status: "active",
    },
  ],
  hvidbjergPartner: true,
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
      profileImage: parsed.profileImage || DEFAULT_ACCOUNT_SETTINGS.profileImage,
      displayName:
        typeof parsed.displayName === "string"
          ? parsed.displayName
          : DEFAULT_ACCOUNT_SETTINGS.displayName,
      logo: parsed.logo || DEFAULT_ACCOUNT_SETTINGS.logo,
      email: parsed.email || DEFAULT_ACCOUNT_SETTINGS.email,
      employees:
        parsed.employees && parsed.employees.length > 0
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
