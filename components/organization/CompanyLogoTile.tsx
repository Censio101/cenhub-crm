"use client"

import { useEffect, useRef, useState, type DragEvent } from "react"
import { CameraIcon, ImageUpIcon, Loader2Icon, MinusIcon, PlusIcon, Trash2Icon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  isAllowedOrganizationLogoMime,
  LOGO_STEP_MAX,
  LOGO_STEP_MIN,
  logoChipStyle,
  logoRadiusPx,
  ORGANIZATION_LOGO_MAX_BYTES,
  type OrganizationLogoBackground,
} from "@/lib/organization-logo"
import { cn } from "cn"

type UseCompanyLogoOptions = {
  uploadUrl: string
  background: OrganizationLogoBackground
  /** Chip padding and corner radius (steps 0 to 4). */
  padding: number
  radius: number
  onLogoChange: (logoUrl: string | null) => void
  /** Apply a background choice in the UI immediately (also used to revert after a failed save). */
  onBackgroundChange: (background: OrganizationLogoBackground) => void
  /** Apply a padding / radius choice in the UI immediately (also used to revert after a failed save). */
  onStyleChange: (patch: { logoPadding?: number; logoRadius?: number }) => void
  onError?: (message: string) => void
}

/** Shared upload / remove / background logic for the stage and its controls. */
export function useCompanyLogo({
  uploadUrl,
  background,
  padding,
  radius,
  onLogoChange,
  onBackgroundChange,
  onStyleChange,
  onError,
}: UseCompanyLogoOptions) {
  const { t } = useLanguage()
  const [busy, setBusy] = useState(false)

  // Background saves: the UI value is applied optimistically and the saves are queued so they reach
  // the server in click order. A newer click supersedes older queued ones (they are skipped), and an
  // outside refresh of `background` is ignored while saves are in flight (it could be stale).
  const latestRef = useRef(background) // last value the user picked
  const confirmedRef = useRef(background) // last value the server confirmed
  const seqRef = useRef(0)
  const pendingRef = useRef(0)
  const queueRef = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    if (pendingRef.current > 0) return
    latestRef.current = background
    confirmedRef.current = background
  }, [background])

  async function upload(file: File | undefined) {
    if (!file) return
    if (!file.type.startsWith("image/") || !isAllowedOrganizationLogoMime(file.type)) {
      onError?.(t("clientLogoInvalidType"))
      return
    }
    if (file.size > ORGANIZATION_LOGO_MAX_BYTES) {
      onError?.(t("clientLogoTooLarge"))
      return
    }
    setBusy(true)
    try {
      const form = new FormData()
      form.set("file", file)
      const response = await fetch(uploadUrl, { method: "POST", body: form })
      const data = (await response.json()) as { logoUrl?: string | null; error?: string }
      if (!response.ok) throw new Error(data.error ?? t("clientLogoUploadError"))
      onLogoChange(data.logoUrl ?? null)
    } catch (caught) {
      onError?.(caught instanceof Error ? caught.message : t("clientLogoUploadError"))
    } finally {
      setBusy(false)
    }
  }

  async function remove() {
    setBusy(true)
    try {
      const response = await fetch(uploadUrl, { method: "DELETE" })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("clientLogoUploadError"))
      onLogoChange(null)
    } catch (caught) {
      onError?.(caught instanceof Error ? caught.message : t("clientLogoUploadError"))
    } finally {
      setBusy(false)
    }
  }

  function changeBackground(next: OrganizationLogoBackground) {
    if (next === latestRef.current) return
    latestRef.current = next
    const seq = ++seqRef.current
    onBackgroundChange(next)
    pendingRef.current += 1

    queueRef.current = queueRef.current.then(async () => {
      try {
        // A newer click replaced this one — only the latest choice needs to be saved.
        if (seq !== seqRef.current) return
        const response = await fetch(uploadUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ background: next }),
        })
        const data = (await response.json()) as { error?: string }
        if (!response.ok) throw new Error(data.error ?? t("clientLogoUploadError"))
        confirmedRef.current = next
      } catch (caught) {
        // Only the newest request may revert the UI; older failures are irrelevant.
        if (seq === seqRef.current) {
          latestRef.current = confirmedRef.current
          onBackgroundChange(confirmedRef.current)
          onError?.(caught instanceof Error ? caught.message : t("clientLogoUploadError"))
        }
      } finally {
        pendingRef.current -= 1
        // Re-assert the final choice once everything settled (guards against a stale outside refresh).
        if (pendingRef.current === 0) onBackgroundChange(latestRef.current)
      }
    })
  }

  // Padding / radius: same idea as the background. Applied at once, saved in click order, only the
  // newest click per option is sent, and a failed save returns to the last confirmed step.
  const styleRef = useRef({ padding, radius })
  const styleConfirmedRef = useRef({ padding, radius })
  const styleSeqRef = useRef({ padding: 0, radius: 0 })
  const stylePendingRef = useRef(0)
  const styleQueueRef = useRef<Promise<void>>(Promise.resolve())

  useEffect(() => {
    if (stylePendingRef.current > 0) return
    styleRef.current = { padding, radius }
    styleConfirmedRef.current = { padding, radius }
  }, [padding, radius])

  function applyStyle(key: "padding" | "radius", value: number) {
    onStyleChange(key === "padding" ? { logoPadding: value } : { logoRadius: value })
  }

  function stepStyle(key: "padding" | "radius", delta: 1 | -1) {
    const next = Math.min(LOGO_STEP_MAX, Math.max(LOGO_STEP_MIN, styleRef.current[key] + delta))
    if (next === styleRef.current[key]) return
    styleRef.current = { ...styleRef.current, [key]: next }
    const seq = ++styleSeqRef.current[key]
    applyStyle(key, next)
    stylePendingRef.current += 1

    styleQueueRef.current = styleQueueRef.current.then(async () => {
      try {
        if (seq !== styleSeqRef.current[key]) return
        const response = await fetch(uploadUrl, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ [key]: next }),
        })
        const data = (await response.json()) as { error?: string }
        if (!response.ok) throw new Error(data.error ?? t("clientLogoUploadError"))
        styleConfirmedRef.current = { ...styleConfirmedRef.current, [key]: next }
      } catch (caught) {
        if (seq === styleSeqRef.current[key]) {
          styleRef.current = { ...styleRef.current, [key]: styleConfirmedRef.current[key] }
          applyStyle(key, styleConfirmedRef.current[key])
          onError?.(caught instanceof Error ? caught.message : t("clientLogoUploadError"))
        }
      } finally {
        stylePendingRef.current -= 1
        if (stylePendingRef.current === 0) {
          applyStyle("padding", styleRef.current.padding)
          applyStyle("radius", styleRef.current.radius)
        }
      }
    })
  }

  return { busy, upload, remove, changeBackground, stepStyle }
}

