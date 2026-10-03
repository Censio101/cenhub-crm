import { cookies } from "next/headers"
import { redirect } from "next/navigation"

import {
  clearSessionCookie,
  destroySession,
  SESSION_COOKIE,
} from "@/lib/onboarding/auth"

export default async function LoggedOutPage() {
  const cookieStore = await cookies()
  await destroySession(cookieStore.get(SESSION_COOKIE)?.value)
  await clearSessionCookie()
  redirect("/login")
}
