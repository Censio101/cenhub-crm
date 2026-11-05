import type { User } from "@supabase/supabase-js"
import { NextResponse } from "next/server"

import { loadWorkspaceIntegrations } from "@/lib/admin/workspace-integrations"
import { consumeAuthRateLimit } from "@/lib/auth/auth-request-rate-limit"
import { clientIp, hashClientIp } from "@/lib/auth/client-ip"
import { inviteRedeemTokenMatches } from "@/lib/auth/invite-redeem-token"
import { createAdminClient } from "@/lib/supabase/admin"

const GENERIC_ERROR = "Could not start the invitation. Ask a Censio admin to resend it."

async function findUserByEmail(admin: ReturnType<typeof createAdminClient>, email: string) {
  let page = 1
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = data.users.find((user) => user.email?.toLowerCase() === email.toLowerCase())
    if (match) return match
    if (data.users.length < 200) break
    page += 1
  }
  return null
}

async function clearRedeemToken(admin: ReturnType<typeof createAdminClient>, user: User) {
  const metadata = { ...(user.user_metadata ?? {}) }
  delete metadata.invite_redeem_token_hash
  const { error } = await admin.auth.admin.updateUserById(user.id, { user_metadata: metadata })
  if (error) throw error
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: unknown; token?: unknown }
    const email = typeof body.email === "string" ? body.email.trim().toLowerCase() : ""
    const token = typeof body.token === "string" ? body.token.trim().toLowerCase() : ""

    const admin = createAdminClient()
    const rate = await consumeAuthRateLimit(admin, {
      kind: "redeem_invite",
      ipHash: hashClientIp(clientIp(request)),
    })
    if (!rate.allowed) {
      return NextResponse.json(
        { error: "For mange forsøg. Prøv igen senere." },
        { status: 429, headers: { "Retry-After": String(rate.retryAfterSeconds) } }
      )
    }

    if (!email || !token) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 })
    }

    const settings = await loadWorkspaceIntegrations(admin)
    const user = await findUserByEmail(admin, email)
    if (!user || !inviteRedeemTokenMatches(user.user_metadata?.invite_redeem_token_hash, token)) {
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 })
    }

    const isConfirmed = Boolean(user.email_confirmed_at ?? user.confirmed_at)
    const passwordSetupComplete = user.user_metadata?.password_setup_complete === true

    if (isConfirmed && passwordSetupComplete) {
      await clearRedeemToken(admin, user)
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
      return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 })
    }

    await clearRedeemToken(admin, user)
    return NextResponse.json({ url: actionLink })
  } catch (error) {
    console.error(error)
    return NextResponse.json({ error: GENERIC_ERROR }, { status: 400 })
  }
}
