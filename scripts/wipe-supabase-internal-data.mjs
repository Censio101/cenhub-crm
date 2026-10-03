#!/usr/bin/env node
/**
 * Sletter al kunde-, omkostnings- og tilbudsdata i Supabase.
 * Beholder kun head admin (Kaj) til login.
 */
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

const CENSIO_ADMIN_USER_ID = "user-censio-admin"

function loadEnvLocal() {
  for (const file of [".env.local", ".env.production.local"]) {
    const filePath = path.join(process.cwd(), file)
    if (!existsSync(filePath)) continue
    for (const line of readFileSync(filePath, "utf8").split("\n")) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith("#")) continue
      const eq = trimmed.indexOf("=")
      if (eq <= 0) continue
      const key = trimmed.slice(0, eq)
      let value = trimmed.slice(eq + 1)
      if (
        (value.startsWith('"') && value.endsWith('"')) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1)
      }
      if (value.includes("[SENSITIVE]")) continue
      if (!process.env[key]) process.env[key] = value
    }
  }
}

function serialize(data) {
  return {
    workspaces: data.workspaces ?? [],
    users: data.users ?? [],
    memberships: data.memberships ?? [],
    invites: data.invites ?? [],
    sessions: data.sessions ?? [],
    commercialLines: data.commercialLines ?? [],
    fixedExpenses: data.fixedExpenses ?? [],
    customerContacts: data.customerContacts ?? [],
    customerDocuments: data.customerDocuments ?? [],
    auditLogs: data.auditLogs ?? [],
    offers: data.offers ?? [],
    offerEngagement: data.offerEngagement ?? [],
  }
}

function adminUserRow(u) {
  return {
    id: u.id,
    email: u.email,
    name: u.name,
    username: u.username,
    title: u.title ?? "",
    profile_image: u.profileImage ?? u.profile_image ?? "",
    head_admin: Boolean(u.headAdmin ?? u.head_admin),
    censio_staff_role: u.censioStaffRole ?? u.censio_staff_role ?? "admin",
    password_hash: u.passwordHash ?? u.password_hash ?? null,
    global_role: u.global_role ?? u.globalRole ?? "censio_admin",
    created_at: u.created_at ?? u.createdAt ?? new Date().toISOString(),
  }
}

loadEnvLocal()

const url = process.env.SUPABASE_URL?.trim()
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
if (!url || !key) {
  console.error("Mangler SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY i .env.local")
  process.exit(1)
}

const supabase = createClient(url, key, { auth: { persistSession: false } })

const { data: existingUsers } = await supabase
  .from("ci_users")
  .select("*")
  .eq("id", CENSIO_ADMIN_USER_ID)

let adminRow = existingUsers?.[0]
if (!adminRow) {
  adminRow = adminUserRow({
    id: CENSIO_ADMIN_USER_ID,
    email: process.env.CENSIO_ADMIN_EMAIL?.trim() || "kontakt@censio.dk",
    name: "Kaj Eli Joensen",
    username: "Censio",
    title: "CEO & Founder",
    profile_image: "/kaj-eli-joensen.jpg",
    head_admin: true,
    censio_staff_role: "admin",
    password_hash: null,
    global_role: "censio_admin",
    created_at: new Date().toISOString(),
  })
} else {
  adminRow = adminUserRow({
    id: adminRow.id,
    email: adminRow.email,
    name: adminRow.name,
    username: adminRow.username,
    title: adminRow.title,
    profile_image: adminRow.profile_image,
    head_admin: adminRow.head_admin,
    censio_staff_role: adminRow.censio_staff_role,
    password_hash: adminRow.password_hash,
    global_role: adminRow.global_role,
    created_at: adminRow.created_at,
  })
}

const payload = serialize({
  workspaces: [],
  users: [adminRow],
  memberships: [],
  invites: [],
  sessions: [],
  commercialLines: [],
  fixedExpenses: [],
  customerContacts: [],
  customerDocuments: [],
  auditLogs: [],
  offers: [],
  offerEngagement: [],
})

const { error } = await supabase.rpc("ci_replace_store", { p_payload: payload })
if (error) {
  console.error("Supabase fejl:", error.message)
  process.exit(1)
}

try {
  const { data: files } = await supabase.storage.from("censio-internal-contracts").list("", {
    limit: 1000,
  })
  if (files?.length) {
    for (const folder of files) {
      const { data: nested } = await supabase.storage
        .from("censio-internal-contracts")
        .list(folder.name, { limit: 1000 })
      const paths = (nested ?? []).map((f) => `${folder.name}/${f.name}`)
      if (paths.length) {
        await supabase.storage.from("censio-internal-contracts").remove(paths)
      }
    }
  }
} catch {
  // bucket may be empty
}

const localStore = {
  workspaces: [],
  users: [
    {
      id: CENSIO_ADMIN_USER_ID,
      email: adminRow.email,
      name: adminRow.name,
      username: adminRow.username,
      title: adminRow.title || "CEO & Founder",
      profileImage: adminRow.profile_image || "/kaj-eli-joensen.jpg",
      headAdmin: true,
      censioStaffRole: "admin",
      passwordHash: adminRow.password_hash,
      globalRole: "censio_admin",
      createdAt: adminRow.created_at,
    },
  ],
  memberships: [],
  invites: [],
  sessions: [],
  commercialLines: [],
  fixedExpenses: [],
  customerContacts: [],
  customerDocuments: [],
  auditLogs: [],
  offers: [],
  offerEngagement: [],
}

const dataDir = path.join(process.cwd(), ".data")
mkdirSync(dataDir, { recursive: true })
writeFileSync(
  path.join(dataDir, "cenhub-store.json"),
  JSON.stringify(localStore, null, 2)
)

console.log("Supabase tømt: ingen kunder, omkostninger eller tilbud.")
console.log("Beholdt bruger:", adminRow.username, adminRow.email)
