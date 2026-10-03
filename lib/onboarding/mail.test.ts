import { afterEach, describe, expect, it, vi } from "vitest"

import { inviteEmailSubject, sendInviteEmail } from "@/lib/onboarding/mail"

afterEach(() => {
  vi.unstubAllEnvs()
  vi.unstubAllGlobals()
})

describe("sendInviteEmail", () => {
  it("returns the invite url without sending when Resend is not configured", async () => {
    vi.stubEnv("RESEND_API_KEY", "")
    const result = await sendInviteEmail({
      to: "anna@kystens.dk",
      name: "Anna",
      companyName: "Kystens Murer",
      url: "http://localhost:3000/velkommen/abc",
      kind: "owner",
    })
    expect(result).toEqual({
      sent: false,
      url: "http://localhost:3000/velkommen/abc",
    })
    expect(inviteEmailSubject("owner")).toBe("I er inviteret til Censio")
  })

  it("posts to Resend when an API key is set", async () => {
    vi.stubEnv("RESEND_API_KEY", "re_test")
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      text: async () => "",
    })
    vi.stubGlobal("fetch", fetchMock)

    const result = await sendInviteEmail({
      to: "anna@kystens.dk",
      name: "Anna",
      companyName: "Kystens Murer",
      url: "http://localhost:3000/velkommen/abc",
      kind: "employee",
    })

    expect(result.sent).toBe(true)
    expect(fetchMock).toHaveBeenCalledOnce()
    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit]
    expect(init.method).toBe("POST")
    const body = JSON.parse(String(init.body)) as { subject: string; to: string }
    expect(body.subject).toBe("Du har fået adgang til Censio")
    expect(body.to).toBe("anna@kystens.dk")
  })
})
