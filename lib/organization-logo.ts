import type { CSSProperties } from "react"

import { getSupabaseUrl } from "@/lib/supabase/config"

export const ORGANIZATION_LOGO_BUCKET = "organization-logos"

export const ORGANIZATION_LOGO_MAX_BYTES = 2 * 1024 * 1024

const ALLOWED_LOGO_MIME = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
])

export const ORGANIZATION_LOGO_BACKGROUNDS = ["transparent", "white", "dark"] as const

export type OrganizationLogoBackground = (typeof ORGANIZATION_LOGO_BACKGROUNDS)[number]

export function isOrganizationLogoBackground(value: unknown): value is OrganizationLogoBackground {
  return (
    typeof value === "string" &&
    (ORGANIZATION_LOGO_BACKGROUNDS as readonly string[]).includes(value)
  )
}

/** Unknown / missing values fall back to a white backdrop (safe for dark logos on dark headers). */
export function parseOrganizationLogoBackground(value: unknown): OrganizationLogoBackground {
  return isOrganizationLogoBackground(value) ? value : "white"
}

/** Padding, corner radius, and vertical offset come in 5 steps. Step 2 is the original look. */
export const LOGO_STEP_MIN = 0
export const LOGO_STEP_MAX = 4
export const LOGO_STEP_DEFAULT = 2

export function isLogoStep(value: unknown): value is number {
  return (
    typeof value === "number" &&
    Number.isInteger(value) &&
    value >= LOGO_STEP_MIN &&
    value <= LOGO_STEP_MAX
  )
}

export function parseLogoStep(value: unknown): number {
  return isLogoStep(value) ? value : LOGO_STEP_DEFAULT
}

export type LogoChipSize = "header" | "stage"

/** [horizontal, vertical] padding in px per step. */
const PADDING_PX: Record<LogoChipSize, ReadonlyArray<readonly [number, number]>> = {
  header: [[0, 0], [6, 2], [12, 4], [18, 8], [24, 12]],
  stage: [[0, 0], [12, 6], [20, 14], [28, 20], [36, 26]],
}

/** Corner radius in px per step; the last step is a pill. */
const RADIUS_PX: Record<LogoChipSize, readonly number[]> = {
  header: [0, 6, 12, 18, 999],
  stage: [0, 8, 16, 24, 999],
}

export function logoChipStyle(size: LogoChipSize, padding: number, radius: number): CSSProperties {
  const [x, y] = PADDING_PX[size][parseLogoStep(padding)]
  return {
    padding: `${y}px ${x}px`,
    borderRadius: `${RADIUS_PX[size][parseLogoStep(radius)]}px`,
  }
}

export function logoRadiusPx(size: LogoChipSize, radius: number): string {
  return `${RADIUS_PX[size][parseLogoStep(radius)]}px`
}

/** Max logo image height in px per size step. Step 2 matches the original header look. */
const LOGO_IMAGE_HEIGHT_PX: Record<LogoChipSize, readonly number[]> = {
  header: [28, 32, 40, 48, 56],
  stage: [44, 52, 56, 64, 72],
}

const LOGO_IMAGE_MAX_WIDTH_PX: Record<LogoChipSize, readonly number[]> = {
  header: [120, 140, 160, 180, 200],
  stage: [180, 210, 240, 270, 288],
}

export function logoImageMaxHeightPx(chip: LogoChipSize, sizeStep: number): number {
  return LOGO_IMAGE_HEIGHT_PX[chip][parseLogoStep(sizeStep)]
}

export function logoImageStyle(chip: LogoChipSize, sizeStep: number): CSSProperties {
  return {
    maxHeight: `${logoImageMaxHeightPx(chip, sizeStep)}px`,
    maxWidth: `${LOGO_IMAGE_MAX_WIDTH_PX[chip][parseLogoStep(sizeStep)]}px`,
  }
}

/** Vertical nudge in the top menu (px). Step 2 = centered with Censio. */
const LOGO_OFFSET_Y_PX: readonly number[] = [-8, -4, 0, 4, 8]

export function logoOffsetTranslateYpx(offsetStep: number): number {
  return LOGO_OFFSET_Y_PX[parseLogoStep(offsetStep)]
}

export function logoOffsetStyle(offsetStep: number): CSSProperties {
  const y = logoOffsetTranslateYpx(offsetStep)
  return y === 0 ? {} : { transform: `translateY(${y}px)` }
}

export function isAllowedOrganizationLogoMime(type: string): boolean {
  return ALLOWED_LOGO_MIME.has(type)
}

export function organizationLogoObjectPath(organizationId: string, ext: string): string {
  const safeExt = ext.replace(/[^a-z0-9]/gi, "").toLowerCase() || "png"
  return `${organizationId}/logo.${safeExt}`
}

/** logo_url column: storage object path or absolute/static URL. */
export function resolveOrganizationLogoUrl(logoUrl: string | null | undefined): string | null {
  if (!logoUrl?.trim()) return null
  const value = logoUrl.trim()
  if (
    value.startsWith("http://") ||
    value.startsWith("https://") ||
    value.startsWith("/") ||
    value.startsWith("data:") ||
    value.startsWith("blob:")
  ) {
    return value
  }
  const base = getSupabaseUrl().replace(/\/$/, "")
  return `${base}/storage/v1/object/public/${ORGANIZATION_LOGO_BUCKET}/${value}`
}

export function organizationLogoExtFromFile(file: File): string {
  const fromName = file.name.split(".").pop()?.toLowerCase()
  if (fromName === "svg" || fromName === "png" || fromName === "jpg" || fromName === "jpeg" || fromName === "webp") {
    if (fromName === "jpg") return "jpeg"
    return fromName
  }
  if (file.type === "image/svg+xml") return "svg"
  if (file.type === "image/png") return "png"
  if (file.type === "image/webp") return "webp"
  return "jpeg"
}
