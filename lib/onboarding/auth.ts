import { cookies } from "next/headers"

import { addDaysIso, createId, nowIso } from "@/lib/onboarding/ids"
import { toPublicSessionUser } from "@/lib/onboarding/public"
import { hashPassword, verifyPassword } from "@/lib/onboarding/password"
import { CENSIO_ADMIN_USER_ID, DEFAULT_CENSIO_ADMIN_PASSWORD, DEMO_WORKSPACE_ID, getStore } from "@/lib/onboarding/store"
import type { AuthSession, PublicSessionUser, StoreData } from "@/lib/onboarding/types"

function openAccessUser(): PublicSessionUser {
  return {
    id: CENSIO_ADMIN_USER_ID,
    email: "kontakt@censio.dk",
    name: "Kaj Eli Joensen",
    username: "Censio",
    title: "CEO & Founder",
    profileImage: "/kaj-eli-joensen.jpg",
    headAdmin: true,
    censioStaffRole: "admin",
    globalRole: "censio_admin",
    workspaceId: DEMO_WORKSPACE_ID,
    workspaceRole: "admin",
  }
}

function openAccessEnabled() {
  return process.env.CENSIO_OPEN_ACCESS === "1"
}

function fallbackAdmin(data: StoreData): PublicSessionUser {
  const admin = data.users.find((item) => item.id === CENSIO_ADMIN_USER_ID)
  if (!admin) return openAccessUser()
  return toPublicSessionUser(admin, DEMO_WORKSPACE_ID, "admin")
}

export const SESSION_COOKIE = "censio-session"
const SESSION_DAYS = 30

export function appUrl(request?: Request): string {
  const configured = process.env.NEXT_PUBLIC_APP_URL?.trim()
  if (configured) return configured.replace(/\/$/, "")
  if (request) {
    const url = new URL(request.url)
    return `${url.protocol}//${url.host}`
  }
  return "http://localhost:3000"
}

export async function createSession(
  userId: string,
  workspaceId: string | null
): Promise<AuthSession> {
  const store = getStore()
  return store.update((data) => {
    data.sessions = data.sessions.filter(
      (session) => new Date(session.expiresAt).getTime() > Date.now()
    )
    const session: AuthSession = {
      id: createId("ses"),
      userId,
      workspaceId,
      expiresAt: addDaysIso(SESSION_DAYS),
    }
    data.sessions.push(session)
    return session
  })
}

export async function destroySession(sessionId: string | undefined) {
  if (!sessionId) return
  const store = getStore()
  await store.update((data) => {
    data.sessions = data.sessions.filter((session) => session.id !== sessionId)
  })
}

export async function readSessionUser(): Promise<PublicSessionUser | null> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(SESSION_COOKIE)?.value
  const store = getStore()
  const data = await store.read()
  if (!sessionId) {
    return openAccessEnabled() ? fallbackAdmin(data) : null
  }
  const session = data.sessions.find(
    (item) =>
      item.id === sessionId && new Date(item.expiresAt).getTime() > Date.now()
  )
  if (!session) {
    return openAccessEnabled() ? fallbackAdmin(data) : null
  }
  const user = data.users.find((item) => item.id === session.userId)
  if (!user) {
    return openAccessEnabled() ? fallbackAdmin(data) : null
  }
  const membership = session.workspaceId
    ? data.memberships.find(
        (item) =>
          item.workspaceId === session.workspaceId && item.userId === user.id
      )
    : data.memberships.find((item) => item.userId === user.id)
  return toPublicSessionUser(
    user,
    session.workspaceId ?? membership?.workspaceId ?? null,
    membership?.role ?? null
  )
}

export async function requireCensioAdmin(): Promise<PublicSessionUser> {
  const user = await readSessionUser()
  if (!user || user.globalRole !== "censio_admin") {
    throw new AuthError("Kun Censio kan administrere kunder.", 403)
  }
  return user
}

export async function requireHeadAdmin(): Promise<PublicSessionUser> {
  const user = await requireCensioAdmin()
  if (!user.headAdmin) {
    throw new AuthError("Kun head admin kan se loggen.", 403)
  }
  return user
}

export async function requireWorkspaceAdmin(
  workspaceId?: string
): Promise<{ user: PublicSessionUser; workspaceId: string }> {
  const user = await readSessionUser()
  if (!user) throw new AuthError("Du skal være logget ind.", 401)
  if (user.globalRole === "censio_admin") {
    return { user, workspaceId: workspaceId || user.workspaceId || DEMO_WORKSPACE_ID }
  }
  const resolved = workspaceId || user.workspaceId
  if (!resolved) throw new AuthError("Intet workspace valgt.", 403)
  if (user.workspaceId && workspaceId && user.workspaceId !== workspaceId) {
    throw new AuthError("Du har ikke adgang til det workspace.", 403)
  }
  if (user.workspaceRole !== "admin") {
    throw new AuthError("Kun en admin kan ændre adgang.", 403)
  }
  return { user, workspaceId: resolved }
}

export async function authenticateUser(email: string, password: string) {
  const store = getStore()
  const data = await store.read()
  const login = email.trim().toLowerCase()
  const user = data.users.find(
    (item) => item.email.toLowerCase() === login || item.username.toLowerCase() === login
  )
  const matches = user ? verifyPassword(password, user.passwordHash) : false
  const expected = process.env.CENSIO_ADMIN_PASSWORD?.trim() || DEFAULT_CENSIO_ADMIN_PASSWORD
  const adopting = !!user && user.id === CENSIO_ADMIN_USER_ID && password === expected && !matches
  if (!user || (!matches && !adopting)) {
    throw new AuthError("Brugernavn eller adgangskode er forkert.", 401)
  }
  if (adopting) await setUserPassword(user.id, password)
  const workspaceId = defaultWorkspaceId(data, user.id, user.globalRole)
  return { user, workspaceId }
}

export async function setUserPassword(userId: string, password: string) {
  const store = getStore()
  await store.update((data) => {
    const user = data.users.find((item) => item.id === userId)
    if (!user) throw new Error("Brugeren findes ikke.")
    user.passwordHash = hashPassword(password)
  })
}

export function defaultWorkspaceId(
  data: StoreData,
  userId: string,
  globalRole: PublicSessionUser["globalRole"]
): string | null {
  if (globalRole === "censio_admin") return DEMO_WORKSPACE_ID
  const membership = data.memberships.find(
    (item) => item.userId === userId && item.status === "active"
  )
  return membership?.workspaceId ?? null
}

export async function applySessionCookie(sessionId: string) {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, sessionId, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  })
}

export async function clearSessionCookie() {
  const cookieStore = await cookies()
  cookieStore.set(SESSION_COOKIE, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  })
}

export class AuthError extends Error {
  status: number
  constructor(message: string, status: number) {
    super(message)
    this.status = status
  }
}

export function jsonError(error: unknown) {
  if (error instanceof AuthError) {
    return Response.json({ error: error.message }, { status: error.status })
  }
  const message = error instanceof Error ? error.message : "Noget gik galt."
  const status = /ugyldig|mangler|forkert/i.test(message) ? 400 : 500
  return Response.json({ error: message }, { status })
}

export { nowIso }
