"use client"

import { useCallback, useState } from "react"
import Cropper, { type Area } from "react-easy-crop"
import "react-easy-crop/react-easy-crop.css"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cropImageToDataUrl } from "@/lib/account/crop-profile-image"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

type ProfilePhotoCropDialogProps = {
  imageSrc: string
  open: boolean
  onClose: () => void
  onConfirm: (dataUrl: string) => void
}

export function ProfilePhotoCropDialog({
  imageSrc,
  open,
  onClose,
  onConfirm,
}: ProfilePhotoCropDialogProps) {
  const { t } = useLanguage()
  const [crop, setCrop] = useState({ x: 0, y: 0 })
  const [zoom, setZoom] = useState(1)
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onCropComplete = useCallback((_croppedArea: Area, croppedPixels: Area) => {
    setCroppedAreaPixels(croppedPixels)
  }, [])

  if (!open) return null

  async function handleConfirm() {
    if (!croppedAreaPixels) return
    setSaving(true)
    setError(null)
    try {
      const dataUrl = await cropImageToDataUrl(imageSrc, croppedAreaPixels)
      onConfirm(dataUrl)
      onClose()
    } catch {
      setError(t("cropPhotoError"))
    } finally {
      setSaving(false)
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/55 p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="profile-crop-title"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-xl">
        <div className="border-b border-border px-5 py-4">
          <h2 id="profile-crop-title" className="text-lg font-semibold text-foreground">
            {t("cropPhotoTitle")}
          </h2>
          <p className="mt-1 text-sm text-muted-foreground">{t("cropPhotoDescription")}</p>
        </div>

        <div className="relative h-72 bg-[#1a1208] sm:h-80">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onZoomChange={setZoom}
            onCropComplete={onCropComplete}
          />
        </div>

        <div className="space-y-3 border-t border-border px-5 py-4">
          <label className="grid gap-2">
            <span className="text-xs font-medium text-muted-foreground">{t("cropPhotoZoom")}</span>
            <input
              type="range"
              min={1}
              max={3}
              step={0.05}
              value={zoom}
              onChange={(event) => setZoom(Number(event.target.value))}
              className={cn("w-full accent-primary")}
            />
          </label>

          {error ? <p className="text-sm text-danger-foreground">{error}</p> : null}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" disabled={saving} onClick={onClose}>
              {t("cropPhotoCancel")}
            </Button>
            <Button type="button" disabled={saving || !croppedAreaPixels} onClick={() => void handleConfirm()}>
              {saving ? t("cropPhotoSaving") : t("cropPhotoSave")}
            </Button>
          </div>
        </div>
      </div>
    </div>
  )
}
