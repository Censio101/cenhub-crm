import type { LeadSheetTemplateColumn, ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"

/**
 * Partial steps: a funnel can send a lead after every step of its form. The lead sheet template
 * sets the total number of steps (`formStepsTotal`); each lead stores how many were completed
 * (`formStepsDone`). A lead is partial until every step is done. Leads without a step count (all
 * other sources) are complete.
 */

export const FORM_STEPS_MIN = 2
export const FORM_STEPS_MAX = 30

export function isValidFormStepsTotal(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= FORM_STEPS_MIN &&
    value <= FORM_STEPS_MAX
  )
}

/** Reads a stored total; anything unusable means the feature is off. */
export function parseFormStepsTotal(value: unknown): number | null {
  return isValidFormStepsTotal(value) ? value : null
}

/** The built-in "Form steps" column. */
export function isFormProgressColumn(column: LeadSheetTemplateColumn): boolean {
  return column.kind === "builtin" && column.builtinKey === "formProgress"
}

/** True when the sheet's template has partial steps switched on. */
export function sheetHasFormSteps(config: Pick<ResolvedLeadSheetConfig, "template"> | null): boolean {
  return isValidFormStepsTotal(config?.template.formStepsTotal)
}

/**
 * The columns that are in use: the "Form steps" column only counts when the template has a step
 * total. Every template stores that column, so it is filtered out here when the feature is off.
 */
export function activeSheetColumns(config: ResolvedLeadSheetConfig): LeadSheetTemplateColumn[] {
  if (sheetHasFormSteps(config)) return config.columns
  return config.columns.filter((column) => !isFormProgressColumn(column))
}

/** "5/8" for the sheet export; empty when the lead has no step count. */
export function formProgressText(
  done: number | null | undefined,
  total: number | null | undefined
): string {
  if (done == null) return ""
  return isValidFormStepsTotal(total) ? `${Math.min(done, total)}/${total}` : String(done)
}

/** Steps done, never above the total and never below zero. */
export function clampFormSteps(done: number, total: number): number {
  return Math.min(Math.max(Math.trunc(done), 0), total)
}

/** True when the lead came from a stepped form and has not finished it. */
export function isPartialLead(
  lead: { formStepsDone?: number | null },
  formStepsTotal: number | null | undefined
): boolean {
  if (!isValidFormStepsTotal(formStepsTotal)) return false
  if (lead.formStepsDone == null) return false
  return lead.formStepsDone < formStepsTotal
}

/** Leads the dashboard counts: everything except partial leads. */
export function withoutPartialLeads<T extends { formStepsDone?: number | null }>(
  leads: readonly T[],
  formStepsTotal: number | null | undefined
): T[] {
  if (!isValidFormStepsTotal(formStepsTotal)) return [...leads]
  return leads.filter((lead) => !isPartialLead(lead, formStepsTotal))
}

export function countPartialLeads(
  leads: readonly { formStepsDone?: number | null }[],
  formStepsTotal: number | null | undefined
): number {
  if (!isValidFormStepsTotal(formStepsTotal)) return 0
  return leads.reduce((sum, lead) => sum + (isPartialLead(lead, formStepsTotal) ? 1 : 0), 0)
}
