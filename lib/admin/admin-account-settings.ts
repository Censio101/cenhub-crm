export const ADMIN_ACCOUNT_SETTINGS_KEY = "censio-admin-account-settings"

export type AdminAccountSettings = {
  displayName: string
  profileImage: string
}

export const DEFAULT_ADMIN_ACCOUNT_SETTINGS: AdminAccountSettings = {
  displayName: "",
  profileImage: "",
}

export function readAdminAccountSettings(): AdminAccountSettings {
  if (typeof window === "undefined") return DEFAULT_ADMIN_ACCOUNT_SETTINGS
  try {
    const raw = window.localStorage.getItem(ADMIN_ACCOUNT_SETTINGS_KEY)
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

export function writeAdminAccountSettings(settings: AdminAccountSettings) {
  try {
    window.localStorage.setItem(ADMIN_ACCOUNT_SETTINGS_KEY, JSON.stringify(settings))
  } catch {
    try {
      window.localStorage.setItem(
        ADMIN_ACCOUNT_SETTINGS_KEY,
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
