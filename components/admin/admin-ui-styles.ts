import { cn } from "cn"

export const adminSectionCardClass =
  "rounded-2xl border border-[#d3c3b2] bg-card shadow-[0_1px_3px_rgba(26,18,8,0.06)]"

export const adminFieldClass =
  "h-11 w-full rounded-xl border border-[#d3c3b2] bg-white px-3 text-[15px] outline-none placeholder:text-muted-foreground/60 focus:border-primary focus:ring-2 focus:ring-primary/15"

/** Outline buttons on warm admin backgrounds — avoids muted hover blending into the page. */
export const adminOutlineButtonClass =
  "border-[#d3c3b2] bg-white text-foreground shadow-[0_1px_2px_rgba(26,18,8,0.05)] transition-colors hover:border-primary/45 hover:bg-white hover:text-primary hover:shadow-[0_2px_6px_rgba(228,102,12,0.12)]"

export function adminIconBoxClass(tone: "brand" | "blue" | "violet" | "neutral" = "neutral") {
  return cn(
    "flex size-9 shrink-0 items-center justify-center rounded-lg",
    tone === "brand" && "bg-[linear-gradient(135deg,#e4660c_0%,#c4530a_100%)] text-white",
    tone === "blue" && "bg-blue-50 text-blue-700",
    tone === "violet" && "bg-violet-50 text-violet-700",
    tone === "neutral" && "bg-[#faf8f6] text-muted-foreground"
  )
}
