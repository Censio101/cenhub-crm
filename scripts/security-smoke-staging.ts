/**
 * HTTP smoke against a public base URL (no auth cookies). Safe on production.
 * Run: npm run security:smoke-prod
 * Or: STAGING_BASE_URL or CRM_PUBLIC_URL=https://... npm run security:smoke-staging
 */

import { DEFAULT_CRM_SITE_URL } from "@/lib/site/default-site-url"

const base = (
  process.env.STAGING_BASE_URL ??
  process.env.CRM_PUBLIC_URL ??
  DEFAULT_CRM_SITE_URL
).replace(/\/$/, "")

type Check = { name: string; status: number; ok: boolean; detail?: string }

async function fetchStatus(path: string, init?: RequestInit): Promise<number> {
  const res = await fetch(`${base}${path}`, { ...init, redirect: "manual" })
  return res.status
}

async function main() {
  const results: Check[] = []

  const adminList = await fetchStatus("/api/admin/organizations")
  results.push({
    name: "Unauthenticated admin hub",
    status: adminList,
    ok: adminList === 401,
  })

  const cron = await fetchStatus("/api/cron/purge-auth-request-log", { method: "GET" })
  results.push({
    name: "Cron without Bearer",
    status: cron,
    ok: cron === 401 || cron === 503,
    detail: "503 acceptable when CRON_SECRET unset on staging",
  })

  const meta = await fetchStatus("/api/webhooks/meta/leads", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: "{}",
  })
  results.push({
    name: "Meta webhook POST without signature",
    status: meta,
    ok: meta === 401 || meta === 403 || meta === 400,
  })

  for (const row of results) {
    const label = row.ok ? "ok" : "FAIL"
    console.log(`${label}  ${row.name} → HTTP ${row.status}${row.detail ? ` (${row.detail})` : ""}`)
  }

  const failed = results.filter((r) => !r.ok).length
  if (failed > 0) {
    console.error(`\n${failed} check(s) failed against ${base}`)
    process.exitCode = 1
  } else {
    console.log(`\nAll checks passed against ${base}`)
  }
}

void main().catch((err) => {
  console.error(err)
  process.exitCode = 2
})