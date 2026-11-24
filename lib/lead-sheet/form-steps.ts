import type { MessageKey } from "@/lib/i18n"
import type { LeadSheetTemplateColumn, ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"

/**
 * Partial steps: a form can send a lead before the visitor has finished it, then send the same
 * lead again (same `externalId`) with more answers. Every call updates one row.
 *
 * Two ways to tell how far a lead got:
 * - Form status: the sender says `partial` or `complete` (`formStatus`). No step count is needed,
 *   so it works when forms have different numbers of steps.
 * - Step total (optional): the template sets `formStepsTotal`, each lead stores the steps done
 *   (`formStepsDone`), and the lead stays partial until that total is reached.
 *
 * Leads without either (all other sources) are complete.
 */

export const FORM_STEPS_MIN = 2
export const FORM_STEPS_MAX = 30

export type FormStatus = "partial" | "complete"

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

/** "partial" or "complete" (any case); anything else is not a form status. */
export function parseFormStatus(value: unknown): FormStatus | undefined {
  if (typeof value !== "string") return undefined
  const text = value.trim().toLowerCase()
  if (text === "partial") return "partial"
  if (text === "complete" || text === "completed") return "complete"
  return undefined
}

/** The built-in "Form steps" column. */
export function isFormProgressColumn(column: LeadSheetTemplateColumn): boolean {
  return column.kind === "builtin" && column.builtinKey === "formProgress"
}

/**
 * True when partial steps is on. A saved step total also counts, so clients who already set a
 * number keep it on.
 */
export function sheetHasFormSteps(config: Pick<ResolvedLeadSheetConfig, "template"> | null): boolean {
  if (!config) return false
  return config.template.formStepsColumn === true || isValidFormStepsTotal(config.template.formStepsTotal)
}

/**
 * The columns that are in use: the "Form steps" column only counts when partial steps is on.
 * Every template stores that column, so it is filtered out here when the feature is off.
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

/**
 * What the Form steps column shows for a lead: "5/8" when there is a total and a step count,
 * otherwise "Partial" or "Complete" from the form status, otherwise empty.
 */
export function leadFormProgressText(
  lead: { formStepsDone?: number | null; formStatus?: FormStatus | null },
  total: number | null | undefined,
  t: (key: MessageKey) => string
): string {
  if (lead.formStepsDone != null && isValidFormStepsTotal(total)) {
    return formProgressText(lead.formStepsDone, total)
  }
  if (lead.formStatus === "partial") return t("formStatusPartial")
  if (lead.formStatus === "complete") return t("formProgressComplete")
  return ""
}

/** Steps done, never above the total and never below zero. */
export function clampFormSteps(done: number, total: number): number {
  return Math.min(Math.max(Math.trunc(done), 0), total)
}

type FormProgressLead = { formStepsDone?: number | null; formStatus?: FormStatus | null }

/** True when the lead came from a form that has not been finished. */
export function isPartialLead(
  lead: FormProgressLead,
  formStepsTotal: number | null | undefined
): boolean {
  // The sender's own word wins: a partial lead is partial, a completed one is complete.
  if (lead.formStatus === "partial") return true
  if (lead.formStatus === "complete") return false
  if (!isValidFormStepsTotal(formStepsTotal)) return false
  if (lead.formStepsDone == null) return false
  return lead.formStepsDone < formStepsTotal
}

/** Leads the dashboard counts: everything except partial leads. */
export function withoutPartialLeads<T extends FormProgressLead>(
  leads: readonly T[],
  formStepsTotal: number | null | undefined
): T[] {
  return leads.filter((lead) => !isPartialLead(lead, formStepsTotal))
}

export function countPartialLeads(
  leads: readonly FormProgressLead[],
  formStepsTotal: number | null | undefined
): number {
  return leads.reduce((sum, lead) => sum + (isPartialLead(lead, formStepsTotal) ? 1 : 0), 0)
}
