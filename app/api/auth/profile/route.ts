import { jsonError, readSessionUser } from "@/lib/onboarding/auth"
import { pushAudit } from "@/lib/onboarding/audit"
import { getStore } from "@/lib/onboarding/store"
import type { AuthUser } from "@/lib/onboarding/types"

const MAX_IMAGE = 2_500_000

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

function profileChange(before: AuthUser, after: AuthUser) {
  const parts: string[] = []
  if (before.name !== after.name) parts.push(`Navn: ${before.name} → ${after.name}`)
  if (before.title !== after.title) parts.push(`Stilling: ${before.title || ","} → ${after.title || ","}`)
  if (before.email !== after.email) parts.push(`E-mail: ${before.email} → ${after.email}`)
  if (before.username !== after.username) parts.push(`Brugernavn: ${before.username} → ${after.username}`)
  if (before.profileImage !== after.profileImage) parts.push("Profilbillede er udskiftet")
  return parts.join(". ")
}

export async function PATCH(request: Request) {
  try {
    const actor = await readSessionUser()
    if (!actor) {
      return Response.json({ error: "Du skal være logget ind." }, { status: 401 })
    }
    const body = (await request.json()) as {
      name?: string
      title?: string
      email?: string
      username?: string
      profileImage?: string
    }
    const name = body.name?.trim() ?? ""
    const title = body.title?.trim() ?? ""
    const email = body.email?.trim().toLowerCase() ?? ""
    const username = cleanUsername(body.username ?? "")
    const profileImage = body.profileImage?.trim() ?? ""
    if (!name || name.length > 80) throw new Error("Skriv et navn.")
    if (title.length > 80) throw new Error("Stillingen er for lang.")
    if (!email.includes("@")) throw new Error("Skriv en gyldig e-mail.")
    if (profileImage && !/^data:image\/(png|jpeg|webp);base64,/.test(profileImage) && !profileImage.startsWith("/")) {
      throw new Error("Profilbilledet skal være et billede.")
    }
    if (profileImage.length > MAX_IMAGE) throw new Error("Billedet er for stort. Vælg et under 2 MB.")

    const store = getStore()
    const saved = await store.update((data) => {
      const user = data.users.find((item) => item.id === actor.id)
      if (!user) throw new Error("Brugeren findes ikke.")
      const emailTaken = data.users.some(
        (item) => item.id !== user.id && item.email.toLowerCase() === email
      )
      if (emailTaken) throw new Error("E-mailen er allerede i brug.")
      const usernameTaken = data.users.some(
        (item) => item.id !== user.id && item.username.toLowerCase() === username.toLowerCase()
      )
      if (usernameTaken) throw new Error("Brugernavnet er allerede i brug.")
      const before = { ...user }
      user.name = name
      user.title = title
      user.email = email
      user.username = username
      user.profileImage = profileImage
      const change = profileChange(before, user)
      if (change) {
        pushAudit(data, user, { action: "Profil", target: user.name, change })
      }
      return user
    })
    return Response.json({
      user: {
        id: saved.id,
        name: saved.name,
        title: saved.title,
        email: saved.email,
        username: saved.username,
        profileImage: saved.profileImage,
        headAdmin: saved.headAdmin,
      },
    })
  } catch (error) {
    return jsonError(error)
  }
}
