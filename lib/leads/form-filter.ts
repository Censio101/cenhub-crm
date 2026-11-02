import { isPartialLead } from "@/lib/lead-sheet/form-steps"

/** Lead sheet filter for stepped forms: all leads, only finished forms, or only partial ones. */
export type FormFilterValue = "all" | "complete" | "partial"

export function matchesFormFilter(
  lead: { formStepsDone?: number | null },
  formStepsTotal: number | null | undefined,
  filter: FormFilterValue
): boolean {
  if (filter === "all") return true
  const partial = isPartialLead(lead, formStepsTotal)
  return filter === "partial" ? partial : !partial
}
