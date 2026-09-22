import { NextResponse } from "next/server"

import { getOrganizationIdByPageId } from "@/lib/db/meta-config-repository"
import { getMetaConfigRow } from "@/lib/db/meta-config-repository"
import { decryptSecret } from "@/lib/meta/crypto"
import { ingestMetaLeadById } from "@/lib/meta/ingest-lead"
import { resolveMetaAccessToken } from "@/lib/meta/token"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  const url = new URL(request.url)
  const mode = url.searchParams.get("hub.mode")
  const token = url.searchParams.get("hub.verify_token")
  const challenge = url.searchParams.get("hub.challenge")
  const verifyToken = process.env.META_WEBHOOK_VERIFY_TOKEN ?? ""

  if (mode === "subscribe" && token === verifyToken && challenge) {
    return new NextResponse(challenge, { status: 200 })
  }

  return NextResponse.json({ error: "Verification failed" }, { status: 403 })
}

type MetaWebhookBody = {
  object?: string
  entry?: Array<{
    id?: string
    changes?: Array<{
      field?: string
      value?: {
        leadgen_id?: string
        page_id?: string
        form_id?: string
      }
    }>
  }>
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as MetaWebhookBody
    if (body.object !== "page") {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const admin = createAdminClient()
    const results: Array<{ leadgenId: string; created: boolean; leadId?: string; error?: string }> = []

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "leadgen") continue
        const leadgenId = change.value?.leadgen_id
        const pageId = change.value?.page_id ?? entry.id
        if (!leadgenId || !pageId) continue

        try {
          const organizationId = await getOrganizationIdByPageId(admin, String(pageId))
          if (!organizationId) {
            results.push({
              leadgenId,
              created: false,
              error: `No organization for page ${pageId}`,
            })
            continue
          }

          const config = await getMetaConfigRow(admin, organizationId)
          const resolved = resolveMetaAccessToken({
            metaSystemUserToken: config?.meta_system_user_token_encrypted
              ? decryptSecret(config.meta_system_user_token_encrypted)
              : "",
            metaPageAccessToken: config?.meta_page_access_token_encrypted
              ? decryptSecret(config.meta_page_access_token_encrypted)
              : "",
          })

          if (!resolved.token) {
            results.push({
              leadgenId,
              created: false,
              error: resolved.reason ?? "Missing Meta token",
            })
            continue
          }

          const ingested = await ingestMetaLeadById(
            admin,
            organizationId,
            leadgenId,
            resolved.token
          )
          results.push({
            leadgenId,
            created: ingested.created,
            leadId: ingested.leadId,
          })
        } catch (error) {
          results.push({
            leadgenId,
            created: false,
            error: error instanceof Error ? error.message : "Ingest failed",
          })
        }
      }
    }

    return NextResponse.json({ ok: true, results })
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Webhook processing failed.",
      },
      { status: 500 }
    )
  }
}
