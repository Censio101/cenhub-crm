import { NextResponse } from "next/server"

import {
  sendMagicLinkLoginEmail,
  sendPasswordResetLoginEmail,
} from "@/lib/email/send-auth-email"
import { createAdminClient } from "@/lib/supabase/admin"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; type?: "magiclink" | "recovery" }
    const email = body.email?.trim()

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const admin = createAdminClient()

    if (body.type === "recovery") {
      await sendPasswordResetLoginEmail(admin, email)
    } else {
      await sendMagicLinkLoginEmail(admin, email)
    }

    return NextResponse.json({ ok: true })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
