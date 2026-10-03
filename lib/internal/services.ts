import type { CSSProperties } from "react"
import {
  ClapperboardIcon,
  GlobeIcon,
  HeadsetIcon,
  ServerIcon,
  ShoppingBagIcon,
} from "lucide-react"

import { GoogleMark, MetaMark, SearchGlass } from "@/lib/internal/service-icons"
import type { CommercialLine } from "@/lib/onboarding/types"

export type ServiceIcon = (props: {
  className?: string
  style?: CSSProperties
  "aria-hidden"?: boolean | "true"
}) => React.ReactNode

export type ServiceId =
  | "meta"
  | "google"
  | "video"
  | "seo"
  | "geo"
  | "hjemmeside"
  | "webshop"
  | "hosting"
  | "support"

export type CensioService = {
  id: ServiceId
  label: string
  color: string
  icon: ServiceIcon
}

export const CENSIO_SERVICES: CensioService[] = [
  { id: "meta", label: "Meta", color: "#1877F2", icon: MetaMark },
  { id: "google", label: "Google ads", color: "#F5B400", icon: GoogleMark },
  { id: "video", label: "Video", color: "#7C3AED", icon: ClapperboardIcon },
  { id: "seo", label: "SEO", color: "#E4660C", icon: SearchGlass },
  { id: "geo", label: "GEO", color: "#EAB308", icon: SearchGlass },
  { id: "hjemmeside", label: "Hjemmeside", color: "#2563EB", icon: GlobeIcon },
  { id: "webshop", label: "Webshop", color: "#1E3A8A", icon: ShoppingBagIcon },
  { id: "hosting", label: "Hosting", color: "#0F2744", icon: ServerIcon },
  { id: "support", label: "Support", color: "#64748B", icon: HeadsetIcon },
]

export function serviceById(id: ServiceId) {
  return CENSIO_SERVICES.find((service) => service.id === id) ?? CENSIO_SERVICES[0]
}

export function lineMatchesService(line: CommercialLine, id: ServiceId) {
  const name = line.name.toLowerCase()
  if (id === "meta") return name.includes("meta")
  if (id === "google") return name.includes("google")
  if (id === "video") return name.includes("video")
  if (id === "seo") return line.category === "seo"
  if (id === "geo") return line.category === "geo"
  if (id === "hjemmeside") return name.includes("hjemmeside") || line.category === "website"
  if (id === "webshop") return name.includes("webshop")
  if (id === "hosting") {
    return line.category === "hosting" && !name.includes("webshop") && !name.includes("hjemmeside")
  }
  return line.category === "support"
}
