import type { SupabaseClient } from "@supabase/supabase-js"

import type { Locale } from "@/lib/i18n/types"

export async function updateProfilePreferredLocale(
  supabase: SupabaseClient,
  userId: string,
  preferredLocale: Locale
) {
  const { error } = await supabase
    .from("profiles")
    .update({ preferred_locale: preferredLocale })
    .eq("id", userId)

  if (error) throw error
}
