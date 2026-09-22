import { cookies } from "next/headers"

import { ACTIVE_ORG_COOKIE } from "@/lib/auth/active-organization"
import {
  allowUnauthenticatedDemoAccess,
  getDemoOrgSlug,
  isSupabaseConfigured,
} from "@/lib/supabase/config"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import type { OrganizationRow, ProfileRow, UserRole } from "@/lib/db/types"

export type SessionContext = {
  userId: string | null
  role: UserRole | null
  organization: OrganizationRow | null
  profile: ProfileRow | null
  isDemoFallback: boolean
  isAdminViewingClient: boolean
}

async function readActiveOrgSlug(): Promise<string | null> {
  try {
    const cookieStore = await cookies()
    const value = cookieStore.get(ACTIVE_ORG_COOKIE)?.value?.trim()
    return value || null
  } catch {
    return null
  }
}

export async function getSessionContext(): Promise<SessionContext> {
  if (!isSupabaseConfigured()) {
    return {
      userId: null,
      role: null,
      organization: null,
      profile: null,
      isDemoFallback: true,
      isAdminViewingClient: false,
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
        isAdminViewingClient: false,
      }
    }

    if (profile?.role === "censio_admin") {
      const activeSlug = await readActiveOrgSlug()
      if (activeSlug) {
        const admin = createAdminClient()
        const organization = await getOrganizationBySlug(admin, activeSlug)
        if (organization) {
          return {
            userId: user.id,
            role: profile.role,
            organization,
            profile,
            isDemoFallback: false,
            isAdminViewingClient: true,
          }
        }
      }

      return {
        userId: user.id,
        role: profile.role,
        organization: null,
        profile,
        isDemoFallback: false,
        isAdminViewingClient: false,
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
      isAdminViewingClient: false,
    }
  }

  return {
    userId: null,
    role: null,
    organization: null,
    profile: null,
    isDemoFallback: false,
    isAdminViewingClient: false,
  }
}

export async function requireOrganizationId(): Promise<string> {
  const ctx = await getSessionContext()
  if (ctx.organization?.id) return ctx.organization.id
  throw new Error("No organization in session")
}
