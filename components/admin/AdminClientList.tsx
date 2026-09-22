"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { FormEvent, useEffect, useState } from "react"

import { AdminClientListSkeleton } from "@/components/admin/AdminSkeletons"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

const fieldClass =
  "h-10 w-full rounded-[15px] border border-border bg-white px-3 text-sm outline-none placeholder:text-muted-foreground/70 focus:ring-1 focus:ring-ring"

type OrganizationSummary = {
  id: string
  slug: string
  name: string
  demo_mode: boolean
  leadCount: number
  userCount: number
  metaEnabled: boolean
}

export function AdminClientList() {
  const router = useRouter()
  const [organizations, setOrganizations] = useState<OrganizationSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState("")
  const [slug, setSlug] = useState("")
  const [creating, setCreating] = useState(false)

  async function loadOrganizations() {
    setLoading(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/organizations", { cache: "no-store" })
      if (!response.ok) throw new Error("Kunne ikke hente klienter")
      const data = (await response.json()) as { organizations: OrganizationSummary[] }
      setOrganizations(data.organizations)
    } catch (loadError) {
      console.error(loadError)
      setError("Kunne ikke hente klientlisten")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOrganizations()
  }, [])

  async function handleCreate(event: FormEvent) {
    event.preventDefault()
    setCreating(true)
    setError(null)
    try {
      const response = await fetch("/api/admin/organizations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          slug: slug.trim() || undefined,
          demoMode: true,
        }),
      })
      const data = (await response.json()) as {
        organization?: { slug: string }
        error?: string
      }
      if (!response.ok) throw new Error(data.error ?? "Kunne ikke oprette klient")
      setName("")
      setSlug("")
      await loadOrganizations()
      if (data.organization?.slug) {
        router.push(`/admin/${data.organization.slug}`)
      }
    } catch (createError) {
      setError(createError instanceof Error ? createError.message : "Fejl ved oprettelse")
    } finally {
      setCreating(false)
    }
  }

  return (
    <div className="mx-auto flex w-full max-w-5xl flex-col gap-6">
      <header>
        <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
          Censio Admin
        </p>
        <h1 className="mt-1 text-2xl font-medium tracking-tight sm:text-3xl">
          Klienter
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Opret og administrer kundedashboards, brugere og Meta-opsætning.
        </p>
      </header>

      <Card>
        <CardHeader>
          <CardTitle>Opret klient</CardTitle>
          <CardDescription>
            Slug genereres automatisk fra navnet, hvis du lader feltet stå tomt.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="grid gap-4 sm:grid-cols-[1fr_1fr_auto]" onSubmit={handleCreate}>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Virksomhedsnavn</span>
              <input
                className={fieldClass}
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Fx. Nordkystens Tømrer"
                required
              />
            </label>
            <label className="grid gap-1.5 text-sm">
              <span className="font-medium">Slug (valgfri)</span>
              <input
                className={fieldClass}
                value={slug}
                onChange={(event) => setSlug(event.target.value)}
                placeholder="nordkystens-tomrer"
              />
            </label>
            <div className="flex items-end">
              <Button type="submit" className="h-10 w-full sm:w-auto" disabled={creating}>
                {creating ? "Opretter…" : "Opret klient"}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {error ? (
        <p className="text-sm text-destructive" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <AdminClientListSkeleton />
      ) : (
        <div className="grid gap-3">
          {organizations.map((organization) => (
            <Link
              key={organization.id}
              href={`/admin/${organization.slug}`}
              className="rounded-[15px] border border-border bg-card px-4 py-4 transition-colors hover:bg-accent sm:px-5"
            >
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-base font-medium">{organization.name}</p>
                  <p className="text-sm text-muted-foreground">{organization.slug}</p>
                </div>
                <dl className="flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                  <div>
                    <dt className="sr-only">Leads</dt>
                    <dd>{organization.leadCount} leads</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Brugere</dt>
                    <dd>{organization.userCount} brugere</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Demo</dt>
                    <dd>{organization.demo_mode ? "Demo" : "Live"}</dd>
                  </div>
                  <div>
                    <dt className="sr-only">Meta</dt>
                    <dd>{organization.metaEnabled ? "Meta aktiveret" : "Meta af"}</dd>
                  </div>
                </dl>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  )
}
