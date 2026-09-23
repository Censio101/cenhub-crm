import { NextResponse } from "next/server"

import { getSessionContext } from "@/lib/auth/session-context"

export async function GET() {
  const ctx = await getSessionContext()

  return NextResponse.json({
    userId: ctx.userId,
    email: ctx.email,
    fullName: ctx.fullName,
    avatarUrl: ctx.profile?.avatar_url ?? null,
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
