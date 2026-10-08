import { randomUUID } from "node:crypto"

import type { SupabaseClient } from "@supabase/supabase-js"

import { toIsoDate } from "@/lib/performance/date-ranges"

import { syncCustomerForWonLead } from "@/lib/db/customers-sync"
import { leadToInsertRow } from "@/lib/db/lead-mapper"
import {
  addFieldToTemplate,
  createEmptyTemplate,
  createLibraryField,
  getLeadSheetTemplateById,
  listCustomFieldDefs,
  setOrganizationLeadSheetTemplateId,
} from "@/lib/db/lead-sheet-repository"
import {
  createService,
  getOrganizationServicesView,
  listManualServices,
  saveOrganizationServices,
} from "@/lib/db/services-repository"
import type { LeadSheetCustomFieldDef, CustomFieldType } from "@/lib/lead-sheet/types"
import type { Lead, LeadStatusId } from "@/lib/leads"

export const SUNTECH_TEMPLATE_NAME = "Solar panel template"
export const SUNTECH_SEED_LEGACY_PREFIX = "suntech-demo-"

const CUSTOM_FIELD_SPECS: Array<{
  fieldKey: string
  label: string
  fieldType: CustomFieldType
  config?: Record<string, unknown>
}> = [
  { fieldKey: "suntech_site_reference", label: "Site reference", fieldType: "text" },
  { fieldKey: "suntech_consultation_notes", label: "Notes", fieldType: "textarea" },
  { fieldKey: "suntech_estimated_kwh", label: "Estimated annual kWh", fieldType: "number" },
  {
    fieldKey: "suntech_installation_type",
    label: "Installation type",
    fieldType: "select",
    config: { options: ["Panels only", "Panels + battery", "Battery upgrade", "Not sure"] },
  },
  { fieldKey: "suntech_site_photo", label: "Site photo (link)", fieldType: "image" },
]

const MANUAL_SERVICES = [
  { nameDa: "Solpanelinstallation", nameEn: "Solar panel installation" },
  { nameDa: "Solcelleanlæg med batteri", nameEn: "Solar system with battery" },
  { nameDa: "Batteri-opgradering", nameEn: "Battery upgrade" },
]

async function getLibraryFieldByKey(
  supabase: SupabaseClient,
  fieldKey: string
): Promise<LeadSheetCustomFieldDef | null> {
  const { data, error } = await supabase
    .from("lead_sheet_custom_fields")
    .select("*")
    .eq("field_key", fieldKey)
    .maybeSingle()
  if (error) throw error
  if (!data) return null
  const row = data as {
    id: string
    field_key: string
    label: string
    field_type: CustomFieldType
    required: boolean
    config: Record<string, unknown>
  }
  return {
    id: row.id,
    fieldKey: row.field_key,
    label: row.label,
    fieldType: row.field_type,
    required: row.required,
    config: {
      options: Array.isArray(row.config?.options)
        ? (row.config.options as string[])
        : undefined,
    },
  }
}

async function ensureLibraryField(
  supabase: SupabaseClient,
  spec: (typeof CUSTOM_FIELD_SPECS)[number]
): Promise<LeadSheetCustomFieldDef> {
  const existing = await getLibraryFieldByKey(supabase, spec.fieldKey)
  if (existing) return existing
  return createLibraryField(supabase, {
    fieldKey: spec.fieldKey,
    label: spec.label,
    fieldType: spec.fieldType,
    config: spec.config,
  })
}

async function findOrgTemplate(
  supabase: SupabaseClient,
  organizationId: string
): Promise<string | null> {
  const { data, error } = await supabase
    .from("lead_sheet_templates")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("name", SUNTECH_TEMPLATE_NAME)
    .maybeSingle()
  if (error) throw error
  return (data?.id as string | undefined) ?? null
}

