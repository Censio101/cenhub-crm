import { describe, expect, it } from "vitest"

import { buildDefaultLeadSheetConfig } from "@/lib/lead-sheet/default-config"
import {
  activeSheetColumns,
  clampFormSteps,
  countPartialLeads,
  formProgressText,
  isPartialLead,
  isValidFormStepsTotal,
  sheetHasFormSteps,
  withoutPartialLeads,
} from "@/lib/lead-sheet/form-steps"
import { visibleColumnsForClient } from "@/lib/lead-sheet/client-visibility"
import { buildWebhookLeadSheetInfo } from "@/lib/lead-sheet/webhook-spec"
import { matchesFormFilter } from "@/lib/leads/form-filter"
import { parseStepsCompleted } from "@/lib/leads/inbound-payload"

function sheet(formStepsTotal: number | null) {
  const config = buildDefaultLeadSheetConfig()
  return { ...config, template: { ...config.template, formStepsTotal } }
}

describe("form steps", () => {
  it("accepts 2 to 30 whole steps", () => {
    expect([2, 8, 30].every(isValidFormStepsTotal)).toBe(true)
    expect([1, 31, 2.5, "8", null].some(isValidFormStepsTotal)).toBe(false)
  })

  it("a lead is partial only on a stepped form and below the total", () => {
    expect(isPartialLead({ formStepsDone: 3 }, 8)).toBe(true)
    expect(isPartialLead({ formStepsDone: 8 }, 8)).toBe(false)
    expect(isPartialLead({ formStepsDone: null }, 8)).toBe(false)
    expect(isPartialLead({}, 8)).toBe(false)
    expect(isPartialLead({ formStepsDone: 3 }, null)).toBe(false)
  })

  it("leaves partial leads out and counts them", () => {
    const leads = [
      { id: "a", formStepsDone: 2 },
      { id: "b", formStepsDone: 8 },
      { id: "c", formStepsDone: null },
    ]
    expect(withoutPartialLeads(leads, 8).map((l) => l.id)).toEqual(["b", "c"])
    expect(countPartialLeads(leads, 8)).toBe(1)
    expect(withoutPartialLeads(leads, null)).toHaveLength(3)
    expect(countPartialLeads(leads, null)).toBe(0)
  })

  it("clamps steps and formats the progress text", () => {
    expect(clampFormSteps(12, 8)).toBe(8)
    expect(clampFormSteps(-3, 8)).toBe(0)
    expect(formProgressText(5, 8)).toBe("5/8")
    expect(formProgressText(null, 8)).toBe("")
  })

  it("the Form steps column only counts when the template has a step total", () => {
    const hasColumn = (columns: { kind: string; builtinKey?: string }[]) =>
      columns.some((c) => c.kind === "builtin" && c.builtinKey === "formProgress")
    expect(hasColumn(buildDefaultLeadSheetConfig().columns)).toBe(true)
    expect(sheetHasFormSteps(sheet(null))).toBe(false)
    expect(hasColumn(activeSheetColumns(sheet(null)))).toBe(false)
    expect(hasColumn(activeSheetColumns(sheet(8)))).toBe(true)
    expect(hasColumn(visibleColumnsForClient(sheet(null), []).columns)).toBe(false)
    expect(hasColumn(visibleColumnsForClient(sheet(8), []).columns)).toBe(true)
  })

  it("offers stepsCompleted to webhooks only when partial steps are on", () => {
    expect(buildWebhookLeadSheetInfo(sheet(null))?.standardFieldKeys).not.toContain("stepsCompleted")
    expect(buildWebhookLeadSheetInfo(sheet(8))?.standardFieldKeys).toContain("stepsCompleted")
  })

  it("reads stepsCompleted as a whole number only", () => {
    expect(parseStepsCompleted(3)).toBe(3)
    expect(parseStepsCompleted(" 4 ")).toBe(4)
    expect(parseStepsCompleted(0)).toBe(0)
    expect(parseStepsCompleted(-1)).toBeUndefined()
    expect(parseStepsCompleted(2.5)).toBeUndefined()
    expect(parseStepsCompleted("abc")).toBeUndefined()
    expect(parseStepsCompleted(undefined)).toBeUndefined()
  })

  it("filters the sheet by Complete / Partial", () => {
    const partial = { formStepsDone: 2 }
    const complete = { formStepsDone: 8 }
    const other = { formStepsDone: null }
    expect(matchesFormFilter(partial, 8, "partial")).toBe(true)
    expect(matchesFormFilter(complete, 8, "partial")).toBe(false)
    expect(matchesFormFilter(other, 8, "partial")).toBe(false)
    expect(matchesFormFilter(partial, 8, "complete")).toBe(false)
    expect(matchesFormFilter(complete, 8, "complete")).toBe(true)
    expect(matchesFormFilter(other, 8, "complete")).toBe(true)
    expect(matchesFormFilter(partial, 8, "all")).toBe(true)
  })
})
