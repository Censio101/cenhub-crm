import {
  applySessionCookie,
  createSession,
  jsonError,
} from "@/lib/onboarding/auth"
import { pushAudit } from "@/lib/onboarding/audit"
import { nowIso } from "@/lib/onboarding/ids"
import { isInviteOpen } from "@/lib/onboarding/public"
import { hashPassword } from "@/lib/onboarding/password"
import { DEMO_WORKSPACE_ID, getStore } from "@/lib/onboarding/store"

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params
    const data = await getStore().read()
    const invite = data.invites.find((item) => item.token === token && item.kind === "censio_admin")
    if (!invite || !isInviteOpen(invite)) {
      return Response.json({ error: "Invitationen er ikke længere gyldig." }, { status: 404 })
    }
    return Response.json({ name: invite.name, email: invite.email, username: data.users.find((user) => user.id === invite.userId)?.username ?? "" })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params
    const body = (await request.json()) as { password?: string }
    if (!body.password || body.password.length < 8) {
      throw new Error("Adgangskoden skal være mindst 8 tegn.")
    }
    const userId = await getStore().update((data) => {
      const invite = data.invites.find((item) => item.token === token && item.kind === "censio_admin")
      if (!invite || !isInviteOpen(invite)) throw new Error("Invitationen er ikke længere gyldig.")
      const user = data.users.find((item) => item.id === invite.userId)
      if (!user) throw new Error("Brugeren findes ikke.")
      user.passwordHash = hashPassword(body.password!)
      invite.usedAt = nowIso()
      pushAudit(data, user, {
        action: "Adgang",
        target: user.name,
        change: "Admin-brugeren har oprettet sin adgangskode og har nu adgang.",
      })
      return user.id
    })
    const session = await createSession(userId, DEMO_WORKSPACE_ID)
    await applySessionCookie(session.id)
    return Response.json({ ok: true })
  } catch (error) {
    return jsonError(error)
  }
}
