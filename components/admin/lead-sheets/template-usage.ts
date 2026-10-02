import type { MessageKey } from "@/lib/i18n"
import type { TemplateClientRef } from "@/lib/lead-sheet/types"

type Translate = (key: MessageKey) => string

const NAMES_SHOWN = 3

/** "Acme, Beta, Gamma and 2 more". */
export function formatClientNames(clients: readonly TemplateClientRef[], t: Translate): string {
  const names = clients.map((c) => c.name)
  if (names.length <= NAMES_SHOWN) return names.join(", ")
  return t("leadSheetsClientsAndMore")
    .replace("{names}", names.slice(0, NAMES_SHOWN).join(", "))
    .replace("{count}", String(names.length - NAMES_SHOWN))
}

/** "Used by 3 clients" / "Used by 1 client" / "Not used by any client". */
export function usedByLabel(count: number, t: Translate): string {
  if (count === 0) return t("leadSheetsUsedByNone")
  if (count === 1) return t("leadSheetsUsedByOne")
  return t("leadSheetsUsedByMany").replace("{count}", String(count))
}
