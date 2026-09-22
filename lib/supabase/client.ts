"use client"

import { createBrowserClient } from "@supabase/ssr"

import {
  getSupabaseAnonKey,
  getSupabaseUrl,
} from "@/lib/supabase/config"

export function createClient() {
  return createBrowserClient(getSupabaseUrl(), getSupabaseAnonKey())
}

export function isBrowserSupabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  )
}
