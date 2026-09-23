import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { updateProfileAvatar } from "@/lib/db/update-profile-avatar"
import { createAdminClient } from "@/lib/supabase/admin"

const MAX_AVATAR_BYTES = 2 * 1024 * 1024

export async function PATCH(request: Request) {
  try {
    const ctx = await requireCensioAdmin()
    const body = (await request.json()) as { avatarUrl?: unknown }
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

    if (!ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()
    await updateProfileAvatar(admin, ctx.userId, avatarUrl || null)

    return NextResponse.json({ ok: true })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
