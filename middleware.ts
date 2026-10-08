import { createServerClient } from "@supabase/ssr"
import { NextResponse, type NextRequest } from "next/server"

import {
  clientLegacyRedirectTarget,
  isClientAllowedPath,
} from "@/lib/layout/client-routes"
import { isGuestShellPath } from "@/lib/layout/app-paths"
import { needsPasswordSetup } from "@/lib/auth/password-setup"

function isPublicPath(pathname: string) {
  return (
    pathname.startsWith("/login") ||
    pathname.startsWith("/auth/invite") ||
    pathname.startsWith("/auth/callback") ||
    pathname.startsWith("/auth/setup-password") ||
    pathname.startsWith("/logget-ud") ||
    pathname === "/tilmelding" ||
    pathname.startsWith("/tilmelding/")
  )
}

export async function middleware(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  const { pathname } = request.nextUrl

  if (pathname === "/klienter" || pathname.startsWith("/klienter/")) {
    return NextResponse.redirect(new URL("/", request.url))
  }

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.next()
  }

  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.next({
          request: {
            headers: request.headers,
          },
        })
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options)
        })
      },
    },
  })

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user && pathname.startsWith("/login")) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    return NextResponse.redirect(new URL("/", request.url))
  }

  if (user && pathname.startsWith("/auth/setup-password")) {
    return response
  }

  if (
    user &&
    needsPasswordSetup(user) &&
    !isGuestShellPath(pathname) &&
    !pathname.startsWith("/api/")
  ) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    const isClientRole =
      profile?.role === "client_admin" || profile?.role === "client_user"

    if (isClientRole) {
      return NextResponse.redirect(new URL("/auth/setup-password", request.url))
    }
  }

  if (!user && !isPublicPath(pathname) && !pathname.startsWith("/api/")) {
    const loginUrl = new URL("/login", request.url)
    loginUrl.searchParams.set("next", pathname)
    return NextResponse.redirect(loginUrl)
  }

  const isAdminRoute = pathname.startsWith("/admin")

  if (isAdminRoute) {
    if (!user) {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
      }
      const loginUrl = new URL("/login", request.url)
      loginUrl.searchParams.set("next", pathname)
      return NextResponse.redirect(loginUrl)
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.role !== "censio_admin") {
      if (pathname.startsWith("/api/")) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 })
      }
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  if (
    user &&
    !isGuestShellPath(pathname) &&
    !pathname.startsWith("/api/") &&
    !isAdminRoute &&
    !isClientAllowedPath(pathname)
  ) {
    const legacyTarget = clientLegacyRedirectTarget(pathname)
    if (legacyTarget) {
      return NextResponse.redirect(new URL(legacyTarget, request.url))
    }

    const { data: profile } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", user.id)
      .maybeSingle()

    if (profile?.role !== "censio_admin") {
      return NextResponse.redirect(new URL("/", request.url))
    }
  }

  return response
}

export const config = {
  matcher: [
    "/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
}
