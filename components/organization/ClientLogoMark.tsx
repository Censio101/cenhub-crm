import {
  LOGO_STEP_DEFAULT,
  logoChipStyle,
  logoImageStyle,
  logoOffsetStyle,
  type OrganizationLogoBackground,
} from "@/lib/organization-logo"
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
  padding = LOGO_STEP_DEFAULT,
  radius = LOGO_STEP_DEFAULT,
  size = LOGO_STEP_DEFAULT,
  offsetY = LOGO_STEP_DEFAULT,
  className,
}: {
  src: string
  alt: string
  background?: OrganizationLogoBackground
  /** Chip padding, corner radius, logo size, and menu vertical offset — steps 0 to 4 (2 = original look). */
  padding?: number
  radius?: number
  size?: number
  offsetY?: number
  className?: string
}) {
  return (
    <span
      style={{ ...logoChipStyle("header", padding, radius), ...logoOffsetStyle(offsetY) }}
      className={cn(
        "inline-flex min-w-0 max-w-[min(200px,calc(100vw-14rem))] shrink items-center justify-center overflow-hidden sm:max-w-[min(220px,calc(100vw-16rem))] 2xl:max-w-none",
        backdropClassName[background],
        className
      )}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        style={logoImageStyle("header", size)}
        className="h-auto max-h-full max-w-full w-auto object-contain"
      />
    </span>
  )
}
