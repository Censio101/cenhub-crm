import { appUrl, jsonError, requireCensioAdmin } from "@/lib/onboarding/auth"
import { resendInvite } from "@/lib/onboarding/provision"
import { toAdminWorkspaceRow } from "@/lib/onboarding/public"
import { getStore } from "@/lib/onboarding/store"

export async function POST(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await requireCensioAdmin()
    const { id } = await context.params
    const body = (await request.json().catch(() => ({}))) as { inviteId?: string }
    const data = await getStore().read()
    const invites = data.invites.filter((invite) => invite.workspaceId === id)
    const targets = body.inviteId
      ? invites.filter((invite) => invite.id === body.inviteId)
      : invites.filter((invite) => !invite.usedAt)
    if (targets.length === 0) {
      return Response.json({ error: "Ingen invitationer at sende." }, { status: 400 })
    }

    const deliveries = []
    for (const invite of targets) {
      deliveries.push(await resendInvite(getStore(), invite.id, appUrl(request)))
    }
    const next = await getStore().read()
    const workspace = next.workspaces.find((item) => item.id === id)
    return Response.json({
      workspace: workspace ? toAdminWorkspaceRow(workspace, next) : null,
      deliveries,
    })
  } catch (error) {
    return jsonError(error)
  }
}
