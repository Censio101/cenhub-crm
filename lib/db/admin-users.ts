import type { SupabaseClient } from "@supabase/supabase-js"

import type { ProfileRow, UserRole } from "@/lib/db/types"

export type InviteUserInput = {
  email: string
  role: UserRole
  organizationId?: string | null
  method: "email" | "password"
  password?: string
  fullName?: string
}

const SITE_URL = process.env.CRM_SITE_URL ?? "https://cenhub-crm.vercel.app"

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
      const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
        redirectTo: `${SITE_URL}/auth/callback`,
      })
      if (error) throw error
      userId = data.user.id
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
