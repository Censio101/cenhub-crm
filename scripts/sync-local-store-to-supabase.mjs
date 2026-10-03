#!/usr/bin/env node
/**
 * Upload fuld `.data/cenhub-store.json` til Supabase (Censio Internal).
 * Kræver SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY i miljø (fx .env.local).
 */
import { readFileSync, existsSync } from "node:fs"
import path from "node:path"
import { createClient } from "@supabase/supabase-js"

function loadEnvLocal() {
  const file = path.join(process.cwd(), ".env.local")
  if (!existsSync(file)) return
  for (const line of readFileSync(file, "utf8").split("\n")) {
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
    if (!process.env[key]) process.env[key] = value
  }
}

loadEnvLocal()

const url = process.env.SUPABASE_URL?.trim()
const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim()
if (!url || !key || url.includes("[SENSITIVE]") || key.includes("[SENSITIVE]")) {
  console.error(
    "Sæt SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY i .env.local (fra Supabase → Settings → API → service_role)."
  )
  process.exit(1)
}

const storePath = path.join(process.cwd(), ".data", "cenhub-store.json")
if (!existsSync(storePath)) {
  console.error("Ingen .data/cenhub-store.json fundet.")
  process.exit(1)
}

const raw = JSON.parse(readFileSync(storePath, "utf8"))

function serialize(data) {
  return {
    workspaces: (data.workspaces ?? []).map((w) => ({
      id: w.id,
      name: w.name,
      email: w.email,
      logo: w.logo ?? "",
      profile_image: w.profileImage ?? "",
      enabled_service_ids: w.enabledServiceIds ?? [],
      custom_services: w.customServices ?? [],
      hvidbjerg_partner: Boolean(w.hvidbjergPartner),
      status: w.status,
      use_demo_data: Boolean(w.useDemoData),
      created_at: w.createdAt,
      provisioned_at: w.provisionedAt ?? "",
    })),
    users: (data.users ?? []).map((u) => ({
      id: u.id,
      email: u.email,
      name: u.name,
      username: u.username,
      title: u.title ?? "",
      profile_image: u.profileImage ?? "",
      head_admin: Boolean(u.headAdmin),
      censio_staff_role: u.censioStaffRole ?? null,
      password_hash: u.passwordHash ?? null,
      global_role: u.globalRole,
      created_at: u.createdAt,
    })),
    memberships: (data.memberships ?? []).map((m) => ({
      id: m.id,
      workspace_id: m.workspaceId,
      user_id: m.userId,
      role: m.role,
      status: m.status,
    })),
    invites: (data.invites ?? []).map((i) => ({
      id: i.id,
      token: i.token,
      workspace_id: i.workspaceId,
      user_id: i.userId,
      email: i.email,
      name: i.name,
      role: i.role,
      kind: i.kind,
      expires_at: i.expiresAt,
      used_at: i.usedAt ?? "",
      last_sent_at: i.lastSentAt ?? "",
      last_invite_url: i.lastInviteUrl ?? "",
      mail_sent: Boolean(i.mailSent),
    })),
    sessions: (data.sessions ?? []).map((s) => ({
      id: s.id,
      user_id: s.userId,
      workspace_id: s.workspaceId,
      expires_at: s.expiresAt,
    })),
    commercialLines: (data.commercialLines ?? []).map((l) => ({
      id: l.id,
      workspace_id: l.workspaceId,
      category: l.category,
      name: l.name,
      amount: l.amount,
      cadence: l.cadence,
      starts_on: l.startsOn,
      ends_on: l.endsOn ?? "",
      note: l.note ?? "",
      billing_periods: l.billingPeriods ?? [],
    })),
    fixedExpenses: (data.fixedExpenses ?? []).map((e) => ({
      id: e.id,
      type: e.type,
      name: e.name,
      amount: e.amount,
      starts_on: e.startsOn,
      ends_on: e.endsOn ?? "",
      price_periods: e.pricePeriods ?? [],
      note: e.note ?? "",
      url: e.url ?? "",
    })),
    customerContacts: (data.customerContacts ?? []).map((c) => ({
      workspace_id: c.workspaceId,
      website: c.website ?? "",
      cvr: c.cvr ?? "",
      phone: c.phone ?? "",
      sub_email: c.subEmail ?? "",
      contact_name: c.contactName ?? "",
      people: c.people ?? [],
    })),
    customerDocuments: (data.customerDocuments ?? []).map((d) => ({
      id: d.id,
      workspace_id: d.workspaceId,
      file_name: d.fileName,
      stored_name: d.storedName,
      uploaded_at: d.uploadedAt,
      size: d.size,
      name: d.name ?? "",
      note: d.note ?? "",
    })),
    auditLogs: (data.auditLogs ?? []).map((a) => ({
      id: a.id,
      at: a.at,
      user_id: a.userId,
      user_name: a.userName,
      action: a.action,
      target: a.target,
      change: a.change,
    })),
    offers: (data.offers ?? []).map((o) => ({
      id: o.id,
      slug: o.slug,
      status: o.status,
      workspace_id: o.workspaceId,
      company_name: o.companyName,
      contact_name: o.contactName,
      email: o.email,
      phone: o.phone ?? "",
      cvr: o.cvr ?? "",
      packages: o.packages ?? [],
      public_package_view: o.publicPackageView,
      services: o.services ?? [],
      created_at: o.createdAt,
      updated_at: o.updatedAt,
      sent_at: o.sentAt ?? "",
      accepted_at: o.acceptedAt ?? "",
      accepted_via: o.acceptedVia,
      signature_name: o.signatureName,
    })),
    offerEngagement: (data.offerEngagement ?? []).map((g) => ({
      id: g.id,
      offer_id: g.offerId,
      slug: g.slug,
      started_at: g.startedAt,
      ended_at: g.endedAt ?? "",
      opened: Boolean(g.opened),
      max_scroll_pct: g.maxScrollPct ?? 0,
      duration_sec: g.durationSec ?? 0,
    })),
  }
}

const payload = serialize(raw)
const supabase = createClient(url, key, { auth: { persistSession: false } })

const { error } = await supabase.rpc("ci_replace_store", { p_payload: payload })
if (error) {
  console.error(error.message)
  process.exit(1)
}

const summary = {
  workspaces: payload.workspaces.length,
  commercialLines: payload.commercialLines.length,
  fixedExpenses: payload.fixedExpenses.length,
  offers: payload.offers.length,
  customerContacts: payload.customerContacts.length,
  auditLogs: payload.auditLogs.length,
}
console.log("Supabase opdateret:", summary)
