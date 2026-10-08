"use client"

import { useRef, useState, type DragEvent } from "react"
import { CameraIcon, Loader2Icon, Trash2Icon } from "lucide-react"

import { ProfilePhotoCropDialog } from "@/components/account/ProfilePhotoCropDialog"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cn } from "cn"

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

function readImageFile(file: File, messages: { notImage: string; tooLarge: string; unreadable: string }) {
  return new Promise<string>((resolve, reject) => {
    if (!file.type.startsWith("image/")) {
      reject(new Error(messages.notImage))
      return
    }
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error(messages.tooLarge))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error(messages.unreadable))
    }
    reader.onerror = () => reject(new Error(messages.unreadable))
    reader.readAsDataURL(file)
  })
}

type ProfileAvatarUploadProps = {
  image: string
  initials: string
  saving?: boolean
  onImageChange: (dataUrl: string) => void
  onRemove?: () => void
  onError?: (message: string) => void
  className?: string
}

/** Large round avatar — click or drop an image on it to change; hover reveals a camera overlay. */
export function ProfileAvatarUpload({
  image,
  initials,
  saving = false,
  onImageChange,
  onRemove,
  onError,
  className,
}: ProfileAvatarUploadProps) {
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)

  async function applyFile(file: File | undefined) {
    if (!file) return
    try {
      const next = await readImageFile(file, {
        notImage: t("profilePhotoErrorNotImage"),
        tooLarge: t("profilePhotoErrorTooLarge"),
        unreadable: t("profilePhotoErrorUnreadable"),
      })
      if (file.type === "image/svg+xml") {
        onImageChange(next)
        return
      }
      setCropImageSrc(next)
    } catch (caught) {
      onError?.(caught instanceof Error ? caught.message : t("profilePhotoSaveError"))
    }
  }

  function handleDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    setDragging(false)
    void applyFile(event.dataTransfer.files?.[0])
  }

  return (
    <div className={cn("relative inline-flex flex-col items-center gap-2", className)}>
      {cropImageSrc ? (
        <ProfilePhotoCropDialog
          open
          imageSrc={cropImageSrc}
          onClose={() => setCropImageSrc(null)}
          onConfirm={(dataUrl) => {
            onImageChange(dataUrl)
            setCropImageSrc(null)
          }}
        />
      ) : null}

      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/svg+xml"
        className="sr-only"
        onChange={(event) => {
          const file = event.target.files?.[0]
          event.target.value = ""
          void applyFile(file)
        }}
      />

      <div
        onDragOver={(event) => {
          event.preventDefault()
          setDragging(true)
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        className="relative"
      >
        <button
          type="button"
          aria-label={t("changePhoto")}
          disabled={saving}
          onClick={() => inputRef.current?.click()}
          className={cn(
            "group relative flex size-28 items-center justify-center overflow-hidden rounded-full sm:size-32",
            "bg-[linear-gradient(135deg,#e4660c_0%,#c4530a_100%)] text-3xl font-semibold text-white",
            "ring-4 ring-white shadow-[0_4px_16px_rgba(131,59,8,0.22)] transition-shadow",
            "hover:shadow-[0_6px_22px_rgba(131,59,8,0.3)] focus-visible:ring-primary/40 focus-visible:outline-none",
            dragging && "ring-primary/50",
            "disabled:cursor-wait"
          )}
        >
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="size-full object-cover" />
          ) : (
            <span aria-hidden="true">{initials}</span>
          )}
          <span
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center gap-1 bg-black/45 text-[11px] font-semibold tracking-wide text-white uppercase",
              "opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100",
              (saving || dragging) && "opacity-100"
            )}
          >
            {saving ? (
              <Loader2Icon className="size-5 animate-spin" aria-hidden="true" />
            ) : (
              <CameraIcon className="size-5" aria-hidden="true" />
            )}
            {saving ? t("cropPhotoSaving") : dragging ? t("dropPhotoActive") : t("changePhoto")}
          </span>
        </button>
      </div>

      {image && onRemove ? (
        <button
          type="button"
          disabled={saving}
          onClick={onRemove}
          className="inline-flex items-center gap-1 text-[12px] font-medium text-muted-foreground transition-colors hover:text-red-700 disabled:opacity-50"
        >
          <Trash2Icon className="size-3.5" aria-hidden="true" />
          {t("removePhoto")}
        </button>
      ) : null}
    </div>
  )
}
