"use client"

import { useState } from "react"
import { EyeIcon, EyeOffIcon } from "lucide-react"
import { useRouter } from "next/navigation"

import { signIn } from "@/lib/session"
import { cn } from "cn"

export function LoginBoard() {
  const router = useRouter()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [pending, setPending] = useState(false)

  return (
    <div className="relative flex min-h-dvh items-center justify-center overflow-hidden bg-[#f6e4d8] px-4 py-10">
      <div
        aria-hidden
        className="pointer-events-none absolute -top-24 -left-16 size-[28rem] rounded-full bg-[#f3b183]/70 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute right-[-6rem] bottom-[-8rem] size-[32rem] rounded-full bg-[#e7c3b0]/80 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-1/3 left-[12%] size-40 rounded-full bg-[#E4660C]/10 blur-2xl"
      />
      <div className="relative z-10 flex w-full max-w-[22rem] flex-col items-center">
        <img
          src="/censio-logo-white.png"
          alt="Censio"
          className="mb-8 h-9 w-auto brightness-0"
        />
        <form
          className="w-full rounded-[22px] bg-white px-6 py-6 shadow-[0_20px_50px_rgba(80,40,20,0.08)]"
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
              router.push(payload.user?.globalRole === "censio_admin" ? "/admin" : "/")
              router.refresh()
            } catch {
              setError("Kunne ikke logge ind.")
            } finally {
              setPending(false)
            }
          }}
        >
          <label className="grid gap-1.5">
            <span className="text-sm text-[#8a8178]">Brugernavn</span>
            <input
              required
              autoComplete="username"
              autoCapitalize="none"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="h-11 rounded-lg border border-[#e6e0da] bg-white px-3 text-sm text-[#141414] outline-none focus:border-[#141414]"
            />
          </label>
          <label className="mt-4 grid gap-1.5">
            <span className="text-sm text-[#8a8178]">Adgangskode</span>
            <span className="relative">
              <input
                required
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                className="h-11 w-full rounded-lg border border-[#e6e0da] bg-white px-3 pr-11 text-sm text-[#141414] outline-none focus:border-[#141414]"
              />
              <button
                type="button"
                className="absolute top-1/2 right-2 inline-flex size-8 -translate-y-1/2 items-center justify-center rounded-md text-[#8a8178] hover:text-[#141414]"
                aria-label={showPassword ? "Skjul adgangskode" : "Vis adgangskode"}
                onClick={() => setShowPassword((current) => !current)}
              >
                {showPassword ? <EyeOffIcon className="size-4" /> : <EyeIcon className="size-4" />}
              </button>
            </span>
          </label>
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
          <button
            type="submit"
            disabled={pending}
            className={cn(
              "mt-5 h-11 w-full rounded-lg bg-[#1c1410] text-sm font-medium text-white",
              "hover:bg-[#2a211c] disabled:opacity-60"
            )}
          >
            {pending ? "Logger ind…" : "Log ind"}
          </button>
        </form>
      </div>
    </div>
  )
}
