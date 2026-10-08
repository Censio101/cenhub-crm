import { sanitizeStoredProfileImage } from "@/lib/auth/profile-image-sanitize"
import { notifyStorageChange, readStorageRaw } from "@/lib/react/storage-store"

export const LEGACY_ADMIN_ACCOUNT_SETTINGS_KEY = "censio-admin-account-settings"

export type AdminAccountSettings = {
  displayName: string
  profileImage: string
}

export const DEFAULT_ADMIN_ACCOUNT_SETTINGS: AdminAccountSettings = {
  displayName: "",
  profileImage: "",
}

export function getAdminAccountSettingsStorageKey(userId: string) {
  return `censio-admin-account-settings:${userId}`
}

export function clearLegacyAdminAccountSettings() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(LEGACY_ADMIN_ACCOUNT_SETTINGS_KEY)
}

/** Pure: turns the stored JSON (or nothing) into settings, filling defaults. */
export function parseAdminAccountSettings(raw: string | null): AdminAccountSettings {
  if (!raw) return DEFAULT_ADMIN_ACCOUNT_SETTINGS
  try {
    const parsed = JSON.parse(raw) as Partial<AdminAccountSettings>
    return {
      displayName:
        typeof parsed.displayName === "string"
          ? parsed.displayName
          : DEFAULT_ADMIN_ACCOUNT_SETTINGS.displayName,
      profileImage:
        typeof parsed.profileImage === "string"
          ? parsed.profileImage
          : DEFAULT_ADMIN_ACCOUNT_SETTINGS.profileImage,
    }
  } catch {
    return DEFAULT_ADMIN_ACCOUNT_SETTINGS
  }
}

/** Raw stored value for a user; used as the `useSyncExternalStore` snapshot. */
export function readAdminAccountSettingsRaw(userId?: string | null): string | null {
  if (!userId) return null
  return readStorageRaw(getAdminAccountSettingsStorageKey(userId))
}

export function readAdminAccountSettings(
  userId?: string | null
): AdminAccountSettings {
  return parseAdminAccountSettings(readAdminAccountSettingsRaw(userId))
}

export function writeAdminAccountSettings(userId: string, settings: AdminAccountSettings) {
  if (typeof window === "undefined") return
  try {
    writeAdminAccountSettingsUnnotified(userId, settings)
  } finally {
    notifyStorageChange()
  }
}

function writeAdminAccountSettingsUnnotified(userId: string, settings: AdminAccountSettings) {

  try {
    window.localStorage.setItem(
      getAdminAccountSettingsStorageKey(userId),
      JSON.stringify(settings)
    )
  } catch {
    try {
      window.localStorage.setItem(
        getAdminAccountSettingsStorageKey(userId),
        JSON.stringify({
          displayName: settings.displayName,
          profileImage: "",
        })
      )
    } catch {
      // Ignore quota errors — avatar is persisted on the server.
    }
  }
}
