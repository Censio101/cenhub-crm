"use client"

import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react"
import { Loader2Icon } from "lucide-react"

import { adminOutlineButtonClass } from "@/components/admin/admin-ui-styles"
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
import { resolveImportServicePreview } from "@/lib/import/scan-service-values"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import { foldServiceMatchKey } from "@/lib/services/fold-match-key"
import type { ClientService, Service } from "@/lib/services/types"
import { serviceName } from "@/lib/services/types"
import { cn } from "cn"

type CatalogService = Pick<Service, "id" | "slug" | "nameDa" | "nameEn">

export type ServiceExternalValueMapHandle = {
  /** Persists pending service rows when dirty. No-op when already saved. */
  saveIfDirty: () => Promise<boolean>
}

type Props = {
  slug: string
  distinct: readonly string[]
  catalog: readonly CatalogService[]
  enabledServices: readonly ClientService[]
  onSaved?: () => void
  /** Import: save with Run test. Funnel: show Save mappings here. */
  showSaveButton?: boolean
}

const NONE = "__none__"

function selectionsFromServer(
  distinct: readonly string[],
  aliasMap: Map<string, string>,
  enabledServices: readonly ClientService[]
): { draft: Record<string, string>; saved: Record<string, string> } {
  const draft: Record<string, string> = {}
  const saved: Record<string, string> = {}
  for (const value of distinct) {
    const norm = foldServiceMatchKey(value)
    const fromAlias = aliasMap.get(norm)
    if (fromAlias) {
      draft[value] = fromAlias
      saved[value] = fromAlias
      continue
    }
    const preview = resolveImportServicePreview(value, enabledServices, aliasMap)
    if (preview.slug) draft[value] = preview.slug
  }
  return { draft, saved }
}

