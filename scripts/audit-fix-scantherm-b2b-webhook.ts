/**
 * Audit + fix Scantherm Quick-Heat B2B webhook mapping and sheet columns.
 * Run: npx tsx scripts/audit-fix-scantherm-b2b-webhook.ts [--test]
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const separator = trimmed.indexOf("=")
      if (separator === -1) continue
      const key = trimmed.slice(0, separator)
      const value = trimmed.slice(separator + 1)
      if (!process.env[key]) process.env[key] = value
    }
  } catch {
    // optional
  }
}

loadEnvLocal()

import {
  B2B_FUNNEL_DANISH_FIELD_MAPPING,
  B2B_FUNNEL_WEBHOOK_FIELD_TARGETS,
} from "@/lib/funnels/b2b-lead-funnel-preset"
import { funnelSheetSourceLabel } from "@/lib/funnels/funnel-sheet-source-label"
import {
  listLeadFunnelsForOrganization,
  updateLeadFunnel,
} from "@/lib/db/lead-funnels-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import {
  addFieldToTemplate,
  createLibraryField,
  listLibraryFields,
  recordLeadSheetChangeForTemplate,
  resolveLeadSheetForOrganization,
} from "@/lib/db/lead-sheet-repository"
import { standardKeyForBuiltinColumn } from "@/lib/lead-sheet/webhook-fields"
import { createAdminClient } from "@/lib/supabase/admin"

const ORG_SLUG = "scantherm-aps"
const FUNNEL_SLUG = "quick-heat-trailer-b2b"
const CRM_BASE = process.env.CRM_PUBLIC_URL?.replace(/\/$/, "") ?? "https://www.cenhub.dk"

function mappingComplete(saved: Record<string, string>): boolean {
  for (const [target, source] of Object.entries(B2B_FUNNEL_DANISH_FIELD_MAPPING)) {
    if ((saved[target]?.trim() ?? "") !== source) return false
  }
  return true
}

function targetsMatch(saved: string[] | null): boolean {
  if (!saved || saved.length !== B2B_FUNNEL_WEBHOOK_FIELD_TARGETS.length) return false
  const a = new Set(saved)
  return B2B_FUNNEL_WEBHOOK_FIELD_TARGETS.every((t) => a.has(t))
}

async function ensureB2bSheetColumns(
  admin: ReturnType<typeof createAdminClient>,
  orgId: string
): Promise<string[]> {
  const actions: string[] = []
  const sheet = await resolveLeadSheetForOrganization(admin, orgId)
  if (!sheet) {
    actions.push("No lead sheet resolved for org")
    return actions
  }
  const templateId = sheet.template.id
  const hasBuiltin = (key: string) =>
    sheet.columns.some((c) => c.kind === "builtin" && c.builtinKey === key)
  const phoneCol = sheet.columns.find((c) => c.kind === "builtin" && c.builtinKey === "phone")

  for (const builtinKey of ["companyName", "metaAdId"] as const) {
    if (hasBuiltin(builtinKey)) continue
    await addFieldToTemplate(
      admin,
      templateId,
      { builtinKey },
      phoneCol?.id ?? null
    )
    actions.push(`Added builtin column ${builtinKey}`)
  }

  const hasNote = sheet.columns.some(
    (c) => c.kind === "custom" && c.customField.fieldKey === "note"
  )
  if (!hasNote) {
    const library = await listLibraryFields(admin)
    let noteField = library.find(
      (f) => f.kind === "custom" && f.customField.fieldKey === "note"
    )
    if (!noteField || noteField.kind !== "custom") {
      const created = await createLibraryField(admin, {
        label: "Note",
        fieldKey: "note",
        fieldType: "text",
      })
      noteField = { kind: "custom", customField: created, templateCount: 0 }
      actions.push("Created library field note")
    }
    if (noteField.kind === "custom") {
      const refreshed = await resolveLeadSheetForOrganization(admin, orgId)
      const already = refreshed?.columns.some(
        (c) => c.kind === "custom" && c.customField.fieldKey === "note"
      )
      if (!already) {
        const phone = refreshed?.columns.find(
          (c) => c.kind === "builtin" && c.builtinKey === "phone"
        )
        await addFieldToTemplate(
          admin,
          templateId,
          { customFieldId: noteField.customField.id },
          phone?.id ?? null
        )
        actions.push("Added custom column note to template")
      }
    }
  }

  if (actions.length > 0) {
    await recordLeadSheetChangeForTemplate(admin, templateId)
  }
  return actions
}

async function main() {
  const runTest = process.argv.includes("--test")
  const fixSheet = process.argv.includes("--fix-sheet") || runTest
  const admin = createAdminClient()
  const org = await getOrganizationBySlug(admin, ORG_SLUG)
  if (!org) {
    console.error(`Organization not found: ${ORG_SLUG}`)
    process.exit(1)
  }

  const funnels = await listLeadFunnelsForOrganization(admin, org.id)
  const b2b = funnels.find((f) => f.slug === FUNNEL_SLUG)
  if (!b2b) {
    console.error(`Funnel not found: ${FUNNEL_SLUG}. Run ensure-scantherm-b2b-funnel.ts first.`)
    process.exit(1)
  }

  const sheet = await resolveLeadSheetForOrganization(admin, org.id)
  const builtins = new Set<string>()
  const customKeys = new Set<string>()
  for (const col of sheet?.columns ?? []) {
    if (col.kind === "builtin") {
      const key = standardKeyForBuiltinColumn(col.builtinKey)
      if (key) builtins.add(key)
    } else {
      customKeys.add(col.customField.fieldKey)
    }
  }

  const sheetCheck = {
    companyName: builtins.has("companyName"),
    metaAdId: builtins.has("metaAdId"),
    note: customKeys.has("note"),
    customKeysSample: [...customKeys].filter((k) => /note|notat/i.test(k)).slice(0, 5),
  }

  const before = {
    dataFormat: b2b.data_format,
    defaultSegment: b2b.default_segment,
    sheetSourceLabel: b2b.sheet_source_label,
    fieldMapping: b2b.field_mapping ?? {},
    webhookFieldTargets: b2b.webhook_field_targets,
    mappingComplete: mappingComplete((b2b.field_mapping ?? {}) as Record<string, string>),
    targetsMatch: targetsMatch(b2b.webhook_field_targets),
  }

  let funnel = b2b
  const needsPatch =
    b2b.data_format !== "own" ||
    b2b.default_segment !== "b2b" ||
    !before.mappingComplete ||
    !before.targetsMatch ||
    funnelSheetSourceLabel(b2b) !== "Quick-Heat Trailer"

  if (needsPatch) {
    funnel = await updateLeadFunnel(admin, b2b.id, org.id, {
      dataFormat: "own",
      defaultSegment: "b2b",
      fieldMapping: { ...B2B_FUNNEL_DANISH_FIELD_MAPPING },
      webhookFieldTargets: [...B2B_FUNNEL_WEBHOOK_FIELD_TARGETS],
      sheetSourceLabel: "Quick-Heat Trailer",
    })
    console.log("PATCHED funnel to full B2B preset")
  } else {
    console.log("Funnel mapping already complete — no PATCH needed")
  }

  const report: {
    funnelId: string
    funnelSlug: string
    webhookUrl: string
    before: typeof before
    after: {
      dataFormat: string
      fieldMapping: Record<string, string>
      webhookFieldTargets: string[] | null
      sheetSourceLabel: string | null
    }
    sheetColumnCheck: typeof sheetCheck
    sheetWarnings: (string | false)[]
    sheetFixActions?: string[]
  } = {
    funnelId: funnel.id,
    funnelSlug: funnel.slug,
    webhookUrl: `${CRM_BASE}/api/webhooks/funnels/${funnel.id}`,
    before,
    after: {
      dataFormat: funnel.data_format,
      fieldMapping: funnel.field_mapping,
      webhookFieldTargets: funnel.webhook_field_targets,
      sheetSourceLabel: funnel.sheet_source_label,
    },
    sheetColumnCheck: sheetCheck,
    sheetWarnings: [
      !sheetCheck.companyName && "Lead sheet missing builtin column companyName",
      !sheetCheck.metaAdId && "Lead sheet missing builtin column metaAdId (Annonce)",
      !sheetCheck.note &&
        "Lead sheet missing custom field key 'note' — Note mapping may warn on ingest",
    ].filter(Boolean),
  }

  let sheetFixActions: string[] = []
  if (fixSheet) {
    sheetFixActions = await ensureB2bSheetColumns(admin, org.id)
    if (sheetFixActions.length > 0) {
      const sheetAfter = await resolveLeadSheetForOrganization(admin, org.id)
      report.sheetColumnCheck = {
        companyName: Boolean(
          sheetAfter?.columns.some(
            (c) => c.kind === "builtin" && c.builtinKey === "companyName"
          )
        ),
        metaAdId: Boolean(
          sheetAfter?.columns.some((c) => c.kind === "builtin" && c.builtinKey === "metaAdId")
        ),
        note: Boolean(
          sheetAfter?.columns.some(
            (c) => c.kind === "custom" && c.customField.fieldKey === "note"
          )
        ),
        customKeysSample: [],
      }
      report.sheetWarnings = []
    }
    report.sheetFixActions = sheetFixActions
  }

  console.log(JSON.stringify(report, null, 2))

  if (runTest) {
    const testId = `audit-${Date.now()}`
    const body = {
      Dato: "2026-11-03",
      "Fulde navn": "Audit Test B2B",
      "E-mail": `audit-b2b-${testId}@example.com`,
      Telefon: "12345678",
      "Virksomheds navn": "Audit ApS",
      Annonce: "test-ad-123",
      Note: "Plan audit test",
    }
    const res = await fetch(`${CRM_BASE}/api/webhooks/funnels/${funnel.id}`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${funnel.webhook_secret}`,
      },
      body: JSON.stringify(body),
    })
    const text = await res.text()
    let json: unknown
    try {
      json = JSON.parse(text)
    } catch {
      json = text
    }
    console.log(
      JSON.stringify(
        { testStatus: res.status, testResponse: json, testEmail: body["E-mail"] },
        null,
        2
      )
    )
    if (res.status !== 201 && res.status !== 200) process.exit(1)
  }
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
