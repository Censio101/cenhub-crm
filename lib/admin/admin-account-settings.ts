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

export function readAdminAccountSettings(
  userId?: string | null
): AdminAccountSettings {
  if (typeof window === "undefined" || !userId) {
    return DEFAULT_ADMIN_ACCOUNT_SETTINGS
  }

  try {
    const raw = window.localStorage.getItem(getAdminAccountSettingsStorageKey(userId))
    if (!raw) return DEFAULT_ADMIN_ACCOUNT_SETTINGS
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

export function writeAdminAccountSettings(userId: string, settings: AdminAccountSettings) {
  if (typeof window === "undefined") return

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
