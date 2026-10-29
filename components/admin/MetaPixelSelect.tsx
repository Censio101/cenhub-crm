"use client"

import { RefreshCwIcon, ScanLineIcon } from "lucide-react"
import { useCallback, useState } from "react"

import { adminFieldClass, adminIconBoxClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useAsyncEffect } from "@/lib/react/use-async-effect"
import type { MetaPixel } from "@/lib/meta/pixels"

type PixelsPayload = { pixels?: MetaPixel[]; error?: string }

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

  const known = pixels.some((pixel) => pixel.id === value)
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
            <RefreshCwIcon className="size-3" aria-hidden="true" />
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
        <select
          className={adminFieldClass}
          value={value}
          disabled={loading}
          onChange={(event) => onChange(event.target.value)}
        >
          <option value="">{loading ? t("metaPixelLoading") : t("metaPixelNone")}</option>
          {value && !known && !loading ? (
            <option value={value}>
              {value} ({t("metaPixelNotOnAccount")})
            </option>
          ) : null}
          {pixels.map((pixel) => (
            <option key={pixel.id} value={pixel.id}>
              {pixel.name} ({pixel.id}){pixel.isCrm ? ` · ${t("metaPixelCrmBadge")}` : ""}
            </option>
          ))}
        </select>
      )}
    </div>
  )
}
