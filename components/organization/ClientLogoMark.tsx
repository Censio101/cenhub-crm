import type { OrganizationLogoBackground } from "@/lib/organization-logo"
import { cn } from "cn"

const backdropClassName: Record<OrganizationLogoBackground, string> = {
  transparent: "",
  white: "bg-white shadow-[0_1px_6px_rgba(0,0,0,0.25)]",
  dark: "bg-[#141414] ring-1 ring-white/15",
}

/**
 * Client logo for the portal header. Always hugs the logo's own width (no fixed-width box), and
 * every backdrop uses the same padding so the logo does not shift when the backdrop changes.
 * "transparent" just omits the chip's background.
 */
export function ClientLogoMark({
  src,
  alt,
  background = "transparent",
  className,
}: {
  src: string
  alt: string
  background?: OrganizationLogoBackground
  className?: string
}) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center justify-center rounded-xl px-2.5 py-1 sm:px-3",
        backdropClassName[background],
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="h-10 w-auto max-w-[10rem] object-contain sm:h-12 sm:max-w-[15rem]"
      />
    </span>
  )
}
