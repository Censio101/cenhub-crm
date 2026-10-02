"use client"

import { useRef, useState } from "react"
import { ImageIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { ORGANIZATION_LOGO_MAX_BYTES } from "@/lib/organization-logo"
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
}: OrganizationLogoUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [uploading, setUploading] = useState(false)

  async function uploadFile(file: File) {
    setUploading(true)
    setError(null)
    try {
      const form = new FormData()
      form.set("file", file)
      const response = await fetch(uploadUrl, { method: "POST", body: form })
      const data = (await response.json()) as { logoUrl?: string | null; error?: string }
      if (!response.ok) {
        throw new Error(data.error ?? "Upload failed")
      }
      onLogoChange(data.logoUrl ?? null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Upload failed")
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
        throw new Error(data.error ?? "Could not remove logo")
      }
      onLogoChange(null)
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not remove logo")
    } finally {
      setUploading(false)
    }
  }

  return (
    <div className="flex items-center gap-4">
      <div
        className={cn(
          "flex h-20 w-32 shrink-0 items-center justify-center overflow-hidden rounded-[15px] bg-muted ring-1 ring-border"
        )}
      >
        {logoUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={logoUrl} alt="" className="max-h-full max-w-full object-contain p-2" />
        ) : (
          <ImageIcon className="size-8 text-muted-foreground" aria-hidden="true" />
        )}
      </div>
      <div className="min-w-0">
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
                if (!file.type.startsWith("image/")) {
                  setError("Invalid file type")
                  return
                }
                if (file.size > ORGANIZATION_LOGO_MAX_BYTES) {
                  setError("File too large")
                  return
                }
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
          <p className="mt-2 text-xs text-muted-foreground">
            {logoUrl ? null : description}
          </p>
        )}
        {error ? <p className="mt-2 text-sm text-danger-foreground">{error}</p> : null}
      </div>
    </div>
  )
}
