import { isInviteOpen, toPublicInvite } from "@/lib/onboarding/public"
import { getStore } from "@/lib/onboarding/store"

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> }
) {
  const { token } = await context.params
  const data = await getStore().read()
  const invite = data.invites.find((item) => item.token === token)
  const workspace = invite
    ? data.workspaces.find((item) => item.id === invite.workspaceId)
    : null
  if (!invite || !workspace || !isInviteOpen(invite)) {
    return Response.json(
      { error: "Invitationen er ugyldig eller udløbet." },
      { status: 404 }
    )
  }
  return Response.json({ invite: toPublicInvite(invite, workspace) })
}
