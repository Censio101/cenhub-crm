import type { OfferPackage } from "@/lib/internal/offer-packages"

/** Hero-linje med pakkenavn uden kanal-suffiks (Meta, Video osv.) */
export function offerPackageHeroLabel(pkg: OfferPackage): string {
  if (pkg.id === "vaekstpakke") return "Vækstpakke med video"
  return pkg.name.replace(/\s*,\s*[\d.]+$/, "").trim()
}
