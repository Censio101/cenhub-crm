import { NextResponse } from "next/server"
import type { NextRequest } from "next/server"

import { isPublicRequest } from "@/lib/onboarding/route-access"

const SESSION_COOKIE = "censio-session"

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  if (pathname === "/log-ind") {
    const url = request.nextUrl.clone()
    url.pathname = "/login"
    return NextResponse.redirect(url)
  }

  if (isPublicRequest(pathname)) {
    return NextResponse.next()
  }

  const hasSession = Boolean(request.cookies.get(SESSION_COOKIE)?.value)
  if (hasSession) {
    return NextResponse.next()
  }

  if (pathname.startsWith("/api/")) {
    return NextResponse.json(
      { error: "Du skal være logget ind." },
      { status: 401 }
    )
  }

  const login = request.nextUrl.clone()
  login.pathname = "/login"
  login.searchParams.set("return", pathname)
  return NextResponse.redirect(login)
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|mp4)$).*)",
  ],
}
