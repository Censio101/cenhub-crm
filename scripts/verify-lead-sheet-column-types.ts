/**
 * Audit every lead sheet template: notes-like fields must be textarea; select fields need options.
 * Run: npm run db:verify-lead-sheet-columns
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

import { auditCustomColumns, templateHasNotesLikeColumn } from "@/lib/lead-sheet/ensure-notes-column"
import { getLeadSheetTemplateById, listLeadSheetTemplates } from "@/lib/db/lead-sheet-repository"
import { createAdminClient } from "@/lib/supabase/admin"

async function main() {
  const admin = createAdminClient()
  const templates = await listLeadSheetTemplates(admin, { withColumnCounts: false })
  const allRows: ReturnType<typeof auditCustomColumns> = []
  const summary: {
    templateId: string
    name: string
    isSystemDefault: boolean
    orgId: string | null
    hasNotesLike: boolean
    customFields: number
    issueCount: number
  }[] = []

  for (const tpl of templates) {
    const config = await getLeadSheetTemplateById(admin, tpl.id)
    if (!config) continue
    const rows = auditCustomColumns(config)
    allRows.push(...rows)
    const issueCount = rows.reduce((n, r) => n + r.issues.length, 0)
    summary.push({
      templateId: tpl.id,
      name: config.template.name,
      isSystemDefault: config.template.isSystemDefault,
      orgId: config.template.organizationId,
      hasNotesLike: templateHasNotesLikeColumn(config),
      customFields: rows.length,
      issueCount,
    })
  }

  const failed = allRows.filter((r) => r.issues.length > 0)
  console.log(JSON.stringify({ templates: summary.length, failedRows: failed.length }, null, 2))
  if (failed.length > 0) {
    console.error("\nIssues:")
    for (const row of failed) {
      console.error(`  ${row.templateName} · ${row.fieldKey} (${row.fieldType}): ${row.issues.join("; ")}`)
    }
    process.exit(1)
  }
  console.log("All custom columns pass notes + select audit.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})