import { cookies } from "next/headers"
import { NextResponse } from "next/server"

import { ACTIVE_ORG_COOKIE } from "@/lib/auth/active-organization"
import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { getSessionContext } from "@/lib/auth/session-context"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { createAdminClient } from "@/lib/supabase/admin"

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  }
}

export async function GET() {
  try {
    await requireCensioAdmin()
    const ctx = await getSessionContext()

    if (!ctx.organization) {
      return NextResponse.json({ organization: null })
    }

    return NextResponse.json({
      organization: {
        id: ctx.organization.id,
        slug: ctx.organization.slug,
        name: ctx.organization.name,
        demoMode: ctx.organization.demo_mode,
      },
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireCensioAdmin()
    const body = (await request.json()) as { slug?: string | null }
    const cookieStore = await cookies()

    if (!body.slug?.trim()) {
      cookieStore.delete(ACTIVE_ORG_COOKIE)
      return NextResponse.json({ organization: null })
    }

    const slug = body.slug.trim()
    const admin = createAdminClient()
    const organization = await getOrganizationBySlug(admin, slug)

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    cookieStore.set(ACTIVE_ORG_COOKIE, organization.slug, cookieOptions())

    return NextResponse.json({
      organization: {
        id: organization.id,
        slug: organization.slug,
        name: organization.name,
        demoMode: organization.demo_mode,
      },
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
