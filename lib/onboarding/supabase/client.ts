import { createClient, type SupabaseClient } from "@supabase/supabase-js"

let adminClient: SupabaseClient | null = null

export function isSupabaseStoreConfigured(): boolean {
  return Boolean(process.env.SUPABASE_URL?.trim() && process.env.SUPABASE_SERVICE_ROLE_KEY?.trim())
}

export function getSupabaseAdmin(): SupabaseClient {
  const url = process.env.SUPABASE_URL?.trim()
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
  if (!url || !key) {
    throw new Error("Supabase er ikke konfigureret (SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY).")
  }
  if (!adminClient) {
    adminClient = createClient(url, key, {
      auth: { persistSession: false, autoRefreshToken: false },
    })
  }
  return adminClient
}

export const CONTRACTS_BUCKET = "censio-internal-contracts"