export const ServiceExternalValueMap = forwardRef<ServiceExternalValueMapHandle, Props>(
  function ServiceExternalValueMap(
    { slug, distinct, catalog, enabledServices, onSaved, showSaveButton = false },
    ref
  ) {
    const { t, locale } = useLanguage()
    const [selections, setSelections] = useState<Record<string, string>>({})
    const [savedSelections, setSavedSelections] = useState<Record<string, string>>({})
    const [loading, setLoading] = useState(true)
    const [saving, setSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [saveLabel, setSaveLabel] = useState<"default" | "saved">("default")
    const distinctKey = useMemo(() => distinct.join("\0"), [distinct])
    const loadedForKey = useRef<string | null>(null)
    const selectionsRef = useRef(selections)
    const savedRef = useRef(savedSelections)
    selectionsRef.current = selections
    savedRef.current = savedSelections

    const slugToUuid = useMemo(
      () => new Map(catalog.map((service) => [service.slug, service.id])),
      [catalog]
    )

    const load = useCallback(async () => {
      if (!slug || distinct.length === 0) {
        setLoading(false)
        return
      }
      if (loadedForKey.current === distinctKey) return
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/admin/organizations/${slug}/service-aliases`)
        if (!res.ok) throw new Error("load")
        const data = (await res.json()) as { aliases: ServiceInboundAlias[] }
        const aliasMap = new Map<string, string>()
        for (const row of data.aliases) {
          aliasMap.set(foldServiceMatchKey(row.alias), row.serviceSlug)
        }
        const { draft, saved } = selectionsFromServer(distinct, aliasMap, enabledServices)
        setSelections(draft)
        setSavedSelections(saved)
        loadedForKey.current = distinctKey
      } finally {
        setLoading(false)
      }
    }, [distinct, distinctKey, enabledServices, slug])

    useAsyncEffect(() => {
      void load()
    }, [load])

    const dirty = useMemo(
      () =>
        distinct.some(
          (value) => (selections[value] ?? "") !== (savedSelections[value] ?? "")
        ),
      [distinct, selections, savedSelections]
    )

    const persist = useCallback(async (): Promise<boolean> => {
      const current = selectionsRef.current
      const saved = savedRef.current
      const isDirty = distinct.some((value) => (current[value] ?? "") !== (saved[value] ?? ""))
      if (!isDirty) return true

      setSaving(true)
      setError(null)
      setSaveLabel("default")
      try {
        const resGet = await fetch(`/api/admin/organizations/${slug}/service-aliases`)
        if (!resGet.ok) throw new Error("load")
        const data = (await resGet.json()) as { aliases: ServiceInboundAlias[] }
        const byNorm = new Map<string, { alias: string; serviceId: string }>()
        for (const row of data.aliases) {
          byNorm.set(foldServiceMatchKey(row.alias), { alias: row.alias, serviceId: row.serviceId })
        }
        for (const value of distinct) {
          const norm = foldServiceMatchKey(value)
          const serviceSlug = current[value]
          if (!serviceSlug) {
            byNorm.delete(norm)
            continue
          }
          const uuid = slugToUuid.get(serviceSlug)
          if (!uuid) continue
          byNorm.set(norm, { alias: value.trim(), serviceId: uuid })
        }
        const res = await fetch(`/api/admin/organizations/${slug}/service-aliases`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ aliases: [...byNorm.values()] }),
        })
        if (!res.ok) throw new Error("save")
        const nextSaved: Record<string, string> = { ...saved }
        for (const value of distinct) {
          const serviceSlug = current[value]
          if (serviceSlug) nextSaved[value] = serviceSlug
          else delete nextSaved[value]
        }
        setSavedSelections(nextSaved)
        setSaveLabel("saved")
        onSaved?.()
        return true
      } catch {
        setError(t("serviceAliasesSaveError"))
        return false
      } finally {
        setSaving(false)
      }
    }, [distinct, onSaved, slug, slugToUuid, t])

    useImperativeHandle(ref, () => ({ saveIfDirty: persist }), [persist])

    if (loading) {
      return <p className="text-sm text-muted-foreground">{t("leadSheetsLoading")}</p>
    }

    return (
      <div className="space-y-3">
        <ul className="grid gap-1.5 sm:grid-cols-2">
          {distinct.map((value) => (
            <li
              key={value}
              className="grid min-w-0 items-center gap-2.5 rounded-lg border border-[#e8e0d8] bg-white px-2.5 py-2 sm:grid-cols-[minmax(0,1fr)_11.5rem]"
            >
              <span
                className="min-w-0 truncate text-sm font-medium text-foreground"
                title={value}
              >
                {value}
              </span>
              <Select
                value={selections[value] ? selections[value] : NONE}
                onValueChange={(picked) => {
                  setSaveLabel("default")
                  setError(null)
                  if (picked === NONE || picked == null) {
                    setSelections((current) => {
                      const next = { ...current }
                      delete next[value]
                      return next
                    })
                    return
                  }
                  setSelections((current) => ({ ...current, [value]: String(picked) }))
                }}
              >
                <SelectTrigger
                  className="h-9 w-full min-w-0 rounded-xl border-[#d3c3b2] bg-white py-0 pl-2.5 pr-2 text-sm focus-visible:border-primary focus-visible:ring-2 focus-visible:ring-primary/15"
                >
                  <SelectValue placeholder={t("importServiceMapPick")}>
                    {(() => {
                      const slug = selections[value]
                      if (!slug) return null
                      const service = enabledServices.find((s) => s.id === slug)
                      return service
                        ? serviceName(service, locale === "en" ? "en" : "da")
                        : slug
                    })()}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent alignItemWithTrigger={false}>
                  <SelectItem value={NONE}>{t("importServiceMapNone")}</SelectItem>
                  {enabledServices.map((service) => (
                    <SelectItem key={service.id} value={service.id}>
                      {serviceName(service, locale === "en" ? "en" : "da")}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </li>
          ))}
        </ul>

        {showSaveButton ? (
          <div className="flex flex-wrap items-center gap-3">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={adminOutlineButtonClass}
              disabled={saving || !dirty}
              onClick={() => void persist()}
            >
              {saving ? <Loader2Icon className="size-4 animate-spin" /> : null}
              {saveLabel === "saved" && !dirty ? t("importServiceMapSaved") : t("importServiceMapSave")}
            </Button>
            {error ? <span className="text-xs text-red-700">{error}</span> : null}
          </div>
        ) : error ? (
          <p className="text-xs text-red-700">{error}</p>
        ) : null}
      </div>
    )
  }
)
