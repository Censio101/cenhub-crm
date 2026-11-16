/**
 * Warn when local dev likely points at production Supabase.
 * Run: npm run env:verify-dev
 */
import { readFileSync, existsSync } from "node:fs"
import { resolve } from "node:path"

const PROD_REF = process.env.SUPABASE_PROD_PROJECT_REF ?? "jrywehprthtydlpohuef"
const STAGING_HINT = process.env.SUPABASE_STAGING_PROJECT_REF ?? "uuqlrkeovlgtjuuqgyme"

function loadEnvLocal(): Record<string, string> {
  const path = resolve(process.cwd(), ".env.local")
  const out: Record<string, string> = {}
  if (!existsSync(path)) return out
  for (const line of readFileSync(path, "utf8").split("\n")) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const i = trimmed.indexOf("=")
    if (i < 0) continue
    out[trimmed.slice(0, i)] = trimmed.slice(i + 1)
  }
  return out
}

function main() {
  let exitCode = 0
  const env = loadEnvLocal()
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL ?? ""

  if (!url) {
    console.warn("No NEXT_PUBLIC_SUPABASE_URL in .env.local — copy docs/staging.env.example")
    process.exitCode = 1
    return
  }

  if (url.includes(PROD_REF)) {
    console.error(
      `UNSAFE: .env.local points at PRODUCTION Supabase (${PROD_REF}).\n` +
        `Use staging keys. See docs/THREE-ENVIRONMENTS.md`
    )
    exitCode = 2
  } else if (url.includes(STAGING_HINT)) {
    console.log(`OK: .env.local appears to use staging project ref ${STAGING_HINT}`)
  } else {
    console.log(
      `OK: .env.local does not contain prod ref ${PROD_REF} (verify this is intentional staging/dev)`
    )
  }

  const linkPath = resolve(process.cwd(), "supabase/.temp/project-ref")
  if (existsSync(linkPath)) {
    const linked = readFileSync(linkPath, "utf8").trim()
    if (linked === PROD_REF) {
      console.error(
        `UNSAFE: supabase CLI linked to PRODUCTION (${PROD_REF}).\n` +
          `  supabase link --project-ref ${STAGING_HINT}`
      )
      exitCode = 2
    } else {
      console.log(`OK: supabase link points at ${linked}`)
    }
  } else {
    console.warn("No supabase/.temp/project-ref — run: supabase link --project-ref <staging>")
  }

  process.exitCode = exitCode
}

main()