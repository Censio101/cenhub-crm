import { NextResponse } from "next/server"

import { getCachedSessionContext } from "@/lib/auth/cached-session"
import type { SessionContext } from "@/lib/auth/session-context"

export class AdminAuthError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "AdminAuthError"
  }
}

export async function requireCensioAdmin(): Promise<SessionContext> {
  const ctx = await getCachedSessionContext()

  if (!ctx.userId) {
    throw new AdminAuthError("Unauthorized")
  }

  if (ctx.role !== "censio_admin") {
    throw new AdminAuthError("Forbidden")
  }

  return ctx
}

export function adminErrorResponse(error: unknown) {
  if (error instanceof AdminAuthError) {
    const status = error.message === "Forbidden" ? 403 : 401
    return NextResponse.json({ error: error.message }, { status })
  }

  console.error(error)
  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}
