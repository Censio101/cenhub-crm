import { jsonError, requireHeadAdmin, setUserPassword } from "@/lib/onboarding/auth"
import { pushAudit } from "@/lib/onboarding/audit"
import { getStore } from "@/lib/onboarding/store"

export async function POST(
  request: Request,
  context: { params: Promise<{ userId: string }> }
) {
  try {
    const actor = await requireHeadAdmin()
    const { userId } = await context.params
    const body = (await request.json()) as { newPassword?: string }
    if (!body.newPassword || body.newPassword.length < 8) {
      throw new Error("Den nye kode skal være mindst 8 tegn.")
    }
    const store = getStore()
    await store.update((data) => {
      const target = data.users.find((user) => user.id === userId)
      if (!target || target.globalRole !== "censio_admin") {
        throw new Error("Brugeren findes ikke.")
      }
      if (target.headAdmin && target.id !== actor.id) {
        throw new Error("Head admin kan kun skifte egen kode her.")
      }
      pushAudit(data, actor, {
        action: "Kode",
        target: target.name,
        change: "Head admin satte ny adgangskode for brugeren.",
      })
    })
    await setUserPassword(userId, body.newPassword)
    return Response.json({ ok: true })
  } catch (error) {
    return jsonError(error)
  }
}
