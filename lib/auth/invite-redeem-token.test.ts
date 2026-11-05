import { describe, expect, it } from "vitest"

import {
  createInviteRedeemToken,
  inviteRedeemTokenMatches,
} from "@/lib/auth/invite-redeem-token"

describe("inviteRedeemTokenMatches", () => {
  it("accepts only the token that was issued", () => {
    const issued = createInviteRedeemToken()
    expect(inviteRedeemTokenMatches(issued.hash, issued.token)).toBe(true)
    expect(inviteRedeemTokenMatches(issued.hash, issued.token.replace(/.$/, "0"))).toBe(false)
    expect(inviteRedeemTokenMatches(null, issued.token)).toBe(false)
    expect(inviteRedeemTokenMatches(issued.hash, "short")).toBe(false)
  })
})
