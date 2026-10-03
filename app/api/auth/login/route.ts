import {
  applySessionCookie,
  authenticateUser,
  createSession,
  jsonError,
} from "@/lib/onboarding/auth"
import { toPublicSessionUser } from "@/lib/onboarding/public"
import { getStore } from "@/lib/onboarding/store"

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { email?: string; password?: string }
    const { user, workspaceId } = await authenticateUser(
      body.email ?? "",
      body.password ?? ""
    )
    const session = await createSession(user.id, workspaceId)
    await applySessionCookie(session.id)
    const data = await getStore().read()
    const membership = workspaceId
      ? data.memberships.find(
          (item) => item.workspaceId === workspaceId && item.userId === user.id
        )
      : undefined
    return Response.json({
      user: toPublicSessionUser(user, workspaceId, membership?.role ?? null),
    })
  } catch (error) {
    return jsonError(error)
  }
}
