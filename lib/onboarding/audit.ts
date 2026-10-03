import { createId, nowIso } from "@/lib/onboarding/ids"
import type { AuditLog, CommercialLine, FixedExpense, StoreData } from "@/lib/onboarding/types"

const MAX_LOGS = 2000

export type AuditQuery = {
  q?: string
  userId?: string
  from?: string
  to?: string
}

export function pushAudit(
  data: StoreData,
  actor: { id: string; name: string },
  entry: { action: string; target: string; change: string }
) {
  const logs = data.auditLogs ?? []
  logs.push({
    id: createId("log"),
    at: nowIso(),
    userId: actor.id,
    userName: actor.name,
    action: entry.action,
    target: entry.target,
    change: entry.change,
  })
  data.auditLogs = logs.slice(-MAX_LOGS)
}

function money(amount: number) {
  return `${new Intl.NumberFormat("da-DK").format(amount)} kr.`
}

function changed(label: string, before: string, after: string) {
  if (before === after) return null
  return `${label}: ${before || ","} → ${after || ","}`
}

function cadenceLabel(cadence: CommercialLine["cadence"]) {
  return cadence === "monthly" ? "pr. md." : "engang"
}

function lineSummary(line: CommercialLine) {
  const price = `${money(line.amount)} ${cadenceLabel(line.cadence)}`
  return line.note ? `${line.name} ${price} (${line.note})` : `${line.name} ${price}`
}

export function describeCustomerChanges(
  before: {
    name: string
    email: string
    contactName: string
    phone: string
    subEmail: string
    cvr: string
    website: string
  },
  after: {
    name: string
    email: string
    contactName: string
    phone: string
    subEmail: string
    cvr: string
    website: string
  }
) {
  return [
    changed("Virksomhed", before.name, after.name),
    changed("E-mail", before.email, after.email),
    changed("Kontakt", before.contactName, after.contactName),
    changed("Telefon", before.phone, after.phone),
    changed("Ekstra e-mail", before.subEmail, after.subEmail),
    changed("CVR", before.cvr, after.cvr),
    changed("Hjemmeside", before.website, after.website),
  ]
    .filter((part): part is string => Boolean(part))
    .join(". ")
}

export function describeLineChanges(before: CommercialLine[], after: CommercialLine[]) {
  const parts: string[] = []
  const beforeById = new Map(before.map((line) => [line.id, line]))
  const afterById = new Map(after.map((line) => [line.id, line]))
  for (const line of after) {
    const previous = beforeById.get(line.id)
    if (!previous) {
      parts.push(`Tilføjede ${lineSummary(line)}`)
      continue
    }
    const bits = [
      previous.name === line.name ? null : `navn ${previous.name} → ${line.name}`,
      previous.amount === line.amount ? null : `${money(previous.amount)} → ${money(line.amount)}`,
      previous.cadence === line.cadence
        ? null
        : `${cadenceLabel(previous.cadence)} → ${cadenceLabel(line.cadence)}`,
      previous.note === line.note ? null : `note ${previous.note || ","} → ${line.note || ","}`,
      previous.startsOn === line.startsOn ? null : `start ${previous.startsOn} → ${line.startsOn}`,
      (previous.endsOn ?? "") === (line.endsOn ?? "")
        ? null
        : `slut ${previous.endsOn || "aktiv"} → ${line.endsOn || "aktiv"}`,
    ].filter((bit): bit is string => Boolean(bit))
    if (bits.length > 0) parts.push(`${previous.name}: ${bits.join(", ")}`)
  }
  for (const line of before) {
    if (!afterById.has(line.id)) parts.push(`Fjernede ${lineSummary(line)}`)
  }
  return parts.join(". ")
}

export function describeExpenseChanges(before: FixedExpense[], after: FixedExpense[]) {
  const parts: string[] = []
  const beforeById = new Map(before.map((line) => [line.id, line]))
  const afterById = new Map(after.map((line) => [line.id, line]))
  for (const line of after) {
    const previous = beforeById.get(line.id)
    if (!previous) {
      parts.push(`Tilføjede ${line.name} ${money(line.amount)}`)
      continue
    }
    const bits = [
      previous.name === line.name ? null : `navn ${previous.name} → ${line.name}`,
      previous.amount === line.amount ? null : `${money(previous.amount)} → ${money(line.amount)}`,
      previous.startsOn === line.startsOn ? null : `start ${previous.startsOn} → ${line.startsOn}`,
      (previous.endsOn ?? "") === (line.endsOn ?? "") ? null : `slut ${previous.endsOn ?? "–"} → ${line.endsOn ?? "–"}`,
      previous.note === line.note ? null : `note ${previous.note || ","} → ${line.note || ","}`,
      previous.url === line.url ? null : `link ${previous.url || ","} → ${line.url || ","}`,
    ].filter((bit): bit is string => Boolean(bit))
    if (bits.length > 0) parts.push(`${previous.name}: ${bits.join(", ")}`)
  }
  for (const line of before) {
    if (!afterById.has(line.id)) parts.push(`Fjernede ${line.name} ${money(line.amount)}`)
  }
  return parts.join(". ")
}

export function filterAuditLogs(logs: AuditLog[], query: AuditQuery): AuditLog[] {
  const q = query.q?.trim().toLowerCase() ?? ""
  const from = query.from?.trim() ?? ""
  const to = query.to?.trim() ?? ""
  return logs
    .filter((log) => {
      if (query.userId && log.userId !== query.userId) return false
      const day = log.at.slice(0, 10)
      if (from && day < from) return false
      if (to && day > to) return false
      if (!q) return true
      const haystack = `${log.userName} ${log.action} ${log.target} ${log.change} ${day}`.toLowerCase()
      return haystack.includes(q)
    })
    .sort((a, b) => b.at.localeCompare(a.at))
}
