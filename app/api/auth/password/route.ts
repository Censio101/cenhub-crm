import { jsonError, readSessionUser, setUserPassword } from "@/lib/onboarding/auth"
import { pushAudit } from "@/lib/onboarding/audit"
import { verifyPassword } from "@/lib/onboarding/password"
import { getStore } from "@/lib/onboarding/store"

export async function POST(request: Request) {
  try {
    const user = await readSessionUser()
    if (!user) {
      return Response.json({ error: "Du skal være logget ind." }, { status: 401 })
    }
    const body = (await request.json()) as {
      currentPassword?: string
      newPassword?: string
    }
    if (!body.newPassword || body.newPassword.length < 8) {
      return Response.json(
        { error: "Den nye kode skal være mindst 8 tegn." },
        { status: 400 }
      )
    }
    const data = await getStore().read()
    const stored = data.users.find((item) => item.id === user.id)
    if (
      stored?.passwordHash &&
      !verifyPassword(body.currentPassword ?? "", stored.passwordHash)
    ) {
      return Response.json(
        { error: "Den nuværende kode er forkert." },
        { status: 400 }
      )
    }
    await setUserPassword(user.id, body.newPassword)
    await getStore().update((data) => {
      pushAudit(data, user, {
        action: "Kode",
        target: user.name,
        change: "Adgangskoden er skiftet.",
      })
    })
    return Response.json({ ok: true })
  } catch (error) {
    return jsonError(error)
  }
}
