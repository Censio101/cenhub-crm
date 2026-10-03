import { CENSIO_ADMIN_USER_ID } from "@/lib/onboarding/store-ids"
import type { AuthUser } from "@/lib/onboarding/types"

export function normalizeUser(user: AuthUser): AuthUser {
  const head = user.id === CENSIO_ADMIN_USER_ID
  const username = typeof user.username === "string" ? user.username.trim() : ""
  return {
    ...user,
    name: head && user.name === "Censio" ? "Kaj Eli Joensen" : user.name,
    username: username || (head ? "Censio" : user.email.split("@")[0] || "bruger"),
    title: typeof user.title === "string" ? user.title : head ? "CEO & Founder" : "",
    profileImage:
      typeof user.profileImage === "string"
        ? user.profileImage
        : head
          ? "/kaj-eli-joensen.jpg"
          : "",
    headAdmin: typeof user.headAdmin === "boolean" ? user.headAdmin : head,
    censioStaffRole:
      user.globalRole === "censio_admin"
        ? user.censioStaffRole === "medarbejder"
          ? "medarbejder"
          : "admin"
        : user.censioStaffRole,
  }
}
