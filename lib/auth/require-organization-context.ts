import { NextResponse } from "next/server"

import { NO_ACTIVE_ORGANIZATION_ERROR } from "@/lib/auth/active-organization"
import { getSessionContext, type SessionContext } from "@/lib/auth/session-context"

export class OrganizationContextError extends Error {
  code: string

  constructor(code: string, message: string) {
    super(message)
    this.name = "OrganizationContextError"
    this.code = code
  }
}

export async function requireOrganizationContext(): Promise<
  SessionContext & { organization: NonNullable<SessionContext["organization"]> }
> {
  const ctx = await getSessionContext()

  if (!ctx.organization?.id) {
    throw new OrganizationContextError(
      NO_ACTIVE_ORGANIZATION_ERROR,
      ctx.role === "censio_admin"
        ? "Select a client to view their dashboard."
        : "Unauthorized — no organization context"
    )
  }

  return {
    ...ctx,
    organization: ctx.organization,
  }
}

export function organizationErrorResponse(error: unknown) {
  if (error instanceof OrganizationContextError) {
    const status = error.code === NO_ACTIVE_ORGANIZATION_ERROR ? 403 : 401
    return NextResponse.json({ error: error.code, message: error.message }, { status })
  }

  console.error(error)
  return NextResponse.json({ error: "Internal server error" }, { status: 500 })
}
