"use client"

import { useRef, useState, type DragEvent } from "react"
import { ImageUpIcon, UserRoundIcon } from "lucide-react"

import { ProfilePhotoCropDialog } from "@/components/account/ProfilePhotoCropDialog"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

const MAX_IMAGE_BYTES = 2 * 1024 * 1024

function validateImageFile(file: File) {
  if (!file.type.startsWith("image/")) {
    return "Vælg en billedfil."
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return "Billedet må højst være 2 MB."
  }
  return null
}

function readImageFile(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const validationError = validateImageFile(file)
    if (validationError) {
      reject(new Error(validationError))
      return
    }
    const reader = new FileReader()
    reader.onload = () => {
      if (typeof reader.result === "string") resolve(reader.result)
      else reject(new Error("Billedet kunne ikke læses."))
    }
    reader.onerror = () => reject(new Error("Billedet kunne ikke læses."))
    reader.readAsDataURL(file)
  })
}

type ProfilePhotoFieldProps = {
  image: string
  onImageChange: (dataUrl: string) => void
}

export function ProfilePhotoField({ image, onImageChange }: ProfilePhotoFieldProps) {
  const { t } = useLanguage()
  const inputRef = useRef<HTMLInputElement>(null)
  const [imageError, setImageError] = useState<string | null>(null)
  const [isDraggingPhoto, setIsDraggingPhoto] = useState(false)
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null)
  const dragDepthRef = useRef(0)

  async function applyProfileImageFile(file: File | undefined) {
    if (!file) return
    try {
      const next = await readImageFile(file)
      setImageError(null)
      if (file.type === "image/svg+xml") {
        onImageChange(next)
        return
      }
      setCropImageSrc(next)
    } catch (caught) {
      setImageError(
        caught instanceof Error ? caught.message : "Kunne ikke skifte billede."
      )
    }
  }

  function handlePhotoDragEnter(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepthRef.current += 1
    setIsDraggingPhoto(true)
  }

  function handlePhotoDragLeave(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepthRef.current -= 1
    if (dragDepthRef.current <= 0) {
      dragDepthRef.current = 0
      setIsDraggingPhoto(false)
    }
  }

  function handlePhotoDragOver(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    event.dataTransfer.dropEffect = "copy"
  }

  function handlePhotoDrop(event: DragEvent<HTMLDivElement>) {
    event.preventDefault()
    dragDepthRef.current = 0
    setIsDraggingPhoto(false)
    const file = event.dataTransfer.files?.[0]
    void applyProfileImageFile(file)
  }

  return (
    <>
      {cropImageSrc ? (
        <ProfilePhotoCropDialog
          open
          imageSrc={cropImageSrc}
          onClose={() => setCropImageSrc(null)}
          onConfirm={(dataUrl) => {
            setImageError(null)
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
          void applyProfileImageFile(file)
        }}
      />
      <div
        role="button"
        tabIndex={0}
        aria-label={t("changePhoto")}
        className={cn(
          "flex cursor-pointer flex-col gap-4 rounded-2xl border border-dashed p-4 transition-colors sm:flex-row sm:items-center",
          isDraggingPhoto
            ? "border-primary bg-primary/5 ring-2 ring-primary/20"
            : "border-border bg-[#faf8f6]/60 hover:border-primary/40 hover:bg-[#faf8f6]"
        )}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            event.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragEnter={handlePhotoDragEnter}
        onDragLeave={handlePhotoDragLeave}
        onDragOver={handlePhotoDragOver}
        onDrop={handlePhotoDrop}
      >
        <div className="flex size-20 shrink-0 items-center justify-center overflow-hidden rounded-full bg-muted ring-1 ring-border">
          {image ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={image} alt="" className="size-full object-cover" />
          ) : (
            <UserRoundIcon className="size-8 text-muted-foreground" />
          )}
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-start gap-2 text-sm text-muted-foreground">
            <ImageUpIcon className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden="true" />
            <div>
              <p className="font-medium text-foreground">
                {isDraggingPhoto ? t("dropPhotoActive") : t("changePhoto")}
              </p>
              {!isDraggingPhoto ? <p className="mt-0.5">{t("dropPhotoHint")}</p> : null}
            </div>
          </div>
          <Button
            type="button"
            variant="outline"
            className="mt-3 h-10"
            onClick={(event) => {
              event.stopPropagation()
              inputRef.current?.click()
            }}
          >
            {t("changePhoto")}
          </Button>
        </div>
      </div>
      {imageError ? (
        <p className="mt-3 text-sm text-danger-foreground">{imageError}</p>
      ) : null}
    </>
  )
}
