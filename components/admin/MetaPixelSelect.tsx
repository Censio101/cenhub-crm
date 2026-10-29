"use client"

import { RefreshCwIcon, ScanLineIcon } from "lucide-react"
import { useCallback, useState } from "react"

import {
  adminFieldClass,
  adminIconBoxClass,
  adminSelectTriggerClass,
} from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import type { MetaPixel } from "@/lib/meta/pixels"
import { cn } from "cn"

type PixelsPayload = { pixels?: MetaPixel[]; error?: string }

const NONE = "__none__"

function CrmBadge() {
  const { t } = useLanguage()
  return (
    <span className="shrink-0 rounded-md bg-violet-50 px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-violet-700">
      {t("metaPixelCrmBadge")}
    </span>
  )
}

/** One pixel as a row: name, small ID, and a CRM badge when Meta marks it as a CRM dataset. */
function PixelLabel({ name, id, isCrm }: { name: string; id: string; isCrm: boolean }) {
  return (
    <span className="flex min-w-0 flex-1 items-center gap-2">
      <span className="min-w-0 truncate font-medium text-foreground">{name}</span>
      <span className="shrink-0 font-mono text-[12px] text-muted-foreground">{id}</span>
      {isCrm ? <CrmBadge /> : null}
    </span>
  )
}

/**
 * Pixel (dataset) picker for a client. Lists the pixels on the client's Meta ad account; when the
 * list cannot be loaded it falls back to typing the ID by hand, so setup is never blocked.
 */
export function MetaPixelSelect({
  slug,
  adAccountId,
  value,
  onChange,
}: {
  slug: string
  adAccountId: string
  value: string
  onChange: (pixelId: string) => void
}) {
  const { t } = useLanguage()
  const [pixels, setPixels] = useState<MetaPixel[]>([])
  const [loadedFor, setLoadedFor] = useState<string | null>(null)
  const [failed, setFailed] = useState(false)
  const [reloadKey, setReloadKey] = useState(0)

  const account = adAccountId.trim()
  const loadKey = `${account}:${reloadKey}`
  const loading = Boolean(account) && loadedFor !== loadKey

  useAsyncEffect(
    async (signal) => {
      if (!account) return
      try {
        const response = await fetch(
          `/api/admin/organizations/${slug}/meta/pixels${reloadKey > 0 ? "?refresh=1" : ""}`,
          { cache: "no-store" }
        )
        const data = (await response.json()) as PixelsPayload
        if (signal.cancelled) return
        setPixels(data.pixels ?? [])
        setFailed(!response.ok || Boolean(data.error))
      } catch {
        if (!signal.cancelled) {
          setPixels([])
          setFailed(true)
        }
      } finally {
        if (!signal.cancelled) setLoadedFor(loadKey)
      }
    },
    [slug, account, reloadKey, loadKey]
  )

  const reload = useCallback(() => setReloadKey((key) => key + 1), [])

  const selected = pixels.find((pixel) => pixel.id === value)
  const manual = !account || (!loading && (failed || pixels.length === 0))

  return (
    <div className="grid gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={adminIconBoxClass("violet")} aria-hidden="true">
            <ScanLineIcon className="size-[18px]" />
          </span>
          <span className="text-[14px] font-semibold text-foreground">{t("metaPixelId")}</span>
        </div>
        {account ? (
          <button
            type="button"
            onClick={reload}
            disabled={loading}
            className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground hover:text-foreground disabled:opacity-50"
          >
            <RefreshCwIcon className={cn("size-3", loading && "animate-spin")} aria-hidden="true" />
            {t("metaPixelReload")}
          </button>
        ) : null}
      </div>

      {manual ? (
        <>
          <input
            className={adminFieldClass}
            value={value}
            placeholder={t("metaPixelManualPlaceholder")}
            onChange={(event) => onChange(event.target.value)}
          />
          <p className="text-[12px] text-muted-foreground">
            {!account
              ? t("metaPixelNeedsAdAccount")
              : failed
                ? t("metaPixelLoadFailed")
                : t("metaPixelNoneFound")}
          </p>
        </>
      ) : (
        <Select
          value={value || NONE}
          disabled={loading}
          onValueChange={(next) => {
            if (typeof next === "string") onChange(next === NONE ? "" : next)
          }}
        >
          <SelectTrigger className={adminSelectTriggerClass} aria-label={t("metaPixelId")}>
            <SelectValue>
              {loading ? (
                <span className="text-muted-foreground">{t("metaPixelLoading")}</span>
              ) : !value ? (
                <span className="text-muted-foreground">{t("metaPixelNone")}</span>
              ) : selected ? (
                <PixelLabel name={selected.name} id={selected.id} isCrm={selected.isCrm} />
              ) : (
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="shrink-0 font-mono text-[13px]">{value}</span>
                  <span className="truncate text-[12px] text-amber-700">
                    {t("metaPixelNotOnAccount")}
                  </span>
                </span>
              )}
            </SelectValue>
          </SelectTrigger>
          <SelectContent
            alignItemWithTrigger={false}
            align="start"
            style={{ minWidth: "var(--anchor-width)" }}
          >
            <SelectItem value={NONE} className="py-2">
              <span className="text-muted-foreground">{t("metaPixelNone")}</span>
            </SelectItem>
            {value && !selected ? (
              <SelectItem value={value} className="py-2">
                <span className="flex min-w-0 flex-1 items-center gap-2">
                  <span className="shrink-0 font-mono text-[13px]">{value}</span>
                  <span className="truncate text-[12px] text-amber-700">
                    {t("metaPixelNotOnAccount")}
                  </span>
                </span>
              </SelectItem>
            ) : null}
            {pixels.map((pixel) => (
              <SelectItem key={pixel.id} value={pixel.id} className="py-2">
                <PixelLabel name={pixel.name} id={pixel.id} isCrm={pixel.isCrm} />
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </div>
  )
}
