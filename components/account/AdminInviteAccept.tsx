"use client"

import { useEffect, useState } from "react"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"

const fieldClass =
  "h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"

export function AdminInviteAccept({ token }: { token: string }) {
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    void (async () => {
      const response = await fetch(`/api/admin/invitation/${token}`)
      const payload = (await response.json()) as { error?: string; name?: string; email?: string }
      if (!response.ok) {
        setError(payload.error || "Invitationen er ikke længere gyldig.")
        setReady(true)
        return
      }
      setName(payload.name ?? "")
      setEmail(payload.email ?? "")
      setReady(true)
    })()
  }, [token])

  return (
    <div className="mx-auto w-full max-w-md pt-10">
      <Card className="dashboard-card">
        <CardHeader>
          <CardTitle>Adgang til Censio Internal</CardTitle>
          <CardDescription>
            {name ? `${name}, vælg en adgangskode for at få adgang.` : "Vælg en adgangskode for at få adgang."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {!ready ? <p className="text-sm text-[var(--text-secondary)]">Henter invitation…</p> : null}
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
          {ready && !error ? (
            <form
              className="grid gap-3"
              onSubmit={(event) => {
                event.preventDefault()
                setError(null)
                void (async () => {
                  const response = await fetch(`/api/admin/invitation/${token}`, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({ password }),
                  })
                  const payload = (await response.json()) as { error?: string }
                  if (!response.ok) {
                    setError(payload.error || "Adgangskoden kunne ikke gemmes.")
                    return
                  }
                  window.location.assign("/admin")
                })()
              }}
            >
              <p className="text-sm text-[var(--text-secondary)]">{email}</p>
              <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
                Adgangskode
                <input
                  type="password"
                  required
                  minLength={8}
                  autoComplete="new-password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  className={fieldClass}
                />
              </label>
              <Button type="submit" className="justify-self-start">
                Få adgang
              </Button>
            </form>
          ) : null}
        </CardContent>
      </Card>
    </div>
  )
}
