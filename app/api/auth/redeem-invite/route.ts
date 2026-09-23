import { NextResponse } from "next/server"

import { loadWorkspaceIntegrations } from "@/lib/admin/workspace-integrations"
import { createAdminClient } from "@/lib/supabase/admin"

async function findUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  let page = 1
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    )
    if (match) return match
    if (data.users.length < 200) break
    page += 1
  }
  return null
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""

    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 })
    }

    const admin = createAdminClient()
    const settings = await loadWorkspaceIntegrations(admin)
    const user = await findUserByEmail(admin, email)

    if (!user) {
      return NextResponse.json({ error: "No invitation found for this email." }, { status: 404 })
    }

    const isConfirmed = Boolean(user.email_confirmed_at ?? user.confirmed_at)
    const passwordSetupComplete =
      user.user_metadata?.password_setup_complete === true

    if (isConfirmed && passwordSetupComplete) {
      return NextResponse.json({
        alreadyActive: true,
        redirectUrl: settings.loginUrl,
      })
    }

    const linkType = isConfirmed ? "magiclink" : "invite"
    const { data, error } = await admin.auth.admin.generateLink({
      type: linkType,
      email,
      options: { redirectTo: settings.inviteRedirectUrl },
    })

    if (error) throw error

    const actionLink = data.properties.action_link
    if (!actionLink) {
      return NextResponse.json({ error: "Invite link could not be generated" }, { status: 500 })
    }

    return NextResponse.json({ url: actionLink })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not redeem invitation"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
