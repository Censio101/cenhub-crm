import type { MessageKey } from "@/lib/i18n"
import type { BuildImageLinkResult } from "@/lib/lead-sheet/image-link"

type LinkError = Extract<BuildImageLinkResult, { ok: false }>["error"]

export function imageLinkErrorMessageKey(error: LinkError): MessageKey {
  switch (error) {
    case "urlRequired":
      return "leadSheetImageLinkUrlRequired"
    case "textTooLong":
      return "leadSheetImageLinkTextTooLong"
    default:
      return "leadSheetImageLinkUrlInvalid"
  }
}