async function ensureSolarTemplate(
  supabase: SupabaseClient,
  organizationId: string
): Promise<{ templateId: string; fieldKeys: string[] }> {
  let templateId = await findOrgTemplate(supabase, organizationId)
  if (!templateId) {
    const created = await createEmptyTemplate(supabase, {
      name: SUNTECH_TEMPLATE_NAME,
      description:
        "SunTech solar installs — webhook-friendly custom fields (text, notes, number, select, image link).",
      organizationId,
      isShared: false,
    })
    templateId = created.template.id
  }

  let config = await getLeadSheetTemplateById(supabase, templateId)
  if (!config) throw new Error("Template missing after create")

  const defs: LeadSheetCustomFieldDef[] = []
  for (const spec of CUSTOM_FIELD_SPECS) {
    defs.push(await ensureLibraryField(supabase, spec))
  }

  for (const def of defs) {
    const already = config.columns.some(
      (c) => c.kind === "custom" && c.customField.id === def.id
    )
    if (already) continue
    config = await addFieldToTemplate(supabase, templateId, { customFieldId: def.id }, null)
  }

  await setOrganizationLeadSheetTemplateId(supabase, organizationId, templateId)

  return {
    templateId,
    fieldKeys: listCustomFieldDefs(config).map((f) => f.fieldKey),
  }
}

async function ensureServices(supabase: SupabaseClient, organizationId: string): Promise<string[]> {
  let manual = await listManualServices(supabase, organizationId)
  const serviceUuids: string[] = []

  for (const spec of MANUAL_SERVICES) {
    let row = manual.find((m) => m.nameDa === spec.nameDa)
    if (!row) {
      row = await createService(supabase, {
        nameDa: spec.nameDa,
        nameEn: spec.nameEn,
        organizationId,
      })
      manual = [...manual, row]
    }
    serviceUuids.push(row.id)
  }

  await saveOrganizationServices(supabase, organizationId, {
    selectedIds: serviceUuids,
    newManual: [],
    removedManualIds: [],
    customOrder: true,
    order: serviceUuids,
  })

  const refreshed = await getOrganizationServicesView(supabase, organizationId)
  return refreshed.services.map((s) => s.id)
}

/** 5 leads × 12 months = 60 — covers KPI, pipeline, qualified, quotes, and MTD October won. */
export const SUNTECH_AUDIT_LEAD_COUNT = 60
const AUDIT_YEAR = 2026
const DAY_BY_SLOT = [5, 10, 15, 20, 25] as const

function auditLeadDate(monthIndex: number, slot: number): string {
  const day = DAY_BY_SLOT[slot] ?? 15
  return toIsoDate(new Date(AUDIT_YEAR, monthIndex, day))
}

/**
 * Slot roles (same every month):
 * 0 new | 1 qualified (call_2) | 2 quote (proposal_sent) | 3 won | 4 lost
 * October: slot 0 = early won (day 5) so "this month" has revenue before MTD end.
 */
function resolveAuditStatus(monthIndex: number, slot: number): LeadStatusId {
  if (monthIndex === 9 && slot === 0) return "won"
  if (monthIndex === 9 && slot === 3) return "proposal_sent"
  switch (slot) {
    case 0:
      return "new_waiting_call"
    case 1:
      return "call_2"
    case 2:
      return "proposal_sent"
    case 3:
      return "won"
    case 4:
      return "lost"
    default:
      return "new_waiting_call"
  }
}

function auditCommercials(
  monthIndex: number,
  status: LeadStatusId
): { salesPrice: number | null; profit: number | null } {
  const quotePrice = 85_000 + monthIndex * 2_500
  if (status === "proposal_sent") {
    return { salesPrice: quotePrice, profit: null }
  }
  if (status !== "won") {
    return { salesPrice: null, profit: null }
  }
  return {
    salesPrice: 90_000 + monthIndex * 3_000,
    profit: 22_000 + monthIndex * 500,
  }
}

const FIRST_NAMES = [
  "Lars",
  "Maria",
  "Peter",
  "Anne",
  "Mikkel",
  "Sofie",
  "Thomas",
  "Camilla",
  "Jonas",
  "Emma",
  "Oliver",
  "Ida",
  "Victor",
  "Freja",
  "Noah",
  "Alma",
  "Lucas",
  "Clara",
  "William",
  "Laura",
  "Frederik",
  "Sarah",
  "Magnus",
  "Julie",
  "Christian",
]

const LAST_NAMES = [
  "Nielsen",
  "Hansen",
  "Jensen",
  "Sørensen",
  "Christensen",
  "Andersen",
  "Pedersen",
  "Møller",
  "Holm",
  "Larsen",
  "Schmidt",
  "Krogh",
  "Bang",
  "Lund",
  "Vestergaard",
  "Østergaard",
  "Petersen",
  "Rasmussen",
  "Jørgensen",
  "Olsen",
]

