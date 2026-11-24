import { describe, expect, it } from "vitest"

import { buildDefaultLeadSheetConfig } from "@/lib/lead-sheet/default-config"
import {
  activeSheetColumns,
  clampFormSteps,
  countPartialLeads,
  formProgressText,
  isPartialLead,
  isValidFormStepsTotal,
  leadFormProgressText,
  parseFormStatus,
  sheetHasPartialSteps,
  sheetShowsStepsColumn,
  withoutPartialLeads,
} from "@/lib/lead-sheet/form-steps"
import { visibleColumnsForClient } from "@/lib/lead-sheet/client-visibility"
import { buildWebhookLeadSheetInfo } from "@/lib/lead-sheet/webhook-spec"
import { matchesFormFilter } from "@/lib/leads/form-filter"
import { parseCanonicalInbound, parseStepsCompleted } from "@/lib/leads/inbound-payload"

function sheet(
  formStepsTotal: number | null,
  { partial = false, column = false }: { partial?: boolean; column?: boolean } = {}
) {
  const config = buildDefaultLeadSheetConfig()
  return {
    ...config,
    template: {
      ...config.template,
      formStepsTotal,
      formPartialSteps: partial,
      formStepsColumn: column,
    },
  }
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

  it("shows the Form steps column only when its own switch is on, or a total is already saved", () => {
    const hasColumn = (columns: { kind: string; builtinKey?: string }[]) =>
      columns.some((c) => c.kind === "builtin" && c.builtinKey === "formProgress")
    expect(hasColumn(buildDefaultLeadSheetConfig().columns)).toBe(true)
    expect(sheetShowsStepsColumn(sheet(null))).toBe(false)
    expect(hasColumn(activeSheetColumns(sheet(null)))).toBe(false)
    expect(hasColumn(activeSheetColumns(sheet(8)))).toBe(true)
    expect(hasColumn(activeSheetColumns(sheet(null, { column: true })))).toBe(true)
    // Partial steps alone does not add the column.
    expect(hasColumn(activeSheetColumns(sheet(null, { partial: true })))).toBe(false)
    expect(hasColumn(visibleColumnsForClient(sheet(null), []).columns)).toBe(false)
    expect(hasColumn(visibleColumnsForClient(sheet(8), []).columns)).toBe(true)
    expect(hasColumn(visibleColumnsForClient(sheet(null, { column: true }), []).columns)).toBe(true)
  })

  it("partial steps and the column are separate switches", () => {
    expect(sheetHasPartialSteps(sheet(null))).toBe(false)
    expect(sheetHasPartialSteps(sheet(null, { partial: true }))).toBe(true)
    // The column alone does not turn partial steps on.
    expect(sheetHasPartialSteps(sheet(null, { column: true }))).toBe(false)
    // A saved total means both are on.
    expect(sheetHasPartialSteps(sheet(8))).toBe(true)
    expect(sheetShowsStepsColumn(sheet(8))).toBe(true)
  })

  it("offers the partial steps webhook fields with partial steps, even when the column is hidden", () => {
    const keys = (s: ReturnType<typeof sheet>) => buildWebhookLeadSheetInfo(s)?.standardFieldKeys
    expect(keys(sheet(null))).not.toContain("stepsCompleted")
    expect(keys(sheet(null))).not.toContain("formStatus")
    expect(keys(sheet(null, { partial: true }))).toContain("stepsCompleted")
    expect(keys(sheet(null, { partial: true }))).toContain("formStatus")
    expect(keys(sheet(8))).toContain("formStatus")
    // The column on its own does not open the webhook fields.
    expect(keys(sheet(null, { column: true }))).not.toContain("formStatus")
  })

  it("reads partial / complete in any case and ignores anything else", () => {
    expect(parseFormStatus("partial")).toBe("partial")
    expect(parseFormStatus(" Complete ")).toBe("complete")
    expect(parseFormStatus("completed")).toBe("complete")
    expect(parseFormStatus("test")).toBeUndefined()
    expect(parseFormStatus("new_waiting_call")).toBeUndefined()
    expect(parseFormStatus(undefined)).toBeUndefined()
  })

  it("uses the form status when there is no step total", () => {
    expect(isPartialLead({ formStatus: "partial" }, null)).toBe(true)
    expect(isPartialLead({ formStatus: "complete" }, null)).toBe(false)
    // The sender's word wins over a step count.
    expect(isPartialLead({ formStatus: "complete", formStepsDone: 1 }, 8)).toBe(false)
    expect(isPartialLead({ formStatus: "partial", formStepsDone: 8 }, 8)).toBe(true)
    const leads = [
      { id: "a", formStatus: "partial" as const },
      { id: "b", formStatus: "complete" as const },
      { id: "c", formStatus: null },
    ]
    expect(withoutPartialLeads(leads, null).map((l) => l.id)).toEqual(["b", "c"])
    expect(countPartialLeads(leads, null)).toBe(1)
  })

  it("the column text is n/total with a total, otherwise Partial or Complete", () => {
    const t = (key: string) => key
    expect(leadFormProgressText({ formStepsDone: 3 }, 8, t)).toBe("3/8")
    expect(leadFormProgressText({ formStatus: "partial" }, null, t)).toBe("formStatusPartial")
    expect(leadFormProgressText({ formStatus: "complete" }, null, t)).toBe("formProgressComplete")
    expect(leadFormProgressText({}, null, t)).toBe("")
  })

  it("accepts a plain status field that says partial or complete", () => {
    const base = { fullName: "Jane", email: "j@x.dk" }
    const read = (body: Record<string, unknown>) => {
      const parsed = parseCanonicalInbound(body)
      return parsed.ok ? parsed.lead.formStatus : "invalid"
    }
    expect(read({ ...base, status: "partial" })).toBe("partial")
    expect(read({ ...base, formStatus: "complete" })).toBe("complete")
    expect(read({ ...base, status: "partial", formStatus: "complete" })).toBe("complete")
    // A CRM pipeline status is not a form status.
    expect(read({ ...base, status: "new_waiting_call" })).toBeUndefined()
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
