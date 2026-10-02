import { cn } from "cn"

/** Muted warm palette — readable on #fffcf9 cards, distinct from primary orange CTAs. */
const PILL_VARIANTS = [
  {
    shell: "border-orange-200/90 bg-orange-50 text-orange-950",
    removeHover: "hover:bg-orange-100/90 hover:text-orange-950",
  },
  {
    shell: "border-amber-200/90 bg-amber-50 text-amber-950",
    removeHover: "hover:bg-amber-100/90 hover:text-amber-950",
  },
  {
    shell: "border-emerald-200/90 bg-emerald-50 text-emerald-950",
    removeHover: "hover:bg-emerald-100/90 hover:text-emerald-950",
  },
  {
    shell: "border-teal-200/90 bg-teal-50 text-teal-950",
    removeHover: "hover:bg-teal-100/90 hover:text-teal-950",
  },
  {
    shell: "border-sky-200/90 bg-sky-50 text-sky-950",
    removeHover: "hover:bg-sky-100/90 hover:text-sky-950",
  },
  {
    shell: "border-violet-200/90 bg-violet-50 text-violet-950",
    removeHover: "hover:bg-violet-100/90 hover:text-violet-950",
  },
  {
    shell: "border-rose-200/90 bg-rose-50 text-rose-950",
    removeHover: "hover:bg-rose-100/90 hover:text-rose-950",
  },
  {
    shell: "border-[#d3c3b2] bg-[#faf8f6] text-foreground",
    removeHover: "hover:bg-[#f3ebe3] hover:text-foreground",
  },
] as const

function hashString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) {
    hash = (hash * 31 + value.charCodeAt(i)) | 0
  }
  return Math.abs(hash)
}

export function industryPillClasses(stableKey: string) {
  const variant = PILL_VARIANTS[hashString(stableKey) % PILL_VARIANTS.length]
  return {
    shell: cn("border shadow-sm", variant.shell),
    removeHover: cn("text-current/70", variant.removeHover),
  }
}
