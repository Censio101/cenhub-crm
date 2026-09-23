import { NextResponse } from "next/server"

import {
  getWorkspaceIntegrationsRow,
  loadWorkspaceIntegrations,
  saveWorkspaceIntegrations,
  type WorkspaceIntegrationsPublic,
} from "@/lib/admin/workspace-integrations"
import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { createAdminClient } from "@/lib/supabase/admin"

function toPublicResponse(settings: WorkspaceIntegrationsPublic) {
  const { mailgunApiKey: _apiKey, ...rest } = settings
  return rest
}

export async function GET() {
  try {
    await requireCensioAdmin()
    const admin = createAdminClient()
    const settings = await loadWorkspaceIntegrations(admin)
    return NextResponse.json({ settings: toPublicResponse(settings) })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function PUT(request: Request) {
  try {
    await requireCensioAdmin()
    const body = (await request.json()) as {
      mailgunApiKey?: string | null
      mailgunDomain?: string | null
      mailgunApiBase?: string | null
      mailFrom?: string | null
      mailFromName?: string | null
      siteUrl?: string | null
      authCallbackPath?: string | null
      contactFormUrl?: string | null
    }

    const admin = createAdminClient()
    const currentRow = await getWorkspaceIntegrationsRow(admin)

    const settings = await saveWorkspaceIntegrations(
      admin,
      {
        mailgunApiKey:
          body.mailgunApiKey === undefined || body.mailgunApiKey === ""
            ? undefined
            : body.mailgunApiKey,
        mailgunDomain: body.mailgunDomain,
        mailgunApiBase: body.mailgunApiBase,
        mailFrom: body.mailFrom,
        mailFromName: body.mailFromName,
        siteUrl: body.siteUrl,
        authCallbackPath: body.authCallbackPath,
        contactFormUrl: body.contactFormUrl,
      },
      currentRow
    )

    return NextResponse.json({ settings: toPublicResponse(settings) })
  } catch (error) {
    if (error instanceof Error) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}
