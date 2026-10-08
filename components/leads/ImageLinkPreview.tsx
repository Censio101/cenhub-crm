"use client"

import { useState } from "react"
import { createPortal } from "react-dom"
import { ExternalLinkIcon, ImageOffIcon, Loader2Icon } from "lucide-react"

import { adminOutlineButtonClass } from "@/components/admin/admin-ui-styles"
import { ModalShell } from "@/components/admin/ModalShell"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

type DialogProps = {
  url: string
  /** Link text shown as the popup title (falls back to a generic title). */
  title?: string
  onClose: () => void
}

/**
 * Shows an image link in a popup on the current page. If the link is not an image the browser
 * can display (for example a web page), the popup says so and offers to open it in a new tab.
 * Rendered in a portal so tables and scroll areas never clip it or start a pan underneath.
 */
export function ImageLinkPreviewDialog({ url, title, onClose }: DialogProps) {
  const { t } = useLanguage()
  const [status, setStatus] = useState<"loading" | "loaded" | "error">("loading")

  if (typeof document === "undefined") return null

  return createPortal(
    <ModalShell
      size="xl"
      title={title?.trim() || t("leadSheetImageView")}
      subtitle={url}
      onClose={onClose}
      footer={
        <>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className={cn(
              "mr-auto inline-flex h-9 items-center gap-1.5 rounded-lg border px-3 text-sm font-medium",
              adminOutlineButtonClass
            )}
          >
            {t("leadSheetImageOpenNewTab")}
            <ExternalLinkIcon className="size-3.5" aria-hidden />
          </a>
          <Button type="button" onClick={onClose}>
            {t("leadSheetNoteClose")}
          </Button>
        </>
      }
    >
      <div className="relative flex min-h-48 items-center justify-center rounded-xl border border-[#e0d7cc] bg-white p-2">
        {status === "loading" ? (
          <Loader2Icon
            className="absolute size-6 animate-spin text-muted-foreground"
            aria-label={t("leadSheetSaveSaving")}
          />
        ) : null}
        {status === "error" ? (
          <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
            <ImageOffIcon className="size-8 text-muted-foreground" aria-hidden />
            <p className="max-w-sm text-sm text-muted-foreground">
              {t("leadSheetImagePreviewError")}
            </p>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={url}
            alt={title?.trim() || ""}
            referrerPolicy="no-referrer"
            decoding="async"
            className={cn(
              "max-h-[65vh] w-auto max-w-full rounded-lg object-contain",
              status === "loading" && "opacity-0"
            )}
            onLoad={() => setStatus("loaded")}
            onError={() => setStatus("error")}
          />
        )}
      </div>
    </ModalShell>,
    document.body
  )
}

type ButtonProps = {
  url: string
  text: string
  className?: string
}

/** A link-styled button that opens the image popup (used where a plain hyperlink used to be). */
export function ImageLinkButton({ url, text, className }: ButtonProps) {
  const { t } = useLanguage()
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        type="button"
        title={url}
        className={cn(
          "inline-flex min-w-0 items-center gap-1 rounded-md text-sm font-medium text-primary underline-offset-2 hover:underline focus-visible:ring-2 focus-visible:ring-primary/30",
          className
        )}
        onClick={() => setOpen(true)}
      >
        <span className="truncate">{text || t("leadSheetImageView")}</span>
      </button>
      {open ? (
        <ImageLinkPreviewDialog url={url} title={text} onClose={() => setOpen(false)} />
      ) : null}
    </>
  )
}
