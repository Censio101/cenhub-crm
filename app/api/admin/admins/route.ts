import { appUrl, jsonError, requireCensioAdmin, requireHeadAdmin } from "@/lib/onboarding/auth"
import { pushAudit } from "@/lib/onboarding/audit"
import { addDaysIso, createId, createToken, nowIso } from "@/lib/onboarding/ids"
import { sendInviteEmail } from "@/lib/onboarding/mail"
import { getStore } from "@/lib/onboarding/store"
import type { CensioStaffRole, Invite } from "@/lib/onboarding/types"

function cleanUsername(value: string) {
  const username = value.trim()
  if (username.length < 2 || username.length > 40) {
    throw new Error("Brugernavnet skal være mellem 2 og 40 tegn.")
  }
  if (!/^[\p{L}\p{N}._-]+$/u.test(username)) {
    throw new Error("Brugernavnet må kun indeholde bogstaver, tal, punktum, bindestreg og underscore.")
  }
  return username
}

export async function GET() {
  try {
    await requireCensioAdmin()
    const data = await getStore().read()
    const admins = data.users
      .filter((user) => user.globalRole === "censio_admin")
      .map((user) => ({
        id: user.id,
        name: user.name,
        email: user.email,
        username: user.username,
        title: user.title,
        headAdmin: user.headAdmin,
        role: user.censioStaffRole === "medarbejder" ? "medarbejder" : "admin",
        hasPassword: Boolean(user.passwordHash),
      }))
      .sort((a, b) => Number(b.headAdmin) - Number(a.headAdmin) || a.name.localeCompare(b.name, "da"))
    return Response.json({ admins })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireHeadAdmin()
    const body = (await request.json()) as {
      name?: string
      email?: string
      username?: string
      role?: string
    }
    const name = body.name?.trim() ?? ""
    const email = body.email?.trim().toLowerCase() ?? ""
    const username = cleanUsername(body.username ?? "")
    const staffRole: CensioStaffRole = body.role === "medarbejder" ? "medarbejder" : "admin"
    if (!name || name.length > 80) throw new Error("Skriv et navn.")
    if (!email.includes("@")) throw new Error("Skriv en gyldig e-mail.")

    const token = createToken()
    const url = `${appUrl(request)}/admin/invitation/${token}`
    const store = getStore()
    const created = await store.update((data) => {
      const emailTaken = data.users.some((user) => user.email.toLowerCase() === email)
      if (emailTaken) throw new Error("E-mailen er allerede i brug.")
      const usernameTaken = data.users.some(
        (user) => user.username.toLowerCase() === username.toLowerCase()
      )
      if (usernameTaken) throw new Error("Brugernavnet er allerede i brug.")
      const user = {
        id: createId("user"),
        email,
        name,
        username,
        title: "",
        profileImage: "",
        headAdmin: false,
        censioStaffRole: staffRole,
        passwordHash: null,
        globalRole: "censio_admin" as const,
        createdAt: nowIso(),
      }
      data.users.push(user)
      const invite: Invite = {
        id: createId("inv"),
        token,
        workspaceId: "censio-internal",
        userId: user.id,
        email,
        name,
        role: staffRole,
        kind: "censio_admin",
        expiresAt: addDaysIso(7),
        usedAt: null,
        lastSentAt: nowIso(),
        lastInviteUrl: url,
        mailSent: false,
      }
      data.invites.push(invite)
      pushAudit(data, actor, {
        action: "Invitation",
        target: name,
        change: `Inviterede ${name} (${email}, brugernavn ${username}) som ${staffRole}.`,
      })
      return invite
    })

    const mailed = await sendInviteEmail({
      to: email,
      name,
      companyName: "Censio Internal",
      url,
      kind: "employee",
    })
    if (mailed.sent) {
      await store.update((data) => {
        const invite = data.invites.find((item) => item.id === created.id)
        if (invite) invite.mailSent = true
      })
    }
    return Response.json({
      sent: mailed.sent,
      url,
      name,
      email,
      error: mailed.error,
    })
  } catch (error) {
    return jsonError(error)
  }
}
