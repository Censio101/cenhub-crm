import { NextResponse } from "next/server"

import { getSessionContext } from "@/lib/auth/session-context"
import { isLocale } from "@/lib/i18n"
import type { Locale } from "@/lib/i18n/types"

function preferredLocaleFromProfile(value: string | undefined | null): Locale {
  if (value && isLocale(value)) return value
  return "da"
}

export async function GET() {
  const ctx = await getSessionContext()

  return NextResponse.json({
    userId: ctx.userId,
    email: ctx.email,
    fullName: ctx.fullName,
    avatarUrl: ctx.profile?.avatar_url ?? null,
    preferredLocale: preferredLocaleFromProfile(ctx.profile?.preferred_locale),
    role: ctx.role,
    organization: ctx.organization
      ? {
          id: ctx.organization.id,
          slug: ctx.organization.slug,
          name: ctx.organization.name,
          demoMode: ctx.organization.demo_mode,
        }
      : null,
    isDemoFallback: ctx.isDemoFallback,
    isAdminViewingClient: ctx.isAdminViewingClient,
  })
}
