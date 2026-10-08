import type { SupabaseClient, User } from "@supabase/supabase-js"

import { isPortalPasswordValid, PORTAL_PASSWORD_MIN_LENGTH } from "@/lib/auth/portal-access"
import { sendUserInviteEmail } from "@/lib/email/send-user-invite"
import type { ProfileRow, UserRole } from "@/lib/db/types"

export type AdminAccessStatus = "active" | "pending"

export type InviteUserInput = {
  email: string
  role: UserRole
  organizationId?: string | null
  organizationName?: string | null
  method: "email" | "password"
  password?: string
  fullName?: string
}

export async function listProfilesForOrganization(
  supabase: SupabaseClient,
  organizationId: string
): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true })

  if (error) throw error
  return (data ?? []) as ProfileRow[]
}

export async function listCensioAdmins(
  supabase: SupabaseClient
): Promise<ProfileRow[]> {
  const { data, error } = await supabase
    .from("profiles")
    .select("*")
    .eq("role", "censio_admin")
    .order("created_at", { ascending: true })

  if (error) throw error
  return (data ?? []) as ProfileRow[]
}

export function getAdminAccessStatus(user: User | null | undefined): AdminAccessStatus {
  if (!user) return "pending"
  return user.email_confirmed_at || user.confirmed_at ? "active" : "pending"
}

export async function getAuthUsersByIds(
  admin: SupabaseClient,
  ids: string[]
): Promise<Map<string, User>> {
  const uniqueIds = [...new Set(ids.filter(Boolean))]
  const usersById = new Map<string, User>()
  if (uniqueIds.length === 0) return usersById

  await Promise.all(
    uniqueIds.map(async (id) => {
      const { data, error } = await admin.auth.admin.getUserById(id)
      if (!error && data.user) {
        usersById.set(id, data.user)
      }
    })
  )

  return usersById
}

export async function listAuthUsersById(
  admin: SupabaseClient
): Promise<Map<string, User>> {
  const usersById = new Map<string, User>()
  let page = 1

  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error

    for (const user of data.users) {
      usersById.set(user.id, user)
    }

    if (data.users.length < 200) break
    page += 1
  }

  return usersById
}

export async function getCensioAdminProfile(
  admin: SupabaseClient,
  userId: string
): Promise<ProfileRow | null> {
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .eq("role", "censio_admin")
    .maybeSingle()

  if (error) throw error
  return (data as ProfileRow | null) ?? null
}

export async function removeCensioAdmin(
  admin: SupabaseClient,
  userId: string,
  actingUserId: string
): Promise<void> {
  if (userId === actingUserId) {
    throw new Error("You cannot remove yourself")
  }

  const admins = await listCensioAdmins(admin)
  if (admins.length <= 1) {
    throw new Error("At least one Censio admin must remain")
  }

  const target = admins.find((profile) => profile.id === userId)
  if (!target) {
    throw new Error("Admin not found")
  }

  const { error: authError } = await admin.auth.admin.deleteUser(userId)
  if (authError && !/not found|invalid/i.test(authError.message)) {
    throw authError
  }

  const { error: profileError } = await admin.from("profiles").delete().eq("id", userId)
  if (profileError) throw profileError
}

export async function resendCensioAdminInvite(
  admin: SupabaseClient,
  userId: string
): Promise<void> {
  const profile = await getCensioAdminProfile(admin, userId)
  if (!profile?.email) {
    throw new Error("Admin not found")
  }

  await sendUserInviteEmail(admin, {
    email: profile.email,
    role: "censio_admin",
    fullName: profile.full_name,
  })
}

