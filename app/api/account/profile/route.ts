import { NextResponse } from "next/server"

import { getSessionContext } from "@/lib/auth/session-context"
import { updateProfileAvatar } from "@/lib/db/update-profile-avatar"
import { createAdminClient } from "@/lib/supabase/admin"

const MAX_AVATAR_BYTES = 2 * 1024 * 1024
const MAX_FULL_NAME_LENGTH = 120

export async function GET() {
  const ctx = await getSessionContext()
  if (!ctx.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  return NextResponse.json({
    fullName: ctx.fullName,
    avatarUrl: ctx.profile?.avatar_url ?? null,
    email: ctx.email,
  })
}

export async function PATCH(request: Request) {
  const ctx = await getSessionContext()
  if (!ctx.userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const body = (await request.json()) as {
    fullName?: unknown
    avatarUrl?: unknown
  }

  const admin = createAdminClient()

  if ("fullName" in body) {
    if (typeof body.fullName !== "string") {
      return NextResponse.json({ error: "Invalid name" }, { status: 400 })
    }
    const fullName = body.fullName.trim()
    if (!fullName) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }
    if (fullName.length > MAX_FULL_NAME_LENGTH) {
      return NextResponse.json({ error: "Name too long" }, { status: 400 })
    }

    const { error } = await admin
      .from("profiles")
      .update({ full_name: fullName })
      .eq("id", ctx.userId)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }
  }

  if ("avatarUrl" in body) {
    const avatarUrl =
      typeof body.avatarUrl === "string" ? body.avatarUrl.trim() : null

    if (avatarUrl && avatarUrl.length > 0) {
      if (!avatarUrl.startsWith("data:image/")) {
        return NextResponse.json({ error: "Invalid avatar image" }, { status: 400 })
      }
      const base64 = avatarUrl.split(",")[1]
      if (base64 && Buffer.byteLength(base64, "base64") > MAX_AVATAR_BYTES) {
        return NextResponse.json({ error: "Image too large" }, { status: 400 })
      }
    }

    await updateProfileAvatar(admin, ctx.userId, avatarUrl || null)
  }

  return NextResponse.json({ ok: true })
}
