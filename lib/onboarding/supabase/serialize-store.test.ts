import { describe, expect, it } from "vitest"

import { emptyStore } from "@/lib/onboarding/store"
import { serializeStoreForRpc } from "@/lib/onboarding/supabase/serialize-store"

describe("serializeStoreForRpc", () => {
  it("maps StoreData keys expected by ci_replace_store", () => {
    const payload = serializeStoreForRpc(emptyStore())
    expect(payload).toHaveProperty("workspaces")
    expect(payload).toHaveProperty("commercialLines")
    expect(payload).toHaveProperty("offerEngagement")
    expect(payload.workspaces).toEqual([])
  })
})
