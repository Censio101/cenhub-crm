import { normalizeParsedStore } from "@/lib/onboarding/normalize-store"
import { readStoreFromSupabase } from "@/lib/onboarding/supabase/read-store"
import { writeStoreToSupabase } from "@/lib/onboarding/supabase/write-store"
import { createSeedStore, type StoreApi } from "@/lib/onboarding/store"
import type { StoreData } from "@/lib/onboarding/types"

function cloneStore(data: StoreData): StoreData {
  return structuredClone(data)
}

export function createSupabaseStore(): StoreApi {
  let writeQueue: Promise<unknown> = Promise.resolve()

  return {
    async read() {
      const raw = await readStoreFromSupabase()
      const empty =
        raw.workspaces.length === 0 &&
        raw.users.length === 0 &&
        raw.offers.length === 0 &&
        raw.commercialLines.length === 0
      if (empty) {
        const seeded = createSeedStore()
        await writeStoreToSupabase(seeded)
        return cloneStore(seeded)
      }
      return normalizeParsedStore(raw)
    },
    async update(mutator) {
      const run = writeQueue.then(async () => {
        const raw = await readStoreFromSupabase()
        const data = normalizeParsedStore(raw)
        const result = mutator(data)
        await writeStoreToSupabase(data)
        return result
      })
      writeQueue = run.then(
        () => undefined,
        () => undefined
      )
      return run
    },
  }
}
