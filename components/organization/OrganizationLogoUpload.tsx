"use client"

import { useRef, useState, type DragEvent } from "react"
import { ImageIcon, ImageUpIcon, Loader2Icon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import {
  isAllowedOrganizationLogoMime,
  ORGANIZATION_LOGO_MAX_BYTES,
} from "@/lib/organization-logo"
import { cn } from "cn"

type OrganizationLogoUploadProps = {
  logoUrl: string | null
  canEdit: boolean
  uploadUrl: string
  onLogoChange: (logoUrl: string | null) => void
  label: string
  description: string
  changeLabel: string
  removeLabel: string
  uploadingLabel?: string
  /** Larger preview and stacked layout for settings pages. */
  variant?: "inline" | "panel"
}

type LogoFileErrorKey = "clientLogoInvalidType" | "clientLogoTooLarge"

function validateLogoFile(file: File): LogoFileErrorKey | null {
  if (!file.type.startsWith("image/") || !isAllowedOrganizationLogoMime(file.type)) {
    return "clientLogoInvalidType"
  }
  if (file.size > ORGANIZATION_LOGO_MAX_BYTES) {
    return "clientLogoTooLarge"
  }
  return null
}

function OrganizationLogoPanelUpload({
  logoUrl,
  canEdit,
  uploadUrl,
  onLogoChange,
  changeLabel,
  removeLabel,
  uploadingLabel,
  description,
}: Omit<OrganizationLogoUploadProps, "variant" | "label">) {
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const dragDepthRef = useRef(0)

  async function uploadFile(file: File) {
    const validationErrorKey = validateLogoFile(file)
    if (validationErrorKey) {
      setError(t(validationErrorKey))
      return
    }
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.set("file", file)
      const response = await fetch(uploadUrl, { method: "POST", body: form })
      const data = (await response.json()) as { logoUrl?: string | null; error?: string }
      if (!response.ok) {
        throw new Error(data.error ?? t("clientLogoUploadError"))
      }
      onLogoChange(data.logoUrl ?? null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("clientLogoUploadError"))
    } finally {
      setUploading(false)
    }
  }

  async function removeLogo() {
    setUploading(true)
    setError(null)
    try {
      const response = await fetch(uploadUrl, { method: "DELETE" })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error ?? t("clientLogoUploadError"))
      }
      onLogoChange(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("clientLogoUploadError"))
    } finally {
      setUploading(false)
    }
  }

  function handleDragEnter(event: DragEvent<HTMLDivElement>) {
    if (!canEdit || uploading) return
    event.preventDefault()
    dragDepthRef.current += 1
    setIsDragging(true)
  }

  function handleDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepthRef.current -= 1
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0
      setIsDragging(false)
    }
  }

  function handleDragOver(event: DragEvent<HTMLDivElement>) {
    if (!canEdit || uploading) return
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    if (!canEdit || uploading) return
    event.preventDefault()
    dragDepthRef.current = 0
    setIsDragging(false)
    const file = event.dataTransfer.files?.[0]
    if (file) void uploadFile(file)
  }

  const dropZoneInteractive = canEdit && !uploading

  return (
    <div>
      {canEdit ? (
        <>
          <input
            ref={inputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp,image/svg+xml"
            className="sr-only"
            disabled={uploading}
            onChange={async (event) => {
              const file = event.target.files?.[0]
              event.target.value = ""
              if (file) await uploadFile(file)
            }}
          />
          <div
            role="button"
            tabIndex={dropZoneInteractive ? 0 : undefined}
            aria-label={t("clientLogoUploadTitle")}
            aria-disabled={!dropZoneInteractive || undefined}
            className={cn(
              "relative flex flex-col gap-4 rounded-[15px] border border-dashed p-5 transition-colors sm:flex-row sm:items-center sm:p-6",
              dropZoneInteractive && "cursor-pointer",
              isDragging
                ? "border-primary bg-primary/5 ring-2 ring-primary/20"
                : "border-border bg-[#faf8f6]/80 hover:border-primary/35 hover:bg-[#faf8f6]",
              uploading && "pointer-events-none opacity-90"
            )}
            onClick={() => {
              if (dropZoneInteractive) inputRef.current?.click()
            }}
            onKeyDown={(event) => {
              if (!dropZoneInteractive) return
              if (event.key === "Enter" || event.key === " ") {
                event.preventDefault()
                inputRef.current?.click()
              }
            }}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {uploading ? (
              <div
                className="absolute inset-0 z-10 flex items-center justify-center rounded-[15px] bg-[#faf8f6]/90 backdrop-blur-[1px]"
                aria-live="polite"
              >
                <span className="inline-flex items-center gap-2 text-sm font-medium text-foreground">
                  <Loader2Icon className="size-4 animate-spin text-primary" aria-hidden="true" />
                  {uploadingLabel ?? t("clientLogoUploading")}
                </span>
              </div>
            ) : null}

            <div
              className={cn(
                "relative flex h-24 w-full max-w-[280px] shrink-0 items-center justify-center overflow-hidden rounded-xl bg-white ring-1 ring-border sm:h-28 sm:w-56",
                !logoUrl && "bg-muted/30"
              )}
            >
              {logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={logoUrl}
                  alt=""
                  className="max-h-[85%] max-w-[90%] object-contain"
                />
              ) : (
                <ImageIcon className="size-10 text-muted-foreground/70" aria-hidden="true" />
              )}
            </div>

            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-2.5 text-sm">
                <ImageUpIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
                <div className="min-w-0">
                  <p className="font-medium text-foreground">
                    {isDragging ? t("clientLogoDropActive") : t("clientLogoUploadTitle")}
                  </p>
                  {!isDragging ? (
                    <p className="mt-1 text-muted-foreground">{t("clientLogoDropHint")}</p>
                  ) : null}
                  <p className="mt-1.5 text-xs text-muted-foreground">{description}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-[5px] bg-white"
                  disabled={uploading}
                  onClick={(event) => {
                    event.stopPropagation()
                    inputRef.current?.click()
                  }}
                >
                  {changeLabel}
                </Button>
                {logoUrl ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-[5px] bg-white text-red-700 hover:border-red-200 hover:bg-red-50 hover:text-red-800"
                    disabled={uploading}
                    onClick={(event) => {
                      event.stopPropagation()
                      void removeLogo()
                    }}
                  >
                    {removeLabel}
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
          {error ? (
            <p className="text-sm text-danger-foreground" role="alert">
              {error}
            </p>
          ) : null}
        </>
      ) : (
        <p className="text-sm text-muted-foreground">
          {logoUrl ? t("clientLogoReadOnlyHint") : description}
        </p>
      )}
    </div>
  )
}

