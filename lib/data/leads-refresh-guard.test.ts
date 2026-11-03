import { describe, expect, it } from "vitest"

import {
  canReplaceLeadsFromServer,
  shouldQueueRemoteLeadsReload,
} from "@/lib/data/leads-refresh-guard"

describe("canReplaceLeadsFromServer", () => {
  it("allows replace when nothing is saving or queued", () => {
    expect(canReplaceLeadsFromServer(0, 0)).toBe(true)
  })

  it("blocks replace while a save is in flight or an edit is queued", () => {
    expect(canReplaceLeadsFromServer(1, 0)).toBe(false)
    expect(canReplaceLeadsFromServer(0, 1)).toBe(false)
    expect(canReplaceLeadsFromServer(2, 3)).toBe(false)
  })
})

describe("shouldQueueRemoteLeadsReload", () => {
  it("queues when replace would be unsafe", () => {
    expect(shouldQueueRemoteLeadsReload(0, 1)).toBe(true)
    expect(shouldQueueRemoteLeadsReload(1, 0)).toBe(true)
  })

  it("does not queue when idle", () => {
    expect(shouldQueueRemoteLeadsReload(0, 0)).toBe(false)
  })
})
