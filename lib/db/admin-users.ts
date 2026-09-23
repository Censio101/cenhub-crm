import type { SupabaseClient, User } from "@supabase/supabase-js"

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

export async function inviteOrCreateUser(
  admin: SupabaseClient,
  input: InviteUserInput
): Promise<{ userId: string; method: InviteUserInput["method"] }> {
  const email = input.email.trim().toLowerCase()
  if (!email) throw new Error("Email is required")

  if (input.role !== "censio_admin" && !input.organizationId) {
    throw new Error("organizationId is required for client users")
  }

  let userId = await findUserIdByEmail(admin, email)

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
      if (!input.password || input.password.length < 8) {
        throw new Error("Password must be at least 8 characters")
      }
      const { data, error } = await admin.auth.admin.createUser({
        email,
        password: input.password,
        email_confirm: true,
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
  }

  const { error: profileError } = await admin.from("profiles").upsert(
    {
      id: userId,
      organization_id: input.role === "censio_admin" ? null : input.organizationId,
      role: input.role,
      email,
      full_name: input.fullName?.trim() || null,
    },
    { onConflict: "id" }
  )

  if (profileError) throw profileError

  return { userId, method: input.method }
}
