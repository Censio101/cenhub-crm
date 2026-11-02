import { describe, expect, it } from "vitest"

import { emptyLead } from "@/lib/leads"
import { partialLeadCount } from "@/lib/performance/form-completion"

describe("partialLeadCount", () => {
  const range = { start: new Date("2026-10-01T00:00:00"), end: new Date("2026-10-31T23:59:59") }
  const partial = (id: string, date: string) => ({ ...emptyLead(id), date, formStepsDone: 2 })

  it("counts partial leads created in the period only", () => {
    const leads = [partial("a", "2026-10-05"), partial("b", "2026-10-20"), partial("c", "2026-09-30")]
    expect(partialLeadCount(leads, range)).toBe(2)
  })

  it("is zero without partial leads", () => {
    expect(partialLeadCount([], range)).toBe(0)
  })
})
