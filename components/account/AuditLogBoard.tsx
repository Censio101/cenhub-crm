"use client"

import Link from "next/link"
import { useEffect, useState } from "react"

import { Card, CardContent } from "@/components/ui/card"

const fieldClass =
  "h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"

type LogRow = {
  id: string
  at: string
  userId: string
  userName: string
  action: string
  target: string
  change: string
}

type LogUser = { id: string; name: string }

export function AuditLogBoard() {
  const [q, setQ] = useState("")
  const [userId, setUserId] = useState("")
  const [from, setFrom] = useState("")
  const [to, setTo] = useState("")
  const [logs, setLogs] = useState<LogRow[]>([])
  const [users, setUsers] = useState<LogUser[]>([])
  const [error, setError] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [allowed, setAllowed] = useState(false)

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const params = new URLSearchParams()
      if (q.trim()) params.set("q", q.trim())
      if (userId) params.set("userId", userId)
      if (from) params.set("from", from)
      if (to) params.set("to", to)
      void (async () => {
        setLoading(true)
        const response = await fetch(`/api/admin/logs?${params.toString()}`)
        const payload = (await response.json()) as { error?: string; logs?: LogRow[]; users?: LogUser[] }
        setLoading(false)
        if (!response.ok) {
          setAllowed(false)
          setError(payload.error || "Loggen kunne ikke hentes.")
          setLogs([])
          return
        }
        setAllowed(true)
        setError(null)
        setLogs(payload.logs ?? [])
        setUsers(payload.users ?? [])
      })()
    }, 200)
    return () => window.clearTimeout(handle)
  }, [q, userId, from, to])

  return (
    <div className="mx-auto w-full max-w-4xl">
      <div className="flex items-end justify-between gap-4">
        <div>
          <h1 className="text-3xl font-medium tracking-tight text-[var(--text-primary)] sm:text-4xl">Log</h1>
          <p className="mt-2 text-sm text-[var(--text-secondary)]">
            Hvem der har ændret hvad. Kun head admin kan se alle logs.
          </p>
        </div>
        <Link href="/indstillinger" className="text-sm font-medium text-[var(--text-primary)] underline-offset-4 hover:underline">
          Indstillinger
        </Link>
      </div>

      {error ? <p className="mt-8 text-sm text-destructive">{error}</p> : null}
      {!allowed && !error ? <p className="mt-8 text-sm text-[var(--text-secondary)]">Henter log…</p> : null}

      {allowed ? (
      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <label className="grid gap-1.5 text-sm text-[var(--text-secondary)] sm:col-span-2 lg:col-span-1">
          Søg
          <input
            value={q}
            onChange={(event) => setQ(event.target.value)}
            placeholder="Bruger, dato eller ændring"
            className={fieldClass}
          />
        </label>
        <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
          Bruger
          <select value={userId} onChange={(event) => setUserId(event.target.value)} className={fieldClass}>
            <option value="">Alle</option>
            {users.map((person) => (
              <option key={person.id} value={person.id}>
                {person.name}
              </option>
            ))}
          </select>
        </label>
        <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
          Fra
          <input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className={fieldClass} />
        </label>
        <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
          Til
          <input type="date" value={to} onChange={(event) => setTo(event.target.value)} className={fieldClass} />
        </label>
      </div>
      ) : null}

      {allowed ? (
      <Card className="dashboard-card mt-5">
        <CardContent className="px-4 py-2 sm:px-6">
          {!loading && logs.length === 0 ? (
            <p className="py-4 text-sm text-[var(--text-secondary)]">Ingen logs matcher søgningen.</p>
          ) : null}
          {logs.length > 0 ? (
            <ul>
              {logs.map((log) => (
                <li key={log.id} className="grid gap-1 border-b border-border py-3 last:border-b-0 sm:grid-cols-[11rem_1fr]">
                  <div className="text-sm text-[var(--text-secondary)]">
                    <time dateTime={log.at}>
                      {new Date(log.at).toLocaleString("da-DK", { dateStyle: "medium", timeStyle: "short" })}
                    </time>
                    <span className="mt-0.5 block font-medium text-[var(--text-primary)]">{log.userName}</span>
                  </div>
                  <div className="min-w-0 text-sm">
                    <p className="font-medium text-[var(--text-primary)]">
                      {log.action}
                      {log.target ? ` · ${log.target}` : ""}
                    </p>
                    <p className="text-[var(--text-secondary)]">{log.change}</p>
                  </div>
                </li>
              ))}
            </ul>
          ) : null}
          {loading && logs.length === 0 ? <p className="py-4 text-sm text-[var(--text-secondary)]">Henter log…</p> : null}
        </CardContent>
      </Card>
      ) : null}
    </div>
  )
}