export type CompanyLogoController = ReturnType<typeof useCompanyLogo>

const backdropClass: Record<OrganizationLogoBackground, string> = {
  transparent: "bg-transparent",
  white: "bg-white shadow-[0_2px_10px_rgba(20,10,0,0.22)]",
  dark: "bg-[#141414] shadow-[0_2px_10px_rgba(20,10,0,0.3)] ring-1 ring-white/10",
}

/**
 * The logo as it appears on the banner: a rounded chip that hugs the logo (with padding) and
 * uses the chosen backdrop. Click or drop an image on it to replace it (when editable).
 */
export function CompanyLogoStage({
  logoUrl,
  background,
  padding,
  radius,
  canEdit,
  controller,
  className,
}: {
  logoUrl: string | null
  background: OrganizationLogoBackground
  padding: number
  radius: number
  canEdit: boolean
  controller: CompanyLogoController
  className?: string
}) {
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [dragging, setDragging] = useState(false)
  const { busy, upload } = controller

  function handleDrop(event: DragEvent<HTMLElement>) {
    event.preventDefault()
    setDragging(false)
    if (!canEdit || busy) return
    void upload(event.dataTransfer.files?.[0])
  }

  const inner = logoUrl ? (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={logoUrl}
        alt=""
        className="max-h-14 w-auto max-w-[min(14rem,calc(100vw-8.5rem))] object-contain sm:max-h-[4.5rem] sm:max-w-[18rem]"
      />
    </>
  ) : canEdit ? (
    <span className="flex min-w-[12rem] flex-col items-center gap-1 px-2 py-1 text-white/90">
      <ImageUpIcon className="size-6" aria-hidden="true" />
      <span className="text-[13px] font-semibold">{t("clientLogoUploadTitle")}</span>
      <span className="text-[11px] text-white/70">{t("clientLogoFormatsHint")}</span>
    </span>
  ) : (
    <ImageUpIcon className="size-7 text-white/40" aria-hidden="true" />
  )

  const chipClass = cn(
    "group relative inline-flex items-center justify-center overflow-hidden rounded-2xl transition-shadow",
    logoUrl
      ? backdropClass[background]
      : "border border-dashed border-white/45 bg-white/10 px-5 py-4",
    canEdit && !busy && "cursor-pointer",
    dragging && "ring-2 ring-white/70"
  )

  // With a logo the chip follows the chosen padding and corners; the empty upload box stays fixed.
  const chipStyle = logoUrl ? logoChipStyle("stage", padding, radius) : undefined

  const overlay = canEdit ? (
    <span
      style={logoUrl ? { borderRadius: logoRadiusPx("stage", radius) } : undefined}
      className={cn(
        "absolute inset-0 flex flex-col items-center justify-center gap-0.5 rounded-2xl bg-black/50 text-[10px] font-semibold tracking-wide text-white uppercase",
        "opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
        (busy || dragging) && "opacity-100"
      )}
    >
      {busy ? (
        <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <CameraIcon className="size-4" aria-hidden="true" />
      )}
      {busy
        ? t("clientLogoUploading")
        : dragging
          ? t("clientLogoDropActive")
          : logoUrl
            ? t("clientLogoChange")
            : null}
    </span>
  ) : null

  return (
    <div className={cn("flex min-h-[5.5rem] items-center sm:min-h-24", className)}>
      {canEdit ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            disabled={busy}
            onChange={(event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              void upload(file)
            }}
          />
          <button
            type="button"
            aria-label={logoUrl ? t("clientLogoChange") : t("clientLogoUploadTitle")}
            disabled={busy}
            onClick={() => inputRef.current?.click()}
            onDragOver={(event) => {
              event.preventDefault()
              setDragging(true)
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={handleDrop}
            style={chipStyle}
            className={cn(chipClass, "focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none")}
          >
            {inner}
            {overlay}
          </button>
        </>
      ) : (
        <div style={chipStyle} className={chipClass}>
          {inner}
        </div>
      )}
    </div>
  )
}

const swatches: {
  value: OrganizationLogoBackground
  labelKey: "logoBackgroundTransparent" | "logoBackgroundWhite" | "logoBackgroundDark"
  className: string
}[] = [
  {
    value: "transparent",
    labelKey: "logoBackgroundTransparent",
    className:
      "bg-[conic-gradient(#d9d2c9_25%,#fff_0_50%,#d9d2c9_0_75%,#fff_0)] bg-[length:8px_8px]",
  },
  { value: "white", labelKey: "logoBackgroundWhite", className: "bg-white" },
  { value: "dark", labelKey: "logoBackgroundDark", className: "bg-[#141414]" },
]

/**
 * Backdrop picker + remove. Always the same size (inactive until a logo exists) so adding or
 * removing a logo never changes the layout of the banner.
 */
function StepControl({
  label,
  value,
  disabled,
  onLess,
  onMore,
}: {
  label: string
  value: number
  disabled: boolean
  onLess: () => void
  onMore: () => void
}) {
  const { t } = useLanguage()
  const stepButton =
    "flex size-6 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-white/20 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:pointer-events-none disabled:opacity-35"
  return (
    <div role="group" aria-label={label} className="inline-flex items-center gap-0.5">
      <span className="hidden pr-1 pl-2 text-[11px] font-semibold tracking-wide text-white/80 uppercase sm:inline">
        {label}
      </span>
      <button
        type="button"
        title={`${label}: ${t("logoStepLess")}`}
        aria-label={`${label}: ${t("logoStepLess")}`}
        disabled={disabled || value <= LOGO_STEP_MIN}
        onClick={onLess}
        className={stepButton}
      >
        <MinusIcon className="size-3.5" aria-hidden="true" />
      </button>
      <span className="flex items-center gap-[3px] px-0.5" aria-hidden="true">
        {Array.from({ length: LOGO_STEP_MAX - LOGO_STEP_MIN + 1 }, (_, step) => (
          <span
            key={step}
            className={cn(
              "size-1.5 rounded-full transition-colors",
              step <= value ? "bg-white" : "bg-white/30"
            )}
          />
        ))}
      </span>
      <button
        type="button"
        title={`${label}: ${t("logoStepMore")}`}
        aria-label={`${label}: ${t("logoStepMore")}`}
        disabled={disabled || value >= LOGO_STEP_MAX}
        onClick={onMore}
        className={stepButton}
      >
        <PlusIcon className="size-3.5" aria-hidden="true" />
      </button>
    </div>
  )
}

export function CompanyLogoControls({
  hasLogo,
  background,
  padding,
  radius,
  controller,
}: {
  hasLogo: boolean
  background: OrganizationLogoBackground
  padding: number
  radius: number
  controller: CompanyLogoController
}) {
  const { t } = useLanguage()
  const { busy, remove, changeBackground, stepStyle } = controller
  const pill =
    "inline-flex flex-wrap items-center gap-1 rounded-full bg-black/25 p-1 ring-1 ring-white/20 backdrop-blur-sm transition-opacity"

  return (
    <div
      className={cn(
        "flex flex-col items-start gap-1.5 sm:items-end",
        !hasLogo && "pointer-events-none opacity-40"
      )}
    >
      <div role="group" aria-label={t("logoBackgroundLabel")} className={pill}>
        <span className="hidden pr-1 pl-2 text-[11px] font-semibold tracking-wide text-white/80 uppercase sm:inline">
          {t("logoBackgroundLabel")}
        </span>
        {swatches.map((swatch) => {
          const selected = swatch.value === background
          return (
            <button
              key={swatch.value}
              type="button"
              title={t(swatch.labelKey)}
              aria-label={t(swatch.labelKey)}
              aria-pressed={selected}
              disabled={!hasLogo}
              onClick={() => void changeBackground(swatch.value)}
              className={cn(
                "size-6 rounded-full border border-black/20 transition-transform hover:scale-110 focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none",
                swatch.className,
                selected && "ring-2 ring-white ring-offset-1 ring-offset-black/30"
              )}
            />
          )
        })}
        <span className="mx-0.5 h-4 w-px bg-white/25" aria-hidden="true" />
        <button
          type="button"
          title={t("clientLogoRemove")}
          aria-label={t("clientLogoRemove")}
          disabled={!hasLogo || busy}
          onClick={() => void remove()}
          className="flex size-6 items-center justify-center rounded-full text-white/85 transition-colors hover:bg-red-500/80 hover:text-white focus-visible:ring-2 focus-visible:ring-white focus-visible:outline-none disabled:opacity-60"
        >
          <Trash2Icon className="size-3.5" aria-hidden="true" />
        </button>
      </div>

      <div className={pill}>
        <StepControl
          label={t("logoPaddingLabel")}
          value={padding}
          disabled={!hasLogo}
          onLess={() => stepStyle("padding", -1)}
          onMore={() => stepStyle("padding", 1)}
        />
        <span className="mx-0.5 h-4 w-px bg-white/25" aria-hidden="true" />
        <StepControl
          label={t("logoRadiusLabel")}
          value={radius}
          disabled={!hasLogo}
          onLess={() => stepStyle("radius", -1)}
          onMore={() => stepStyle("radius", 1)}
        />
      </div>
    </div>
  )
}
