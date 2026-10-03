import { GlobeIcon, ServerIcon, ShoppingBagIcon, UsersIcon } from "lucide-react"

import { GoogleMark, MetaMark, SearchGlass } from "@/lib/internal/service-icons"
import type { ServiceIcon } from "@/lib/internal/services"
import type { OfferServiceId } from "@/lib/onboarding/types"

export const OFFER_SERVICE_MARKS: Record<OfferServiceId, { icon: ServiceIcon; color: string }> = {
  meta: { icon: MetaMark, color: "#1877F2" },
  google: { icon: GoogleMark, color: "#F5B400" },
  hjemmeside: { icon: GlobeIcon, color: "#2563EB" },
  hosting: { icon: ServerIcon, color: "#0F2744" },
  webshop: { icon: ShoppingBagIcon, color: "#1E3A8A" },
  "seo-geo": { icon: SearchGlass, color: "#E4660C" },
  "lead-system": { icon: UsersIcon, color: "#E4660C" },
}
