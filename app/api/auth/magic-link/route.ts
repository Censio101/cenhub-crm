import { NextResponse } from "next/server"

import {
  sendMagicLinkLoginEmail,
  sendPasswordResetLoginEmail,
} from "@/lib/email/send-auth-email"
import { consumeAuthRateLimit, type AuthRequestKind } from "@/lib/auth/auth-request-rate-limit"
import { clientIp, hashClientIp } from "@/lib/auth/client-ip"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; type?: "magiclink" | "recovery" }
    const email = body.email?.trim()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const kind: AuthRequestKind = body.type === "recovery" ? "recovery" : "magiclink"
    const admin = createAdminClient()
    const rate = await consumeAuthRateLimit(admin, {
      kind,
      ipHash: hashClientIp(clientIp(request)),
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "For mange forsøg. Prøv igen senere." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      )
    }

    if (body.type === "recovery") {
      await sendPasswordResetLoginEmail(admin, email)
    } else {
      await sendMagicLinkLoginEmail(admin, email)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error && error.message === "E-mail er ikke konfigureret.") {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ ok: true })
  }
}
