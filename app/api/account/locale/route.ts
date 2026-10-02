import { NextResponse } from "next/server"

import { getSessionContext } from "@/lib/auth/session-context"
import { updateProfilePreferredLocale } from "@/lib/db/update-profile-preferred-locale"
import { isLocale } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n/types"
import { createAdminClient } from "@/lib/supabase/admin"

function parsePreferredLocale(value: unknown): Locale | null {
  if (typeof value !== "string" || !isLocale(value)) return null
  return value
}

export async function PATCH(request: Request) {
  try {
    const ctx = await getSessionContext()
    if (!ctx.userId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as { preferredLocale?: unknown }
    const preferredLocale = parsePreferredLocale(body.preferredLocale)
    if (!preferredLocale) {
      return NextResponse.json({ error: "Invalid preferred locale" }, { status: 400 })
    }

    const admin = createAdminClient()
    await updateProfilePreferredLocale(admin, ctx.userId, preferredLocale)

    return NextResponse.json({ ok: true, preferredLocale })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: "Could not save language" }, { status: 500 })
  }
}
