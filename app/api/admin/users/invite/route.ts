import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { inviteOrCreateUser } from "@/lib/db/admin-users"
import type { UserRole } from "@/lib/db/types"
import { createAdminClient } from "@/lib/supabase/admin"

const ALLOWED_ROLES = new Set<UserRole>([
  "censio_admin",
  "client_admin",
  "client_user",
])

export async function POST(request: Request) {
  try {
    await requireCensioAdmin()
    const body = (await request.json()) as {
      email?: string
      role?: UserRole
      organizationId?: string | null
      method?: "email" | "password"
      password?: string
      fullName?: string
    }

    if (!body.email?.trim()) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    if (!body.role || !ALLOWED_ROLES.has(body.role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 })
    }

    if (!body.method || (body.method !== "email" && body.method !== "password")) {
      return NextResponse.json({ error: "Invalid invite method" }, { status: 400 })
    }

    const admin = createAdminClient()
    const result = await inviteOrCreateUser(admin, {
      email: body.email,
      role: body.role,
      organizationId: body.organizationId ?? null,
      method: body.method,
      password: body.password,
      fullName: body.fullName,
    })

    return NextResponse.json({
      ok: true,
      userId: result.userId,
      method: result.method,
    })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}
