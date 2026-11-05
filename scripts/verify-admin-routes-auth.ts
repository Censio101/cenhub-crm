/**
 * Ensures every admin API route calls requireCensioAdmin().
 * Run: npx tsx scripts/verify-admin-routes-auth.ts
 */
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

const ROOT = join(process.cwd(), "app/api/admin")

function collectRouteFiles(dir: string): string[] {
  const out: string[] = []
  for (const name of readdirSync(dir)) {
    const path = join(dir, name)
    const st = statSync(path)
    if (st.isDirectory()) out.push(...collectRouteFiles(path))
    else if (name === "route.ts") out.push(path)
  }
  return out
}

function main() {
  const files = collectRouteFiles(ROOT)
  const missing: string[] = []

  for (const file of files) {
    const text = readFileSync(file, "utf8")
    if (!text.includes("requireCensioAdmin(")) {
      missing.push(relative(process.cwd(), file))
    }
  }

  if (missing.length > 0) {
    console.error("Admin routes missing requireCensioAdmin():\n")
    for (const f of missing) console.error(`  - ${f}`)
    process.exit(1)
  }

  console.log(`OK: ${files.length} admin route files call requireCensioAdmin()`)
}

main()
