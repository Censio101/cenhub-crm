"use client"

import Link from "next/link"
import { useState } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

import { signIn } from "@/lib/session"
import { cn } from "cn"

export function InternalLoginScreen() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const returnTo = searchParams.get("return") || "/admin"
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-4 py-12">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-[linear-gradient(145deg,#E4660C_0%,#8B3A08_28%,#2A211C_58%,#121110_100%)]"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute -top-32 left-1/2 size-[36rem] -translate-x-1/2 rounded-full bg-[#E4660C]/35 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-10%] bottom-[-20%] size-[28rem] rounded-full bg-black/40 blur-3xl"
      />

      <div className="relative z-10 w-full max-w-[24rem]">
        <div className="mb-8 text-center">
          <img
            src="/censio-logo-white.png"
            alt=""
            className="mx-auto mb-5 h-8 w-auto opacity-95"
          />
          <h1 className="text-2xl font-semibold tracking-tight text-white sm:text-[1.65rem]">
            Censio Internal
          </h1>
          <p className="mt-2 text-sm text-white/70">Log ind for at fortsætte</p>
        </div>

        <form
          className="rounded-[22px] border border-white/10 bg-[#1a1614]/85 px-6 py-7 shadow-[0_24px_60px_rgba(0,0,0,0.45)] backdrop-blur-md"
          onSubmit={async (event) => {
            event.preventDefault()
            setPending(true)
            setError(null)
            try {
              const response = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ email: username, password }),
              })
              const payload = (await response.json()) as {
                error?: string
                user?: { globalRole: string }
              }
              if (!response.ok) {
                setError(payload.error || "Kunne ikke logge ind.")
                return
              }
              signIn()
              const target =
                payload.user?.globalRole === "censio_admin"
                  ? returnTo.startsWith("/admin") || returnTo.startsWith("/indstillinger")
                    ? returnTo
                    : "/admin"
                  : "/"
              router.push(target)
              router.refresh()
            } catch {
              setError("Kunne ikke logge ind.")
            } finally {
              setPending(false)
            }
          }}
        >
          <label className="grid gap-1.5">
            <span className="text-sm text-white/75">Brugernavn eller e-mail</span>
            <input
              required
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="h-11 rounded-xl border border-white/15 bg-black/25 px-3 text-sm text-white outline-none placeholder:text-white/35 focus:border-[#E4660C]/80 focus:ring-1 focus:ring-[#E4660C]/50"
              placeholder="fx Censio"
            />
          </label>
          <label className="mt-4 grid gap-1.5">
            <span className="text-sm text-white/75">Adgangskode</span>
            <span className="relative block">
              <input
                required
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-xl border border-white/15 bg-black/25 px-3 pr-11 text-sm text-white outline-none focus:border-[#E4660C]/80 focus:ring-1 focus:ring-[#E4660C]/50"
              />
              <button
                type="button"
                className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-lg text-white/60 hover:text-white"
                aria-label={showPassword ? "Skjul adgangskode" : "Vis adgangskode"}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </span>
          </label>
          {error ? <p className="mt-3 text-sm text-[#ffb4a0]">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className={cn(
              "mt-5 h-11 w-full rounded-xl bg-[#E4660C] text-sm font-medium text-white",
              "hover:bg-[#f07820] disabled:opacity-60"
            )}
          >
            {pending ? "Logger ind…" : "Log ind"}
          </button>
          <p className="mt-4 text-center">
            <Link
              href="/login/glemt-kode"
              className="text-sm text-white/65 underline-offset-4 hover:text-white hover:underline"
            >
              Glemt kode?
            </Link>
          </p>
        </form>
      </div>
    </div>
  )
}
