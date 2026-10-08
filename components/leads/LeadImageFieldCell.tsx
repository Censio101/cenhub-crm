"use client"

import { useEffect, useState } from "react"
import { ImageIcon, PencilIcon, PlusIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import { ImageLinkPreviewDialog } from "@/components/leads/ImageLinkPreview"
import { Button } from "@/components/ui/button"
import {
  Popover,
  PopoverContent,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  IMAGE_LINK_TEXT_MAX,
  buildImageLinkValue,
  parseImageCellValue,
  type ImageLinkValue,
} from "@/lib/lead-sheet/image-link"
import { imageLinkErrorMessageKey } from "@/lib/lead-sheet/image-link-messages"
import { cn } from "cn"

const inputClass =
  "h-9 w-full rounded-lg border border-[#d3c3b2] bg-white px-2.5 text-sm outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

type Props = {
  leadId: string
  fieldKey: string
  /** Stored value: `{ text, url }`, or a legacy storage path string. */
  value: unknown
  onChange: (next: ImageLinkValue | null) => void
  disabled?: boolean
}

/** Shows a photo uploaded with the previous file-based flow. */
function LegacyImagePreview({ leadId, fieldKey }: { leadId: string; fieldKey: string }) {
  const { t } = useLanguage()
  const [url, setUrl] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    void (async () => {
      const res = await fetch(`/api/leads/${leadId}/custom-fields/${fieldKey}/signed-url`, {
        cache: "no-store",
      })
      const data = (await res.json()) as { url?: string | null }
      if (!cancelled) setUrl(data.url ?? null)
    })()
    return () => {
      cancelled = true
    }
  }, [leadId, fieldKey])

  return url ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={url} alt="" className="max-h-56 w-full rounded-md object-contain" />
  ) : (
    <p className="text-sm text-muted-foreground">{t("leadSheetImageEmpty")}</p>
  )
}

/** Mounted only while the popover is open, so its draft always starts from the saved value. */
function ImageLinkForm({
  initialText,
  initialUrl,
  canRemove,
  onSave,
  onRemove,
  onPreview,
}: {
  initialText: string
  initialUrl: string
  canRemove: boolean
  onSave: (value: ImageLinkValue) => void
  onRemove: () => void
  /** Shows what is typed in the image popup (the popover closes first). */
  onPreview: (value: ImageLinkValue) => void
}) {
  const { t } = useLanguage()
  const [text, setText] = useState(initialText)
  const [url, setUrl] = useState(initialUrl)
  const [error, setError] = useState<string | null>(null)
  // The link as it would be saved, so "Open link" tests what is typed, not the old value.
  const typed = buildImageLinkValue(text, url)
  const openUrl = typed.ok ? typed.value.url : null

  function submit() {
    const built = buildImageLinkValue(text, url)
    if (!built.ok) {
      setError(t(imageLinkErrorMessageKey(built.error)))
      return
    }
    onSave(built.value)
  }

  function onKeyDown(e: React.KeyboardEvent) {
    if (e.key === "Enter") {
      e.preventDefault()
      submit()
    }
  }

  return (
    <div className="grid gap-3">
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        {t("leadSheetImageLinkText")}
        <input
          className={inputClass}
          value={text}
          maxLength={IMAGE_LINK_TEXT_MAX}
          placeholder={t("leadSheetImageLinkTextPlaceholder")}
          autoFocus
          onChange={(e) => setText(e.target.value)}
          onKeyDown={onKeyDown}
        />
      </label>
      <label className="grid gap-1 text-xs font-medium text-muted-foreground">
        {t("leadSheetImageLinkUrl")}
        <input
          className={cn(inputClass, error && "border-red-400 focus:border-red-500")}
          value={url}
          inputMode="url"
          autoComplete="off"
          spellCheck={false}
          placeholder={t("leadSheetImageLinkUrlPlaceholder")}
          aria-invalid={Boolean(error)}
          onChange={(e) => {
            setUrl(e.target.value)
            if (error) setError(null)
          }}
          onKeyDown={onKeyDown}
        />
      </label>
      {error ? (
        <p role="alert" className="-mt-1 text-xs text-red-700">
          {error}
        </p>
      ) : null}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-1">
          {canRemove ? (
            <Button type="button" variant="ghost" size="sm" onClick={onRemove}>
              {t("leadSheetImageLinkRemove")}
            </Button>
          ) : null}
          {openUrl ? (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-primary hover:bg-primary/10 hover:text-primary"
              onClick={() => onPreview({ text: text.trim(), url: openUrl })}
            >
              {t("leadSheetImageLinkOpen")}
            </Button>
          ) : null}
        </div>
        <Button type="button" size="sm" onClick={submit}>
          {t("leadSheetSaveAssignment")}
        </Button>
      </div>
    </div>
  )
}

