import { describe, expect, it } from "vitest"

import { emptyLead, type Lead } from "@/lib/leads"
import { computeStepMergePatch } from "@/lib/leads/funnel-webhook-step-merge"

function lead(patch: Partial<Lead> = {}): Lead {
  return { ...emptyLead("l1"), ...patch }
}

describe("computeStepMergePatch", () => {
  it("fills empty fields and raises the step count", () => {
    const existing = lead({ fullName: "Anna", email: "a@x.dk", phone: "123", formStepsDone: 1 })
    const incoming = lead({ fullName: "Anna", email: "a@x.dk", phone: "123", address: "Vej 1", city: "Aarhus" })
    const patch = computeStepMergePatch(existing, incoming, { build_year: 1985 }, 2, 8)
    expect(patch).toMatchObject({
      address: "Vej 1",
      city: "Aarhus",
      customFields: { build_year: 1985 },
      formStepsDone: 2,
    })
    expect(patch.fullName).toBeUndefined()
  })

  it("never lowers the step count (late or out-of-order calls)", () => {
    const patch = computeStepMergePatch(lead({ formStepsDone: 5 }), lead(), {}, 3, 8)
    expect(patch.formStepsDone).toBeUndefined()
  })

  it("never goes above the total", () => {
    const patch = computeStepMergePatch(lead({ formStepsDone: 7 }), lead(), {}, 99, 8)
    expect(patch.formStepsDone).toBe(8)
  })

  it("replaces filled values only while nobody has worked on the lead", () => {
    const incoming = lead({ phone: "999" })
    const untouched = computeStepMergePatch(
      lead({ phone: "111", status: "new_waiting_call" }),
      incoming,
      { note: "new" },
      2,
      8
    )
    expect(untouched.phone).toBe("999")

    const worked = computeStepMergePatch(
      lead({ phone: "111", status: "call_1", customFields: { note: "mine" } }),
      incoming,
      { note: "new" },
      2,
      8
    )
    expect(worked.phone).toBeUndefined()
    expect(worked.customFields).toBeUndefined()
  })

  it("keeps custom values already in the lead and ignores empty incoming ones", () => {
    const existing = lead({ status: "call_1", customFields: { a: "keep" } })
    const patch = computeStepMergePatch(existing, lead(), { a: "other", b: "", c: "added" }, 2, 8)
    expect(patch.customFields).toEqual({ a: "keep", c: "added" })
  })

  it("returns nothing when there is nothing new", () => {
    const existing = lead({ fullName: "Anna", formStepsDone: 3 })
    const patch = computeStepMergePatch(existing, lead({ fullName: "Anna" }), {}, 3, 8)
    expect(patch).toEqual({})
  })
})
