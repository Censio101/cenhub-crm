import { CURRENT_COMPANY } from "@/lib/company"
import {
  ALL_SERVICE_IDS,
  SERVICES,
  isServiceId,
  type NamedService,
} from "@/lib/performance/services"

export const ACCOUNT_SETTINGS_KEY = "censio-account-settings"

export type EmployeeRole = "admin" | "medarbejder"

export type EmployeeAccess = {
  id: string
  name: string
  email: string
  role: EmployeeRole
  status: "active" | "invited"
}

export type AccountSettings = {
  profileImage: string
  logo: string
  email: string
  employees: EmployeeAccess[]
  enabledServiceIds: string[]
  customServices: NamedService[]
  hvidbjergPartner: boolean
}

export const DEFAULT_ACCOUNT_SETTINGS: AccountSettings = {
  profileImage: CURRENT_COMPANY.image,
  logo: CURRENT_COMPANY.logo,
  email: "kontakt@nordkystens-tomrer.dk",
  employees: [
    {
      id: "owner-1",
      name: "Ejer",
      email: "kontakt@nordkystens-tomrer.dk",
      role: "admin",
      status: "active",
    },
  ],
  enabledServiceIds: [...ALL_SERVICE_IDS],
  customServices: [],
  hvidbjergPartner: true,
}

export function parseHvidbjergPartner(value: unknown): boolean {
  return typeof value === "boolean"
    ? value
    : DEFAULT_ACCOUNT_SETTINGS.hvidbjergPartner
}

export function parseCustomServices(value: unknown): NamedService[] {
  if (!Array.isArray(value)) return []
  const seen = new Set<string>()
  const next: NamedService[] = []
  for (const item of value) {
    if (!item || typeof item !== "object") continue
    const record = item as { id?: unknown; label?: unknown }
    const id = typeof record.id === "string" ? record.id.trim() : ""
    const label = typeof record.label === "string" ? record.label.trim() : ""
    if (!id || !label || seen.has(id) || isServiceId(id)) continue
    seen.add(id)
    next.push({ id, label })
  }
  return next
}

export function parseEnabledServiceIds(
  value: unknown,
  customServices: readonly NamedService[] = []
): string[] {
  const customIds = customServices.map((service) => service.id)
  if (!Array.isArray(value)) return [...ALL_SERVICE_IDS, ...customIds]
  const allowed = new Set<string>([...ALL_SERVICE_IDS, ...customIds])
  const seen = new Set<string>()
  const next: string[] = []
  for (const id of value) {
    if (typeof id !== "string" || !allowed.has(id) || seen.has(id)) continue
    seen.add(id)
    next.push(id)
  }
  return next
}

export function addEnabledServiceId(
  current: readonly string[],
  id: string
): string[] {
  if (!isServiceId(id) || current.includes(id)) {
    return [...current]
  }
  return ALL_SERVICE_IDS.filter((item) => item === id || current.includes(item)).concat(
    current.filter((item) => !isServiceId(item))
  )
}

export function removeEnabledServiceId(
  current: readonly string[],
  id: string
): string[] {
  return current.filter((item) => item !== id)
}

export function getEnabledServices(
  ids: readonly string[],
  customServices: readonly NamedService[] = []
): NamedService[] {
  const customById = new Map(customServices.map((service) => [service.id, service]))
  return ids.flatMap((id) => {
    const preset = SERVICES.find((service) => service.id === id)
    if (preset) return [preset]
    const custom = customById.get(id)
    return custom ? [custom] : []
  })
}

export function getAvailableServices(ids: readonly string[]): NamedService[] {
  return SERVICES.filter((service) => !ids.includes(service.id))
}

export function slugifyServiceLabel(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/æ/g, "ae")
    .replace(/ø/g, "oe")
    .replace(/å/g, "aa")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
}

export function createCustomService(
  label: string,
  existing: readonly NamedService[]
): NamedService {
  const trimmed = label.trim()
  const base = slugifyServiceLabel(trimmed) || `ydelse-${Date.now().toString(36)}`
  let id = base
  let suffix = 2
  const taken = new Set(existing.map((service) => service.id))
  while (taken.has(id) || isServiceId(id)) {
    id = `${base}-${suffix}`
    suffix += 1
  }
  return { id, label: trimmed }
}

export function getEmployeeRoleLabel(role: EmployeeRole): string {
  return role === "admin" ? "Admin" : "Medarbejder"
}

export function readAccountSettings(): AccountSettings {
  if (typeof window === "undefined") return DEFAULT_ACCOUNT_SETTINGS
  try {
    const raw = window.localStorage.getItem(ACCOUNT_SETTINGS_KEY)
    if (!raw) return DEFAULT_ACCOUNT_SETTINGS
    const parsed = JSON.parse(raw) as Partial<AccountSettings>
    const customServices = parseCustomServices(parsed.customServices)
    return {
      profileImage: parsed.profileImage || DEFAULT_ACCOUNT_SETTINGS.profileImage,
      logo: parsed.logo || DEFAULT_ACCOUNT_SETTINGS.logo,
      email: parsed.email || DEFAULT_ACCOUNT_SETTINGS.email,
      employees:
        parsed.employees && parsed.employees.length > 0
          ? parsed.employees
          : DEFAULT_ACCOUNT_SETTINGS.employees,
      customServices,
      enabledServiceIds: parseEnabledServiceIds(
        parsed.enabledServiceIds,
        customServices
      ),
      hvidbjergPartner: parseHvidbjergPartner(parsed.hvidbjergPartner),
    }
  } catch {
    return DEFAULT_ACCOUNT_SETTINGS
  }
}

export function writeAccountSettings(settings: AccountSettings) {
  window.localStorage.setItem(ACCOUNT_SETTINGS_KEY, JSON.stringify(settings))
}
