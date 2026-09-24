import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { updateProfileAvatar } from "@/lib/db/update-profile-avatar"
import { updateProfilePreferredLocale } from "@/lib/db/update-profile-preferred-locale"
import { isLocale } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n/types"
import { createAdminClient } from "@/lib/supabase/admin"

const MAX_AVATAR_BYTES = 2 * 1024 * 1024

function parsePreferredLocale(value: unknown): Locale | null {
  if (typeof value !== "string" || !isLocale(value)) return null
  return value
}

export async function GET() {
  try {
    const ctx = await requireCensioAdmin()
    if (!ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()
    const { data, error } = await admin
      .from("profiles")
      .select("preferred_locale, full_name, avatar_url")
      .eq("id", ctx.userId)
      .maybeSingle()

    if (error) throw error

    const preferredLocale =
      data?.preferred_locale && isLocale(data.preferred_locale)
        ? data.preferred_locale
        : "da"

    return NextResponse.json({
      preferredLocale,
      fullName: data?.full_name ?? null,
      avatarUrl: data?.avatar_url ?? null,
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function PATCH(request: Request) {
  try {
    const ctx = await requireCensioAdmin()
    const body = (await request.json()) as {
      avatarUrl?: unknown
      preferredLocale?: unknown
    }

    if (!ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const admin = createAdminClient()

    if ("preferredLocale" in body) {
      const preferredLocale = parsePreferredLocale(body.preferredLocale)
      if (!preferredLocale) {
        return NextResponse.json({ error: "Invalid preferred locale" }, { status: 400 })
      }
      await updateProfilePreferredLocale(admin, ctx.userId, preferredLocale)
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
  } catch (error) {
    return adminErrorResponse(error)
  }
}