export async function getOrganizationUserProfile(
  admin: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<ProfileRow | null> {
  const { data, error } = await admin
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .eq("organization_id", organizationId)
    .maybeSingle()

  if (error) throw error
  return (data as ProfileRow | null) ?? null
}

export async function removeOrganizationUser(
  admin: SupabaseClient,
  userId: string,
  organizationId: string
): Promise<void> {
  const profile = await getOrganizationUserProfile(admin, userId, organizationId)
  if (!profile) {
    throw new Error("User not found")
  }

  if (profile.role === "censio_admin") {
    throw new Error("Cannot remove a Censio admin from a client workspace")
  }

  const { error: authError } = await admin.auth.admin.deleteUser(userId)
  if (authError && !/not found|invalid/i.test(authError.message)) {
    throw authError
  }

  const { error: profileError } = await admin.from("profiles").delete().eq("id", userId)
  if (profileError) throw profileError
}

export async function resendOrganizationUserInvite(
  admin: SupabaseClient,
  userId: string,
  organizationId: string,
  organizationName: string
): Promise<void> {
  const profile = await getOrganizationUserProfile(admin, userId, organizationId)
  if (!profile?.email) {
    throw new Error("User not found")
  }

  await sendUserInviteEmail(admin, {
    email: profile.email,
    role: profile.role,
    fullName: profile.full_name,
    organizationName,
  })
}

export async function setOrganizationUserPassword(
  admin: SupabaseClient,
  userId: string,
  organizationId: string,
  password: string
): Promise<void> {
  if (!isPortalPasswordValid(password)) {
    throw new Error(`Password must be at least ${PORTAL_PASSWORD_MIN_LENGTH} characters`)
  }

  const profile = await getOrganizationUserProfile(admin, userId, organizationId)
  if (!profile) {
    throw new Error("User not found")
  }
  if (profile.role === "censio_admin") {
    throw new Error("Cannot change a Censio admin password from a client workspace")
  }

  await setAuthUserPassword(admin, userId, password)
}

async function findUserIdByEmail(
  admin: SupabaseClient,
  email: string
): Promise<string | null> {
  let page = 1
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    )
    if (match) return match.id
    if (data.users.length < 200) break
    page += 1
  }
  return null
}

async function setAuthUserPassword(
  admin: SupabaseClient,
  userId: string,
  password: string
): Promise<void> {
  const { data, error: getError } = await admin.auth.admin.getUserById(userId)
  if (getError) throw getError

  const { error } = await admin.auth.admin.updateUserById(userId, {
    password,
    email_confirm: true,
    user_metadata: { ...(data.user?.user_metadata ?? {}), password_setup_complete: true },
  })
  if (error) throw error
}

function assertCanAssignProfile(
  existing: Pick<ProfileRow, "role" | "organization_id"> | null,
  input: InviteUserInput
): void {
  if (!existing) return
  if (existing.role === "censio_admin" && input.role !== "censio_admin") {
    throw new Error("This email belongs to a Censio admin")
  }
  if (
    input.role !== "censio_admin" &&
    existing.organization_id &&
    existing.organization_id !== input.organizationId
  ) {
    throw new Error("This email already has a login for another client")
  }
}

export async function inviteOrCreateUser(
  admin: SupabaseClient,
  input: InviteUserInput
): Promise<{ userId: string; method: InviteUserInput["method"] }> {
  const email = input.email.trim().toLowerCase()
  if (!email) throw new Error("Email is required")

  if (input.role !== "censio_admin" && !input.organizationId) {
    throw new Error("organizationId is required for client users")
  }

  if (input.method === "password" && !isPortalPasswordValid(input.password ?? "")) {
    throw new Error(`Password must be at least ${PORTAL_PASSWORD_MIN_LENGTH} characters`)
  }

  let userId = await findUserIdByEmail(admin, email)

  if (userId) {
    const { data: existingProfile, error } = await admin
      .from("profiles")
      .select("role, organization_id")
      .eq("id", userId)
      .maybeSingle()
    if (error) throw error
    assertCanAssignProfile(
      existingProfile as Pick<ProfileRow, "role" | "organization_id"> | null,
      input
    )
  }

  if (!userId) {
    if (input.method === "email") {
      const inviteResult = await sendUserInviteEmail(admin, {
        email,
        role: input.role,
        fullName: input.fullName,
        organizationName: input.organizationName,
      })
      userId = inviteResult.userId
    } else {
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: input.password!,
        email_confirm: true,
        user_metadata: { password_setup_complete: true },
      })
      if (error) throw error
      userId = data.user.id
    }
  } else if (input.method === "email") {
    await sendUserInviteEmail(admin, {
      email,
      role: input.role,
      fullName: input.fullName,
      organizationName: input.organizationName,
    })
  } else {
    await setAuthUserPassword(admin, userId, input.password!)
  }

  const profilePayload = {
    organization_id: input.role === "censio_admin" ? null : input.organizationId,
    role: input.role,
    email,
    full_name: input.fullName?.trim() || null,
    updated_at: new Date().toISOString(),
  }

  const { error: profileError } = await admin
    .from("profiles")
    .upsert({ id: userId, ...profilePayload }, { onConflict: "id" })
  if (profileError) throw profileError

  return { userId, method: input.method }
}
