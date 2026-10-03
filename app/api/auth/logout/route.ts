import { cookies } from "next/headers"

import {
  clearSessionCookie,
  destroySession,
  SESSION_COOKIE,
} from "@/lib/onboarding/auth"

export async function POST() {
  const cookieStore = await cookies()
  await destroySession(cookieStore.get(SESSION_COOKIE)?.value)
  await clearSessionCookie()
  return Response.json({ ok: true })
}
