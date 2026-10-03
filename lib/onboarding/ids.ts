import { randomBytes } from "node:crypto"

export function createId(prefix: string): string {
  return `${prefix}_${randomBytes(8).toString("hex")}`
}

export function createToken(): string {
  return randomBytes(24).toString("hex")
}

export function nowIso(date = new Date()): string {
  return date.toISOString()
}

export function addDaysIso(days: number, date = new Date()): string {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next.toISOString()
}

export const INVITE_TTL_DAYS = 7
