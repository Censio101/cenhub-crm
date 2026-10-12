import { toIsoDate } from "@/lib/performance/date-ranges"

/** Calendar date used when a lead first becomes won (or re-won). */
export function todayIsoDate(now = new Date()): string {
  return toIsoDate(now)
}

export function applyWonDateForStatusChange(
  previousStatus: string,
  nextStatus: string,
  existingWonDate: string | null | undefined,
  now = new Date()
): string | null | undefined {
  if (nextStatus === "won" && previousStatus !== "won") {
    return todayIsoDate(now)
  }
  if (nextStatus !== "won" && previousStatus === "won") {
    return null
  }
  return undefined
}

export function wonDateForNewLead(status: string, leadDate: string, now = new Date()): string | null {
  if (status === "won") return todayIsoDate(now)
  return null
}
