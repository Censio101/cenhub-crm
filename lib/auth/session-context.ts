import {
  allowUnauthenticatedDemoAccess,
  getDemoOrgSlug,
  isSupabaseConfigured,
} from "@/lib/supabase/config"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import type { OrganizationRow, ProfileRow, UserRole } from "@/lib/db/types"

export type SessionContext = {
  userId: string | null
  role: UserRole | null
  organization: OrganizationRow | null
  profile: ProfileRow | null
  isDemoFallback: boolean
}

export async function getSessionContext(): Promise<SessionContext> {
  if (!isSupabaseConfigured()) {
    return {
      userId: null,
      role: null,
      organization: null,
      profile: null,
      isDemoFallback: true,
    }
  }

  const supabase = await createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("*")
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.organization_id) {
      const { data: organization } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", profile.organization_id)
        .maybeSingle()

      return {
        userId: user.id,
        role: profile.role,
        organization: organization ?? null,
        profile,
        isDemoFallback: false,
      }
    }

    if (profile?.role === "censio_admin") {
      return {
        userId: user.id,
        role: profile.role,
        organization: null,
        profile,
        isDemoFallback: false,
      }
    }
  }

  if (allowUnauthenticatedDemoAccess()) {
    const admin = createAdminClient()
    const { data: organization } = await admin
      .from("organizations")
      .select("*")
      .eq("slug", getDemoOrgSlug())
      .maybeSingle()

    return {
      userId: null,
      role: "client_admin",
      organization: organization ?? null,
      profile: null,
      isDemoFallback: true,
    }
  }

  return {
    userId: null,
    role: null,
    organization: null,
    profile: null,
    isDemoFallback: false,
  }
}

export async function requireOrganizationId(): Promise<string> {
  const ctx = await getSessionContext()
  if (ctx.organization?.id) return ctx.organization.id
  throw new Error("No organization in session")
}
