import { NextResponse } from "next/server"

import { processMetaLeadgenWebhookEvent } from "@/lib/meta/meta-instant-forms-service"
import { verifyMetaWebhookSignature } from "@/lib/meta/verify-webhook-signature"
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
  const rawBody = await request.text()
  const signature = request.headers.get("x-hub-signature-256")

  if (!verifyMetaWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 })
  }

  try {
    const body = JSON.parse(rawBody) as MetaWebhookBody
    if (body.object !== "page") {
      return NextResponse.json({ ok: true, ignored: true })
    }

    const admin = createAdminClient()
    const results: Array<{
      leadgenId: string
      created?: boolean
      leadId?: string
      skipped?: boolean
      error?: string
    }> = []

    for (const entry of body.entry ?? []) {
      for (const change of entry.changes ?? []) {
        if (change.field !== "leadgen") continue
        const leadgenId = change.value?.leadgen_id
        const pageId = change.value?.page_id ?? entry.id
        const formId = change.value?.form_id
        if (!leadgenId || !pageId) continue

        const outcome = await processMetaLeadgenWebhookEvent(admin, {
          pageId: String(pageId),
          leadgenId: String(leadgenId),
          formId: formId ? String(formId) : null,
        })

        results.push({
          leadgenId,
          created: outcome.ok && "created" in outcome ? outcome.created : undefined,
          leadId: outcome.ok && "leadId" in outcome ? outcome.leadId : undefined,
          skipped: outcome.ok && "skipped" in outcome ? outcome.skipped : undefined,
          error: !outcome.ok ? outcome.error : undefined,
        })
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
