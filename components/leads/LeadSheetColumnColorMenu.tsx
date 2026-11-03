"use client"

import { CheckIcon, PaletteIcon } from "lucide-react"

import { useLanguage } from "@/components/i18n/LanguageProvider"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import type { MessageKey } from "@/lib/i18n"
import {
  SHEET_COLUMN_COLORS,
  type SheetColumnColorId,
} from "@/lib/leads/sheet-column-colors"
import { cn } from "cn"

const COLOR_LABEL_KEY: Record<SheetColumnColorId, MessageKey> = {
  yellow: "leadSheetColorYellow",
  green: "leadSheetColorGreen",
  blue: "leadSheetColorBlue",
  rose: "leadSheetColorRose",
  violet: "leadSheetColorViolet",
  stone: "leadSheetColorStone",
}

/** Small colour button in a column header. Picks the tint for the whole column. */
export function LeadSheetColumnColorMenu({
  current,
  onChange,
}: {
  current: SheetColumnColorId | null
  onChange: (color: SheetColumnColorId | null) => void
}) {
  const { t } = useLanguage()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={t("leadSheetColumnColor")}
        title={t("leadSheetColumnColor")}
        data-lead-sheet-no-pan="true"
        onClick={(event) => event.stopPropagation()}
        className={cn(
          "absolute top-1/2 right-1 z-[1] inline-flex size-5 -translate-y-1/2 items-center justify-center rounded text-white/70 transition-opacity hover:bg-white/15 hover:text-white",
          // Hidden until the header is hovered, unless a colour is set or the menu is open.
          current
            ? "opacity-100"
            : "opacity-0 group-hover/colhead:opacity-100 focus-visible:opacity-100 data-[popup-open]:opacity-100"
        )}
      >
        <PaletteIcon className="size-3.5" aria-hidden />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={6} className="min-w-44 rounded-[4px] p-1.5">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="px-2 py-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase">
            {t("leadSheetColumnColor")}
          </DropdownMenuLabel>
          {SHEET_COLUMN_COLORS.map((color) => (
            <DropdownMenuItem
              key={color.id}
              onClick={() => onChange(color.id)}
              className="gap-2 text-sm"
            >
              <span
                className="size-4 shrink-0 rounded-full border border-black/10"
                style={{ backgroundColor: color.cell, boxShadow: `inset 0 0 0 2px ${color.marker}33` }}
                aria-hidden
              />
              <span className="flex-1">{t(COLOR_LABEL_KEY[color.id])}</span>
              {current === color.id ? <CheckIcon className="size-3.5 text-primary" aria-hidden /> : null}
            </DropdownMenuItem>
          ))}
          {current ? (
            <>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onChange(null)} className="text-sm">
                {t("leadSheetColumnColorNone")}
              </DropdownMenuItem>
            </>
          ) : null}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
