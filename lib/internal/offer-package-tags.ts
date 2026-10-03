import { MegaphoneIcon, RadarIcon, VideoIcon } from "lucide-react"

import { OFFER_SERVICE_MARKS } from "@/lib/internal/offer-service-marks"
import { OFFER_SERVICE_LABELS } from "@/lib/internal/offers"
import type { OfferServiceId } from "@/lib/onboarding/types"
import type { ServiceIcon } from "@/lib/internal/services"

export type OfferPackageTagId = "marketing" | "video" | "tracking" | OfferServiceId

export type OfferPackageTagDef = {
  id: OfferPackageTagId
  label: string
  icon: ServiceIcon
  color: string
}

const MARKETING_TAG: OfferPackageTagDef = {
  id: "marketing",
  label: "Marketing",
  icon: MegaphoneIcon,
  color: "#E4660C",
}

const VIDEO_TAG: OfferPackageTagDef = {
  id: "video",
  label: "Video",
  icon: VideoIcon,
  color: "#7C3AED",
}

const TRACKING_TAG: OfferPackageTagDef = {
  id: "tracking",
  label: "Tracking",
  icon: RadarIcon,
  color: "#0F766E",
}

export function offerPackageTagDef(id: OfferPackageTagId): OfferPackageTagDef {
  if (id === "marketing") return MARKETING_TAG
  if (id === "video") return VIDEO_TAG
  if (id === "tracking") return TRACKING_TAG
  const mark = OFFER_SERVICE_MARKS[id]
  return {
    id,
    label: OFFER_SERVICE_LABELS[id],
    icon: mark.icon,
    color: mark.color,
  }
}

export function offerPackageTagDefs(ids: OfferPackageTagId[]) {
  return ids.map((id) => offerPackageTagDef(id))
}

/** Søg i pakkenavn, leverancer og tags */
export function packageMatchesQuery(
  pkg: { name: string; includes: string[]; tags: OfferPackageTagId[] },
  query: string
) {
  const needle = query.trim().toLocaleLowerCase("da")
  if (!needle) return true
  if (pkg.name.toLocaleLowerCase("da").includes(needle)) return true
  if (pkg.includes.some((line) => line.toLocaleLowerCase("da").includes(needle))) return true
  return pkg.tags.some((id) =>
    offerPackageTagDef(id).label.toLocaleLowerCase("da").includes(needle)
  )
}
