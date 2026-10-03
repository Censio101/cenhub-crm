import { getSupabaseAdmin } from "@/lib/onboarding/supabase/client"
import { serializeStoreForRpc } from "@/lib/onboarding/supabase/serialize-store"
import type { StoreData } from "@/lib/onboarding/types"

export async function writeStoreToSupabase(data: StoreData): Promise<void> {
  const supabase = getSupabaseAdmin()
  const payload = serializeStoreForRpc(data)
  const { error } = await supabase.rpc("ci_replace_store", { p_payload: payload })
  if (error) {
    throw new Error(`Supabase gem fejlede: ${error.message}`)
  }
}
