"use client"

import { useSession } from "@/components/session/SessionProvider"
import type { UserRole } from "@/lib/db/types"
import { useSupabaseSession } from "@/lib/auth/use-supabase-session"

type UserProfile = {
  userId: string | null
  role: UserRole | null
  loading: boolean
}

export function useUserProfile(): UserProfile {
  const { configured, isAuthenticated, loading: authLoading } = useSupabaseSession()
  const { user, role, loading: sessionLoading } = useSession()

  if (!configured) {
    return { userId: null, role: null, loading: false }
  }

  if (!isAuthenticated) {
    return { userId: null, role: null, loading: authLoading }
  }

  return {
    userId: user?.id ?? null,
    role,
    loading: sessionLoading || authLoading,
  }
}
