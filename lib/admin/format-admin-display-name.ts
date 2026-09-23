import {
  clientInitialsFromName,
  formatClientDisplayName,
} from "@/lib/admin/format-client-display-name"

type AdminIdentity = {
  fullName: string | null
  email: string | null
}

export function formatAdminDisplayName(admin: AdminIdentity) {
  if (admin.fullName?.trim()) {
    return formatClientDisplayName(admin.fullName)
  }
  if (admin.email) {
    const local = admin.email.split("@")[0] ?? ""
    return formatClientDisplayName(local.replace(/[._+-]/g, " "))
  }
  return "Admin"
}

export function adminInitials(admin: AdminIdentity) {
  return clientInitialsFromName(formatAdminDisplayName(admin))
}