export function LeadImageFieldCell({ leadId, fieldKey, value, onChange, disabled }: Props) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)
  const [preview, setPreview] = useState<ImageLinkValue | null>(null)
  const parsed = parseImageCellValue(value)

  const triggerClass =
    "inline-flex h-8 shrink-0 items-center gap-1.5 rounded-md px-1.5 text-sm text-primary hover:bg-accent disabled:opacity-50"

  const popover = (trigger: React.ReactNode) => (
    <Popover open={open} onOpenChange={setOpen}>
      {trigger}
      <PopoverContent align="start" className="w-[min(90vw,20rem)] gap-3 p-3">
        <PopoverHeader>
          <PopoverTitle>{t("leadSheetImageLinkTitle")}</PopoverTitle>
        </PopoverHeader>
        {parsed.kind === "file" ? (
          <>
            <LegacyImagePreview leadId={leadId} fieldKey={fieldKey} />
            <p className="text-xs text-muted-foreground">{t("leadSheetImageLegacyHint")}</p>
          </>
        ) : null}
        <ImageLinkForm
          initialText={parsed.kind === "link" ? parsed.text : ""}
          initialUrl={parsed.kind === "link" ? parsed.url : ""}
          canRemove={parsed.kind !== "empty"}
          onSave={(next) => {
            onChange(next)
            setOpen(false)
          }}
          onRemove={() => {
            onChange(null)
            setOpen(false)
          }}
          onPreview={(link) => {
            setOpen(false)
            setPreview(link)
          }}
        />
      </PopoverContent>
    </Popover>
  )

  const previewDialog = preview ? (
    <ImageLinkPreviewDialog
      url={preview.url}
      title={preview.text}
      onClose={() => setPreview(null)}
    />
  ) : null

  if (parsed.kind === "link") {
    return (
      <div className="flex min-w-0 items-center gap-0.5">
        <button
          type="button"
          title={parsed.url}
          className="inline-flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary/30"
          onClick={() => setPreview({ text: parsed.text, url: parsed.url })}
        >
          <span className="truncate">{parsed.text || t("leadSheetImageView")}</span>
        </button>
        {previewDialog}
        {popover(
          <PopoverTrigger
            disabled={disabled}
            aria-label={t("leadSheetImageLinkEdit")}
            title={t("leadSheetImageLinkEdit")}
            className="inline-flex size-8 shrink-0 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-primary/10 hover:text-primary focus-visible:ring-2 focus-visible:ring-primary/30 disabled:opacity-50"
          >
            <PencilIcon className="size-3.5" aria-hidden />
          </PopoverTrigger>
        )}
      </div>
    )
  }

  return popover(
    <PopoverTrigger disabled={disabled} className={triggerClass}>
      {parsed.kind === "file" ? (
        <ImageIcon className="size-4 shrink-0" aria-hidden />
      ) : (
        <PlusIcon className="size-4 shrink-0" aria-hidden />
      )}
      <span className="truncate">
        {parsed.kind === "file" ? t("leadSheetImageView") : t("leadSheetImageLinkAdd")}
      </span>
    </PopoverTrigger>
  )
}
