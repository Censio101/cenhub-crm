import type { ServiceId } from "./services"

export const CUSTOMER_SEGMENTS = [
  { id: "b2b", label: "Erhverv" },
  { id: "b2c", label: "Privat" },
] as const

export type CustomerSegmentId = (typeof CUSTOMER_SEGMENTS)[number]["id"]

export function isCustomerSegmentId(
  value: string
): value is CustomerSegmentId {
  return CUSTOMER_SEGMENTS.some((segment) => segment.id === value)
}

export function getCustomerSegmentLabel(
  id: CustomerSegmentId | null | undefined
): string {
  if (!id) return "Privat/Erhverv"
  return (
    CUSTOMER_SEGMENTS.find((segment) => segment.id === id)?.label ?? "Privat/Erhverv"
  )
}

export function b2bShare(service: ServiceId, month: number): number {
  const seasonal = 0.03 * Math.sin((month - 2) * 0.7)

  switch (service) {
    case "nybyg":
      return 0.58 + seasonal
    case "tilbygning":
      return 0.42 + seasonal
    case "tagdaekning":
      return 0.3 + seasonal
    case "renovering":
      return 0.24 + seasonal * 0.6
    case "badevaerelse":
      return 0.14 + seasonal * 0.4
  }
}
