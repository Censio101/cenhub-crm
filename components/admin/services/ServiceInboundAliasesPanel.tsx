"use client"

import { useCallback, useMemo, useState } from "react"
import { Loader2Icon, PlusIcon, Trash2Icon } from "lucide-react"

import { adminFieldClass, adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { ServiceInboundAlias } from "@/lib/db/service-aliases-repository"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import type { ClientService, Service } from "@/lib/services/types"
import { serviceName } from "@/lib/services/types"
import { cn } from "cn"

type DraftRow = { key: string; alias: string; serviceId: string }

type Props = {
  slug: string
  /** Catalog + manual rows (UUID + slug). */
  catalog: readonly Pick<Service, "id" | "slug" | "nameDa" | "nameEn">[]
  enabledServices: readonly ClientService[]
  /** When aliases are saved (refresh funnel service reference). */
  onSaved?: () => void
  embedded?: boolean
}

export function ServiceInboundAliasesPanel({
  slug,
  catalog,
  enabledServices,
  onSaved,
  embedded,
}: Props) {
  const { t, locale } = useLanguage()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [saved, setSaved] = useState(false)
  const [draft, setDraft] = useState<DraftRow[]>([])

  const enabledSlugSet = useMemo(
    () => new Set(enabledServices.map((service) => service.id)),
    [enabledServices]
  )

  const serviceOptions = useMemo(() => {
    const opts: { uuid: string; slug: string; label: string }[] = []
    for (const row of catalog) {
      if (!enabledSlugSet.has(row.slug)) continue
      const client = enabledServices.find((service) => service.id === row.slug)
      opts.push({
        uuid: row.id,
        slug: row.slug,
        label: client
          ? serviceName(client, locale === "en" ? "en" : "da")
          : locale === "en"
            ? row.nameEn
            : row.nameDa,
      })
    }
    return opts.sort((a, b) => a.label.localeCompare(b.label, locale === "en" ? "en" : "da"))
  }, [catalog, enabledServices, enabledSlugSet, locale])

  const labelForServiceId = useCallback(
    (serviceId: string) => {
      const match = serviceOptions.find((opt) => opt.uuid === serviceId)
      if (match) return match.label
      const row = catalog.find((service) => service.id === serviceId)
      if (!row) return serviceId
      const client = enabledServices.find((service) => service.id === row.slug)
      return client
        ? serviceName(client, locale === "en" ? "en" : "da")
        : locale === "en"
          ? row.nameEn
          : row.nameDa
    },
    [catalog, enabledServices, locale, serviceOptions]
  )

  const selectOptions = useMemo(() => {
    const byUuid = new Map(serviceOptions.map((opt) => [opt.uuid, opt]))
    for (const row of draft) {
      if (!row.serviceId || byUuid.has(row.serviceId)) continue
      const cat = catalog.find((service) => service.id === row.serviceId)
      if (!cat) continue
      byUuid.set(row.serviceId, {
        uuid: cat.id,
        slug: cat.slug,
        label: labelForServiceId(cat.id),
      })
    }
    return [...byUuid.values()].sort((a, b) =>
      a.label.localeCompare(b.label, locale === "en" ? "en" : "da")
    )
  }, [catalog, draft, labelForServiceId, locale, serviceOptions])

  const load = useCallback(async () => {
    if (!slug) return
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/organizations/${slug}/service-aliases`)
      if (!res.ok) throw new Error("load")
      const data = (await res.json()) as { aliases: ServiceInboundAlias[] }
      setDraft(
        data.aliases.map((row) => ({
          key: row.id,
          alias: row.alias,
          serviceId: row.serviceId,
        }))
      )
    } catch {
      setError(t("serviceAliasesLoadError"))
    } finally {
      setLoading(false)
    }
  }, [slug, t])

  useAsyncEffect(() => {
    void load()
  }, [load])

  function addRow() {
    const first = serviceOptions[0]
    if (!first?.uuid) return
    setDraft((current) => [
      ...current,
      { key: `new-${crypto.randomUUID()}`, alias: "", serviceId: first.uuid },
    ])
    setSaved(false)
  }

  async function save() {
    setSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/organizations/${slug}/service-aliases`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          aliases: draft
            .map((row) => ({ alias: row.alias.trim(), serviceId: row.serviceId }))
            .filter((row) => row.alias.length > 0),
        }),
      })
      if (!res.ok) throw new Error("save")
      const data = (await res.json()) as { aliases: ServiceInboundAlias[] }
      setDraft(
        data.aliases.map((row) => ({
          key: row.id,
          alias: row.alias,
          serviceId: row.serviceId,
        }))
      )
      setSaved(true)
      onSaved?.()
    } catch {
      setError(t("serviceAliasesSaveError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <section
      className={cn(
        embedded ? "space-y-4" : cn(adminSectionCardClass, "mt-4 space-y-4 p-4 sm:p-5")
      )}
    >
      {embedded ? null : (
        <div>
          <h3 className="text-base font-semibold text-foreground">{t("serviceAliasesTitle")}</h3>
          <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{t("serviceAliasesIntro")}</p>
        </div>
      )}

      {enabledServices.length > 0 ? (
        <div className="overflow-x-auto rounded-lg border border-[#e8e0d8]">
          <table className="w-full min-w-[28rem] border-collapse text-xs">
            <thead className="bg-[#faf8f5]">
              <tr>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  {t("serviceAliasesColSlug")}
                </th>
                <th className="px-3 py-2 text-left font-medium text-muted-foreground">
                  {t("serviceAliasesColName")}
                </th>
              </tr>
            </thead>
            <tbody>
              {enabledServices.map((service) => (
                <tr key={service.id} className="border-t border-[#efe7de]">
                  <td className="px-3 py-2 font-mono text-[11px]">{service.id}</td>
                  <td className="px-3 py-2">{serviceName(service, locale === "en" ? "en" : "da")}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="text-sm text-muted-foreground">{t("serviceAliasesNoServices")}</p>
      )}

      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      {saved ? <p className="text-sm text-emerald-700">{t("serviceAliasesSaved")}</p> : null}

      {loading ? (
        <p className="text-sm text-muted-foreground">{t("leadSheetsLoading")}</p>
      ) : (
        <>
          <ul className="space-y-2">
            {draft.map((row) => (
              <li key={row.key} className="flex flex-wrap items-center gap-2">
                <input
                  className={cn(adminFieldClass, "min-w-[12rem] flex-1 font-normal")}
                  value={row.alias}
                  placeholder={t("serviceAliasesExternalPlaceholder")}
                  onChange={(e) => {
                    setDraft((current) =>
                      current.map((item) =>
                        item.key === row.key ? { ...item, alias: e.target.value } : item
                      )
                    )
                    setSaved(false)
                  }}
                />
                <Select
                  value={row.serviceId || undefined}
                  onValueChange={(uuid) => {
                    if (typeof uuid !== "string") return
                    setDraft((current) =>
                      current.map((item) =>
                        item.key === row.key ? { ...item, serviceId: uuid } : item
                      )
                    )
                    setSaved(false)
                  }}
                >
                  <SelectTrigger className="h-9 w-[min(100%,14rem)] min-w-[10rem]">
                    <SelectValue placeholder={t("importServiceMapPick")}>
                      {row.serviceId ? labelForServiceId(row.serviceId) : null}
                    </SelectValue>
                  </SelectTrigger>
                  <SelectContent alignItemWithTrigger={false}>
                    {selectOptions.map((opt) => (
                      <SelectItem key={opt.uuid} value={opt.uuid}>
                        {opt.label}
                        <span className="ml-1 font-mono text-[10px] text-muted-foreground">
                          ({opt.slug})
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  aria-label={t("serviceAliasesRemove")}
                  onClick={() => {
                    setDraft((current) => current.filter((item) => item.key !== row.key))
                    setSaved(false)
                  }}
                >
                  <Trash2Icon className="size-4" />
                </Button>
              </li>
            ))}
          </ul>
          <div className="flex flex-wrap gap-2">
            <Button type="button" variant="outline" size="sm" onClick={addRow} disabled={!serviceOptions.length}>
              <PlusIcon className="size-4" />
              {t("serviceAliasesAdd")}
            </Button>
            <Button type="button" size="sm" disabled={saving} onClick={() => void save()}>
              {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {t("serviceAliasesSave")}
            </Button>
          </div>
        </>
      )}
    </section>
  )
}
