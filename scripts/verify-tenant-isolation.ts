/**
 * Tenant isolation check. Creates two throwaway clients with one user each, signs in as client A
 * with the PUBLIC key (what any logged-in browser has) and tries to break out: become admin, join
 * client B, read or change client B's data, move rows between clients. Every attempt must fail.
 * Everything it creates is deleted again.
 *
 * Run: npm run db:verify-tenant-isolation
 */
import { readFileSync } from "node:fs"
import { resolve } from "node:path"
import { randomBytes } from "node:crypto"

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

import { createClient } from "@supabase/supabase-js"

import { createAdminClient } from "../lib/supabase/admin"
import { getSupabaseAnonKey, getSupabaseUrl } from "../lib/supabase/config"

type Result = { name: string; blocked: boolean; detail?: string }

async function main() {
  const admin = createAdminClient()
  const suffix = randomBytes(4).toString("hex")
  const password = `Iso-${randomBytes(12).toString("hex")}`
  const created = {
    orgIds: [] as string[],
    userIds: [] as string[],
  }
  const results: Result[] = []

  async function cleanup() {
    for (const orgId of created.orgIds) {
      await admin.from("customers").delete().eq("organization_id", orgId)
      await admin.from("leads").delete().eq("organization_id", orgId)
      await admin.from("client_ad_metrics").delete().eq("organization_id", orgId)
    }
    for (const userId of created.userIds) {
      await admin.from("profiles").delete().eq("id", userId)
      await admin.auth.admin.deleteUser(userId)
    }
    for (const orgId of created.orgIds) {
      await admin.from("organizations").delete().eq("id", orgId)
    }
  }

  try {
    // --- throwaway data (service role) -------------------------------------------------------
    const makeOrg = async (label: string) => {
      const { data, error } = await admin
        .from("organizations")
        .insert({ slug: `zz-iso-${label}-${suffix}`, name: `Isolation ${label}`, demo_mode: false })
        .select("id")
        .single()
      if (error) throw error
      created.orgIds.push(data.id)
      return data.id as string
    }
    const orgA = await makeOrg("a")
    const orgB = await makeOrg("b")

    const emailA = `zz-iso-a-${suffix}@example.com`
    const { data: userA, error: userError } = await admin.auth.admin.createUser({
      email: emailA,
      password,
      email_confirm: true,
    })
    if (userError || !userA.user) throw userError ?? new Error("createUser failed")
    created.userIds.push(userA.user.id)
    const userAId = userA.user.id
    const { error: profileError } = await admin.from("profiles").insert({
      id: userAId,
      organization_id: orgA,
      role: "client_user",
      email: emailA,
      full_name: "Isolation A",
    })
    if (profileError) throw profileError

    const insertLead = async (orgId: string, name: string) => {
      const { data, error } = await admin
        .from("leads")
        .insert({ organization_id: orgId, lead_date: "2026-01-01", full_name: name, source: "manual" })
        .select("id")
        .single()
      if (error) throw error
      return data.id as string
    }
    const leadA = await insertLead(orgA, "Lead A")
    const leadB = await insertLead(orgB, "Lead B")
    const { error: customerError } = await admin.from("customers").insert({
      organization_id: orgB,
      lead_id: leadB,
      closed_date: "2026-01-02",
      segment: "b2c",
      sales_price: 1000,
    })
    if (customerError) throw customerError

    // --- sign in as user A with the public key -----------------------------------------------
    const anon = createClient(getSupabaseUrl(), getSupabaseAnonKey(), {
      auth: { persistSession: false, autoRefreshToken: false },
    })
    const { error: signInError } = await anon.auth.signInWithPassword({ email: emailA, password })
    if (signInError) throw signInError

    const resetProfile = async () => {
      await admin
        .from("profiles")
        .update({ role: "client_user", organization_id: orgA, email: emailA })
        .eq("id", userAId)
    }
    const profileNow = async () =>
      (await admin.from("profiles").select("role, organization_id, email").eq("id", userAId).single()).data

    // --- controls: normal use must still work ------------------------------------------------
    const ownLeads = await anon.from("leads").select("id").eq("organization_id", orgA)
    results.push({
      name: "CONTROL: client can read its own leads",
      blocked: (ownLeads.data?.length ?? 0) === 1,
      detail: ownLeads.error?.message,
    })
    await anon.from("profiles").update({ full_name: "Isolation A renamed" }).eq("id", userAId)
    const renamed = (await admin.from("profiles").select("full_name").eq("id", userAId).single()).data
    results.push({
      name: "CONTROL: client can still edit its own name",
      blocked: renamed?.full_name === "Isolation A renamed",
    })

    // --- attacks (blocked = true means the attack failed, which is what we want) -------------
    {
      await anon.from("profiles").update({ role: "censio_admin" }).eq("id", userAId)
      const now = await profileNow()
      results.push({
        name: "ATTACK: make yourself a Censio admin",
        blocked: now?.role !== "censio_admin",
        detail: `role is now ${now?.role}`,
      })
      await resetProfile()
    }
    {
      await anon.from("profiles").update({ organization_id: orgB }).eq("id", userAId)
      const now = await profileNow()
      results.push({
        name: "ATTACK: move yourself into another client",
        blocked: now?.organization_id !== orgB,
        detail: `organization is now ${now?.organization_id === orgB ? "client B" : "client A"}`,
      })
      await resetProfile()
    }
    {
      await anon.from("profiles").update({ email: "attacker@example.com" }).eq("id", userAId)
      const now = await profileNow()
      results.push({
        name: "ATTACK: change your own login email on the profile",
        blocked: now?.email !== "attacker@example.com",
      })
      await resetProfile()
    }
    {
      const { data } = await anon.from("leads").select("id").eq("organization_id", orgB)
      results.push({ name: "ATTACK: read another client's leads", blocked: (data?.length ?? 0) === 0 })
    }
    {
      const { data } = await anon.from("customers").select("id").eq("organization_id", orgB)
      results.push({ name: "ATTACK: read another client's customers", blocked: (data?.length ?? 0) === 0 })
    }
    {
      const { data } = await anon.from("organizations").select("id")
      results.push({
        name: "ATTACK: list all clients",
        blocked: (data ?? []).every((row) => row.id === orgA),
        detail: `${data?.length ?? 0} visible`,
      })
    }
    {
      const { data } = await anon.from("profiles").select("id")
      results.push({
        name: "ATTACK: list everyone's profiles",
        blocked: (data ?? []).every((row) => row.id === userAId),
        detail: `${data?.length ?? 0} visible`,
      })
    }
    {
      await anon.from("leads").update({ organization_id: orgB }).eq("id", leadA)
      const row = (await admin.from("leads").select("organization_id").eq("id", leadA).single()).data
      results.push({
        name: "ATTACK: move your own lead into another client",
        blocked: row?.organization_id !== orgB,
      })
      await admin.from("leads").update({ organization_id: orgA }).eq("id", leadA)
    }
    {
      const { data } = await anon
        .from("leads")
        .insert({ organization_id: orgB, lead_date: "2026-01-03", full_name: "Planted", source: "manual" })
        .select("id")
      const planted = (data ?? []).length > 0
      results.push({ name: "ATTACK: create a lead inside another client", blocked: !planted })
      await admin.from("leads").delete().eq("organization_id", orgB).eq("full_name", "Planted")
    }
    {
      await anon.from("leads").update({ full_name: "Hacked" }).eq("id", leadB)
      const row = (await admin.from("leads").select("full_name").eq("id", leadB).single()).data
      results.push({ name: "ATTACK: edit another client's lead", blocked: row?.full_name !== "Hacked" })
    }
    {
      await anon.from("leads").delete().eq("id", leadB)
      const row = (await admin.from("leads").select("id").eq("id", leadB).maybeSingle()).data
      results.push({ name: "ATTACK: delete another client's lead", blocked: row != null })
    }
    {
      await anon.from("customers").update({ sales_price: 1 }).eq("organization_id", orgB)
      const row = (await admin.from("customers").select("sales_price").eq("organization_id", orgB).single()).data
      results.push({
        name: "ATTACK: edit another client's customer",
        blocked: Number(row?.sales_price) !== 1,
      })
    }
    {
      await anon.from("client_ad_metrics").insert({ organization_id: orgA, month_key: "2026-01", spend: 1 })
      const row = (
        await admin.from("client_ad_metrics").select("id").eq("organization_id", orgA).maybeSingle()
      ).data
      results.push({ name: "ATTACK: write your own ad spend numbers", blocked: row == null })
    }
    {
      await anon.from("organizations").update({ name: "Renamed by client" }).eq("id", orgA)
      const row = (await admin.from("organizations").select("name").eq("id", orgA).single()).data
      results.push({
        name: "ATTACK: rename or edit your own client record",
        blocked: row?.name !== "Renamed by client",
      })
    }
  } finally {
    await cleanup()
  }

  let vulnerable = 0
  for (const result of results) {
    if (!result.blocked) vulnerable += 1
    const label = result.name.startsWith("CONTROL")
      ? result.blocked
        ? "ok      "
        : "BROKEN  "
      : result.blocked
        ? "BLOCKED "
        : "VULNERABLE"
    console.log(`${label} ${result.name}${result.detail ? ` (${result.detail})` : ""}`)
  }
  console.log(
    vulnerable === 0
      ? "\nAll attacks were blocked."
      : `\n${vulnerable} problem(s): fix before onboarding clients.`
  )
  process.exitCode = vulnerable === 0 ? 0 : 1
}

void main().catch((error) => {
  console.error("Isolation check failed to run:", error)
  process.exitCode = 2
})