function buildSeedLeads(serviceSlugs: string[]): Lead[] {
  const leads: Lead[] = []
  let index = 0
  for (let slot = 0; slot < 5; slot += 1) {
    for (let monthIndex = 0; monthIndex < 12; monthIndex += 1) {
      const slug = serviceSlugs[index % serviceSlugs.length] ?? serviceSlugs[0] ?? ""
      const status = resolveAuditStatus(monthIndex, slot)
      const { salesPrice, profit } = auditCommercials(monthIndex, status)
      const segment = index % 3 === 0 ? "b2b" : "b2c"
      const date = auditLeadDate(monthIndex, slot)
    const kwh = 4200 + (index % 20) * 650
    const first = FIRST_NAMES[index % FIRST_NAMES.length] ?? "Demo"
    const last = LAST_NAMES[(index + 3) % LAST_NAMES.length] ?? "Kunde"
    const fullName = `${first} ${last}${index >= FIRST_NAMES.length ? ` ${index + 1}` : ""}`

      leads.push({
        id: randomUUID(),
        date,
        fullName,
        email: `audit.${index + 1}.${first.toLowerCase()}@suntech-demo.dk`,
        phone: `+45 20 ${String(10 + (index % 80)).padStart(2, "0")} ${String(40 + (index % 50)).padStart(2, "0")} ${String(50 + (index % 40)).padStart(2, "0")}`,
        segment,
        companyName: segment === "b2b" ? `${last} ApS` : "",
        address: `Solgade ${12 + (index % 90)}`,
        zipCode: `${2000 + (index % 999)}`,
        city: index % 2 === 0 ? "København" : "Aarhus",
        serviceIds: slug ? [slug] : [],
        platform: index % 3 === 0 ? "website" : index % 3 === 1 ? "landing" : "meta",
        metaAdId: index % 3 === 2 ? `meta-ad-${1000 + index}` : "",
        status,
        salesPrice,
        profit,
        source: "manual",
        customFields: {
          suntech_site_reference: `SUN-AUDIT-${1000 + index}`,
          suntech_consultation_notes: `Audit lead ${index + 1} (${date}): slot ${slot} — ${status}.`,
          suntech_estimated_kwh: kwh,
          suntech_installation_type:
            ["Panels only", "Panels + battery", "Battery upgrade", "Not sure"][index % 4],
          suntech_site_photo: {
            text: `Roof photo ${index + 1}`,
            url: `https://picsum.photos/seed/suntech-audit-${index}/800/600`,
          },
        },
      })
      index += 1
    }
  }
  return leads
}

export type SuntechSolarSeedResult = {
  organizationId: string
  templateId: string
  customFieldKeys: string[]
  serviceSlugs: string[]
  leadsInserted: number
}

export async function seedSuntechSolarDemo(
  supabase: SupabaseClient,
  organizationId: string
): Promise<SuntechSolarSeedResult> {
  const { templateId, fieldKeys } = await ensureSolarTemplate(supabase, organizationId)
  const serviceSlugs = await ensureServices(supabase, organizationId)

  const { error: deleteError } = await supabase
    .from("leads")
    .delete()
    .eq("organization_id", organizationId)
    .like("legacy_id", `${SUNTECH_SEED_LEGACY_PREFIX}%`)

  if (deleteError) throw deleteError

  const seedLeads = buildSeedLeads(serviceSlugs)
  const rows = seedLeads.map((lead, index) =>
    leadToInsertRow(lead, organizationId, "manual", `${SUNTECH_SEED_LEGACY_PREFIX}${index + 1}`)
  )

  const { data: inserted, error: insertError } = await supabase.from("leads").insert(rows).select("*")
  if (insertError) throw insertError

  for (const row of inserted ?? []) {
    if (row.status === "won") {
      await syncCustomerForWonLead(supabase, row)
    }
  }

  return {
    organizationId,
    templateId,
    customFieldKeys: fieldKeys,
    serviceSlugs,
    leadsInserted: inserted?.length ?? 0,
  }
}
