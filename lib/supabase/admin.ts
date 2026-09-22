import { createClient } from "@supabase/supabase-js"

import {
  getSupabaseServiceRoleKey,
  getSupabaseUrl,
  isSupabaseConfigured,
} from "@/lib/supabase/config"

export function createAdminClient() {
  if (!isSupabaseConfigured()) {
    throw new Error("Supabase is not configured")
  }

  return createClient(getSupabaseUrl(), getSupabaseServiceRoleKey(), {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  })
}
