import type { SupabaseClient } from "@supabase/supabase-js"

export async function updateProfileAvatar(
  supabase: SupabaseClient,
  userId: string,
  avatarUrl: string | null
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ avatar_url: avatarUrl, updated_at: new Date().toISOString() })
    .eq("id", userId)

  if (error) throw error
}