export function OrganizationLogoUpload({
  logoUrl,
  canEdit,
  uploadUrl,
  onLogoChange,
  label,
  description,
  changeLabel,
  removeLabel,
  uploadingLabel = "…",
  variant = "inline",
}: OrganizationLogoUploadProps) {
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  if (variant === "panel") {
    return (
      <OrganizationLogoPanelUpload
        logoUrl={logoUrl}
        canEdit={canEdit}
        uploadUrl={uploadUrl}
        onLogoChange={onLogoChange}
        description={description}
        changeLabel={changeLabel}
        removeLabel={removeLabel}
        uploadingLabel={uploadingLabel}
      />
    )
  }

  async function uploadFile(file: File) {
    const validationErrorKey = validateLogoFile(file)
    if (validationErrorKey) {
      setError(t(validationErrorKey))
      return
    }
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.set("file", file)
      const response = await fetch(uploadUrl, { method: "POST", body: form })
      const data = (await response.json()) as { logoUrl?: string | null; error?: string }
      if (!response.ok) {
        throw new Error(data.error ?? t("clientLogoUploadError"))
      }
      onLogoChange(data.logoUrl ?? null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("clientLogoUploadError"))
    } finally {
      setUploading(false)
    }
  }

  async function removeLogo() {
    setUploading(true)
    setError(null)
    try {
      const response = await fetch(uploadUrl, { method: "DELETE" })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error ?? t("clientLogoUploadError"))
      }
      onLogoChange(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : t("clientLogoUploadError"))
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div className="flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-[15px] bg-[#faf8f6] ring-1 ring-border">
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="max-h-full max-w-full object-contain p-2" />
        ) : (
          <ImageIcon className="size-8 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-medium">{label}</p>
        <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>
        {canEdit ? (
          <>
            <input
              ref={inputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/svg+xml"
              className="sr-only"
              disabled={uploading}
              onChange={async (event) => {
                const file = event.target.files?.[0]
                event.target.value = ""
                if (!file) return
                await uploadFile(file)
              }}
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <Button
                type="button"
                variant="outline"
                disabled={uploading}
                onClick={() => inputRef.current?.click()}
              >
                {uploading ? uploadingLabel : changeLabel}
              </Button>
              {logoUrl ? (
                <Button
                  type="button"
                  variant="ghost"
                  disabled={uploading}
                  onClick={() => void removeLogo()}
                >
                  {removeLabel}
                </Button>
              ) : null}
            </div>
          </>
        ) : (
          <p className="mt-2 text-xs text-muted-foreground">{logoUrl ? null : description}</p>
        )}
        {error ? <p className="mt-2 text-sm text-danger-foreground">{error}</p> : null}
      </div>
    </div>
  )
}