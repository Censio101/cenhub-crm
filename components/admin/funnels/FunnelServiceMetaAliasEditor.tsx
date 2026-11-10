"use client"

import { useCallback, useMemo, useState } from "react"
import { Loader2Icon } from "lucide-react"

import { adminFieldClass, adminOutlineButtonClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import type { ServiceInboundAlias } from "@/lib/db/service-aliases-repository"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import { foldServiceMatchKey } from "@/lib/services/fold-match-key"
import type { ClientService, Service } from "@/lib/services/types"
import { serviceName } from "@/lib/services/types"
import { scanSampleServiceValues } from "@/lib/funnels/sample-service-values"

type CatalogService = Pick<Service, "id" | "slug" | "nameDa" | "nameEn">

type Props = {
  slug: string
  serviceIdsPath: string
  sample: Record<string, unknown> | null
  catalog: readonly CatalogService[]
  enabledServices: readonly ClientService[]
}

type Row = { serviceSlug: string; metaValue: string }

function primaryAliasForSlug(
  aliases: ServiceInboundAlias[],
  slug: string
): string {
  const match = aliases.find((row) => row.serviceSlug === slug)
  return match?.alias ?? ""
}

/** Editable Meta JSON value per CRM service (inbound aliases). */
export function FunnelServiceMetaAliasEditor({
  slug,
  serviceIdsPath,
  sample,
  catalog,
  enabledServices,
}: Props) {
  const { t, locale } = useLanguage()
  const [rows, setRows] = useState<Row[]>([])
  const [savedRows, setSavedRows] = useState<Row[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)

  const slugToUuid = useMemo(
    () => new Map(catalog.map((service) => [service.slug, service.id])),
    [catalog]
  )

  const sampleHints = useMemo(
    () => scanSampleServiceValues(sample, serviceIdsPath.trim()),
    [sample, serviceIdsPath]
  )

  const load = useCallback(async () => {
    if (!slug || enabledServices.length === 0) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/organizations/${slug}/service-aliases`)
      if (!res.ok) throw new Error("load")
      const data = (await res.json()) as { aliases: ServiceInboundAlias[] }
      const next: Row[] = enabledServices.map((service) => ({
        serviceSlug: service.id,
        metaValue: primaryAliasForSlug(data.aliases, service.id),
      }))
      setRows(next)
      setSavedRows(next.map((row) => ({ ...row })))
    } catch {
      setError(t("serviceAliasesLoadError"))
    } finally {
      setLoading(false)
    }
  }, [enabledServices, slug, t])

  useAsyncEffect(() => {
    void load()
  }, [load])

  const dirty = useMemo(
    () =>
      rows.some(
        (row, index) => row.metaValue.trim() !== (savedRows[index]?.metaValue ?? "").trim()
      ),
    [rows, savedRows]
  )

  async function save() {
    setSaving(true)
    setError(null)
    setSaved(false)
    try {
      const resGet = await fetch(`/api/admin/organizations/${slug}/service-aliases`)
      if (!resGet.ok) throw new Error("load")
      const data = (await resGet.json()) as { aliases: ServiceInboundAlias[] }

      const enabledSlugs = new Set(enabledServices.map((service) => service.id))
      const byNorm = new Map<string, { alias: string; serviceId: string }>()

      for (const row of data.aliases) {
        if (!enabledSlugs.has(row.serviceSlug)) {
          byNorm.set(foldServiceMatchKey(row.alias), {
            alias: row.alias,
            serviceId: row.serviceId,
          })
        }
      }

      for (const row of rows) {
        const trimmed = row.metaValue.trim()
        const uuid = slugToUuid.get(row.serviceSlug)
        if (!uuid) continue
        for (const existing of data.aliases) {
          if (existing.serviceSlug === row.serviceSlug) {
            byNorm.delete(foldServiceMatchKey(existing.alias))
          }
        }
        if (!trimmed) continue
        byNorm.set(foldServiceMatchKey(trimmed), { alias: trimmed, serviceId: uuid })
      }

      const res = await fetch(`/api/admin/organizations/${slug}/service-aliases`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ aliases: [...byNorm.values()] }),
      })
      if (!res.ok) throw new Error("save")
      setSavedRows(rows.map((row) => ({ ...row, metaValue: row.metaValue.trim() })))
      setSaved(true)
    } catch {
      setError(t("serviceAliasesSaveError"))
    } finally {
      setSaving(false)
    }
  }

  if (!serviceIdsPath.trim()) {
    return (
      <div className="space-y-2 rounded-lg border border-dashed border-[#d3c3b2] bg-white/80 p-3">
        <p className="text-xs font-semibold text-foreground">{t("funnelSampleServiceMapTitle")}</p>
        <p className="text-xs text-muted-foreground">{t("funnelSampleServiceMapNeedPath")}</p>
      </div>
    )
  }

  return (
    <div className="space-y-3 rounded-lg border border-[#e8e0d8] bg-white p-3.5">
      <div className="space-y-1">
        <p className="text-xs font-semibold text-foreground">{t("funnelSampleServiceMapTitle")}</p>
        <p className="text-xs leading-relaxed text-muted-foreground">
          {t("funnelServiceMappingIntro")}
        </p>
        {sampleHints.length > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            {t("funnelSampleServiceMapIntro")} {sampleHints.join(", ")}
          </p>
        ) : null}
      </div>

      {loading ? (
        <p className="text-xs text-muted-foreground">{t("leadSheetsLoading")}</p>
      ) : (
        <ul className="space-y-2">
          {rows.map((row) => {
            const service = enabledServices.find((s) => s.id === row.serviceSlug)
            const label = service
              ? serviceName(service, locale === "en" ? "en" : "da")
              : row.serviceSlug
            return (
              <li
                key={row.serviceSlug}
                className="grid gap-2 rounded-lg border border-[#efe7de] bg-[#faf8f6] px-2.5 py-2 sm:grid-cols-[minmax(0,9rem)_minmax(0,1fr)] sm:items-center"
              >
                <span className="text-sm font-medium text-foreground">{label}</span>
                <input
                  className={adminFieldClass}
                  value={row.metaValue}
                  spellCheck={false}
                  placeholder={t("serviceAliasesExternalPlaceholder")}
                  aria-label={`${label}: ${t("serviceAliasesExternalPlaceholder")}`}
                  onChange={(e) => {
                    const value = e.target.value
                    setSaved(false)
                    setRows((current) =>
                      current.map((item) =>
                        item.serviceSlug === row.serviceSlug ? { ...item, metaValue: value } : item
                      )
                    )
                  }}
                />
              </li>
            )
          })}
        </ul>
      )}

      {error ? <p className="text-xs text-red-700">{error}</p> : null}
      {saved && !dirty ? (
        <p className="text-xs text-emerald-700">{t("serviceAliasesSaved")}</p>
      ) : null}

      <Button
        type="button"
        variant="outline"
        size="sm"
        className={adminOutlineButtonClass}
        disabled={saving || loading || !dirty}
        onClick={() => void save()}
      >
        {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
        {t("serviceAliasesSave")}
      </Button>
    </div>
  )
}
