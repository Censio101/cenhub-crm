/**
 * End-to-end check of the "edit lead" popup's save path against real SunTech data:
 * buildLeadPatch (what the popup sends) -> PATCH route sanitizing -> updateLeadById -> customer mirror.
 * Run: npx tsx scripts/verify-lead-edit-flow.ts   (re-run `npm run db:seed-suntech` afterwards to reset)
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"

function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8")
    for (const line of content.split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const i = trimmed.indexOf("=")
      if (i < 0) continue
      const key = trimmed.slice(0, i)
      if (!process.env[key]) process.env[key] = trimmed.slice(i + 1)
    }
  } catch {
    // optional
  }
}

loadEnvLocal()

import { resolveClientDashboardSheet } from "../lib/db/lead-sheet-repository"
import { listLeadsForOrganization, updateLeadById } from "../lib/db/leads-repository"
import { applyCustomFieldsToPatch } from "../lib/lead-sheet/apply-custom-fields-patch"
import { buildLeadPatch } from "../lib/lead-sheet/lead-patch-diff"
import { validateNewLead } from "../lib/lead-sheet/new-lead-form"
import { createAdminClient } from "../lib/supabase/admin"
import type { LeadPatch } from "../lib/db/lead-mapper"
import type { Lead } from "../lib/leads"

type EditResult = { ok: true; saved: Lead; patch: LeadPatch } | { ok: false; error: string }

type Check = { name: string; ok: boolean; detail: string }
const checks: Check[] = []
const check = (name: string, ok: boolean, detail = "") => checks.push({ name, ok, detail })

async function main() {
  const admin = createAdminClient()
  const { data: org } = await admin
    .from("organizations")
    .select("id, slug")
    .eq("slug", process.env.SUNTECH_ORG_SLUG?.trim() || "suntech-nordic")
    .single()
  if (!org) throw new Error("SunTech org not found")

  const { visible: sheet } = await resolveClientDashboardSheet(admin, org.id)
  if (!sheet) throw new Error("No lead sheet")
  const columns = sheet.columns

  const leads = await listLeadsForOrganization(admin, org.id)
  const original = leads.find((l) => l.status === "won" && l.source !== "meta")
  if (!original) throw new Error("No won seed lead found (run npm run db:seed-suntech)")

  const customerFor = async (leadId: string) =>
    (await admin.from("customers").select("*").eq("lead_id", leadId).maybeSingle()).data

  /** Same steps as the popup + PATCH route. */
  async function saveEdit(base: Lead, mutate: (draft: Lead) => void): Promise<EditResult> {
    const draft: Lead = {
      ...base,
      serviceIds: [...(base.serviceIds ?? [])],
      customFields: { ...(base.customFields ?? {}) },
    }
    mutate(draft)
    const validated = validateNewLead({
      draft,
      dateText: `${draft.date}${draft.time ? ` ${draft.time}` : ""}`,
      columns,
      mode: "edit",
    })
    if (!validated.ok) return { ok: false, error: `validation: ${JSON.stringify(validated.errors)}` }
    const patch = buildLeadPatch(base, validated.lead)
    let safe = patch
    if (patch.customFields !== undefined) {
      const { data: row } = await admin.from("leads").select("custom_fields").eq("id", base.id).single()
      const applied = applyCustomFieldsToPatch(patch, (row?.custom_fields as Record<string, unknown>) ?? {}, sheet)
      if (applied.error) return { ok: false, error: `server: ${applied.error}` }
      safe = applied.patch
    }
    const saved = await updateLeadById(admin, org!.id, base.id, safe)
    return { ok: true, saved, patch }
  }

  const noteKey = columns.find((c) => c.kind === "custom" && c.customField.fieldType === "textarea")
  const photoKey = columns.find((c) => c.kind === "custom" && c.customField.fieldType === "image")
  const noteField = noteKey?.kind === "custom" ? noteKey.customField.fieldKey : null
  const photoField = photoKey?.kind === "custom" ? photoKey.customField.fieldKey : null

  // 1. Edit several built-in fields at once.
  let current = original
  let r = await saveEdit(current, (d) => {
    d.fullName = `${original.fullName} (edited)`
    d.salesPrice = 123456
    d.profit = 34567
    d.city = "Odense"
  })
  if (r.ok) {
    current = r.saved
    check("multi-field edit saves", current.fullName.endsWith("(edited)") && current.salesPrice === 123456 && current.city === "Odense")
    check("patch only holds changed fields", Object.keys(r.patch).sort().join() === "city,fullName,profit,salesPrice", Object.keys(r.patch).join())
    const cust = await customerFor(current.id)
    check("won customer mirrors the edit", cust?.sales_price === 123456 && cust?.full_name === current.fullName, JSON.stringify({ sp: cust?.sales_price, n: cust?.full_name }))
  } else check("multi-field edit saves", false, r.error)

  // 2. Note + site photo link (normalized), then clear the photo.
  if (noteField && photoField) {
    r = await saveEdit(current, (d) => {
      d.customFields = {
        ...d.customFields,
        [noteField]: "Edited from popup\nline 2",
        [photoField]: { text: " Roof ", url: "example.com/roof.jpg" },
      }
    })
    if (r.ok) {
      current = r.saved
      const photo = current.customFields?.[photoField] as { text?: string; url?: string } | undefined
      check("note saved", current.customFields?.[noteField] === "Edited from popup\nline 2")
      check("photo link normalized (https, trimmed text)", photo?.url === "https://example.com/roof.jpg" && photo?.text === "Roof", JSON.stringify(photo))
    } else check("note + photo save", false, r.error)

    r = await saveEdit(current, (d) => {
      const next = { ...d.customFields }
      delete next[photoField] // what validateNewLead does for an emptied image
      d.customFields = { ...next, [photoField]: { text: "", url: "" } }
    })
    if (r.ok) {
      current = r.saved
      check("photo link can be removed", current.customFields?.[photoField] === undefined, JSON.stringify(current.customFields?.[photoField]))
      check("note untouched when photo removed", current.customFields?.[noteField] === "Edited from popup\nline 2")
    } else check("remove photo", false, r.error)

    r = await saveEdit(current, (d) => {
      d.customFields = { ...d.customFields, [photoField]: { text: "Bad", url: "javascript:alert(1)" } }
    })
    check("unsafe link is rejected", !r.ok, r.ok ? "was saved!" : r.error)
  }

  // 3. Clear the price.
  r = await saveEdit(current, (d) => {
    d.salesPrice = null
  })
  if (r.ok) {
    current = r.saved
    check("price can be cleared (null)", current.salesPrice === null)
  } else check("clear price", false, r.error)

  // 4. Status leaves "won" -> customer removed; back to "won" -> customer returns.
  r = await saveEdit(current, (d) => {
    d.status = "lost"
  })
  if (r.ok) {
    current = r.saved
    check("customer removed when no longer won", (await customerFor(current.id)) === null)
  } else check("status -> lost", false, r.error)

  r = await saveEdit(current, (d) => {
    d.status = "won"
    d.salesPrice = original.salesPrice
  })
  if (r.ok) {
    current = r.saved
    check("customer recreated when won again", (await customerFor(current.id)) !== null)
  } else check("status -> won", false, r.error)

  // 5. Meta-locked leads cannot change contact details through the same path.
  const metaLead = leads.find((l) => l.source === "meta")
  if (metaLead) {
    const m = await saveEdit(metaLead, (d) => {
      d.fullName = "Hacked Name"
      d.status = metaLead.status
    })
    if (m.ok) check("meta lead keeps locked name", m.saved.fullName === metaLead.fullName, m.saved.fullName)
  }

  const failed = checks.filter((c) => !c.ok)
  for (const c of checks) console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.ok || !c.detail ? "" : `  -> ${c.detail}`}`)
  console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`)
  if (failed.length) process.exit(1)
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
