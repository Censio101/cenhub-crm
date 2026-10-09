import type { MessageKey } from "@/lib/i18n"
import type { LeadStatusId } from "@/lib/leads"

export type StatusFilterGroupId =
  | "all"
  | "new"
  | "calls"
  | "waiting"
  | "proposal"
  | "outcomes"

export type StatusFilterGroup = {
  id: StatusFilterGroupId
  /** i18n key: leadSheetFilterGroup* */
  labelKey: MessageKey
  statuses: readonly LeadStatusId[]
  /** When true, UI shows a second row of per-status chips for this group. */
  showSubChips: boolean
}

export const STATUS_FILTER_GROUPS: readonly StatusFilterGroup[] = [
  { id: "new", labelKey: "leadSheetFilterGroupNew", statuses: ["new_waiting_call"], showSubChips: false },
  {
    id: "calls",
    labelKey: "leadSheetFilterGroupCalls",
    statuses: ["call_1", "call_2", "call_3", "call_4", "call_5"],
    showSubChips: true,
  },
  {
    id: "waiting",
    labelKey: "leadSheetFilterGroupWaiting",
    statuses: ["waiting_on_client", "client_waiting_on_us"],
    showSubChips: false,
  },
  {
    id: "proposal",
    labelKey: "leadSheetFilterGroupProposal",
    statuses: ["awaiting_proposal", "proposal_sent"],
    showSubChips: false,
  },
  {
    id: "outcomes",
    labelKey: "leadSheetFilterGroupOutcomes",
    statuses: ["won", "lost", "not_qualified"],
    showSubChips: false,
  },
] as const

const GROUP_UNION_PREFIX = "group:" as const

export type StatusFilterValue = LeadStatusId | "all" | `${typeof GROUP_UNION_PREFIX}${StatusFilterGroupId}`

export function groupUnionFilter(groupId: StatusFilterGroupId): StatusFilterValue {
  return `${GROUP_UNION_PREFIX}${groupId}`
}

export function parseGroupUnionFilter(filter: StatusFilterValue): StatusFilterGroupId | null {
  if (typeof filter === "string" && filter.startsWith(GROUP_UNION_PREFIX)) {
    return filter.slice(GROUP_UNION_PREFIX.length) as StatusFilterGroupId
  }
  return null
}

export function statusBelongsToGroup(status: LeadStatusId, groupId: StatusFilterGroupId): boolean {
  if (groupId === "all") return true
  const group = STATUS_FILTER_GROUPS.find((g) => g.id === groupId)
  return group ? group.statuses.includes(status) : false
}

export function groupForStatus(status: LeadStatusId): StatusFilterGroupId | null {
  for (const group of STATUS_FILTER_GROUPS) {
    if (group.statuses.includes(status)) return group.id
  }
  return null
}

export function countForGroup(
  counts: Partial<Record<LeadStatusId, number>>,
  groupId: StatusFilterGroupId
): number {
  if (groupId === "all") {
    return Object.values(counts).reduce((sum, n) => sum + (n ?? 0), 0)
  }
  const group = STATUS_FILTER_GROUPS.find((g) => g.id === groupId)
  if (!group) return 0
  return group.statuses.reduce((sum, id) => sum + (counts[id] ?? 0), 0)
}

export function matchesStatusFilter(leadStatus: LeadStatusId, filter: StatusFilterValue): boolean {
  if (filter === "all") return true
  const groupId = parseGroupUnionFilter(filter)
  if (groupId) return statusBelongsToGroup(leadStatus, groupId)
  return leadStatus === filter
}

export function activeGroupForFilter(filter: StatusFilterValue): StatusFilterGroupId | "all" {
  if (filter === "all") return "all"
  const groupId = parseGroupUnionFilter(filter)
  if (groupId) return groupId
  return groupForStatus(filter as LeadStatusId) ?? "all"
}

/** Default filter when a group chip is clicked (union for multi-status groups). */
export function defaultFilterForGroup(groupId: StatusFilterGroupId): StatusFilterValue {
  const group = STATUS_FILTER_GROUPS.find((g) => g.id === groupId)
  if (!group) return "all"
  if (group.statuses.length === 1) return group.statuses[0]
  return groupUnionFilter(groupId)
}
