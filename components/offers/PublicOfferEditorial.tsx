"use client"

import { useState } from "react"

import { OfferEditorialHero } from "@/components/offers/OfferEditorialHero"
import { OfferMarketAnalysisSection } from "@/components/offers/OfferMarketAnalysisSection"
import { OfferMarketingWorkSection } from "@/components/offers/OfferMarketingWorkSection"
import { OfferCenhubLeadSection } from "@/components/offers/OfferCenhubLeadSection"
import { OfferPaidSocialSection } from "@/components/offers/OfferPaidSocialSection"
import { OfferVideoMarketingSection } from "@/components/offers/OfferVideoMarketingSection"
import { OfferPackagePicker } from "@/components/offers/OfferPackagePicker"
import type { OfferPackage } from "@/lib/internal/offer-packages"
import { offerPackageHeroLabel } from "@/lib/internal/offer-package-hero-label"
import { OfferTotalPricingSection } from "@/components/offers/OfferTotalPricingSection"
import {
  publicPackageTierById,
  tierIncludesLeadSystem,
  tierIncludesMarketAnalysis,
  tierIncludesVideoMarketing,
  type PublicPackageTierId,
} from "@/lib/internal/offer-public-package-tiers"
import { OfferPackageStickyBar } from "@/components/offers/OfferPackageStickyBar"
import type { OfferServiceId } from "@/lib/onboarding/types"
import type { OfferStatus } from "@/lib/onboarding/types"

type PublicOfferEditorialProps = {
  slug: string
  companyName: string
  cvr: string
  contactName: string
  packages: OfferPackage[]
  services: OfferServiceId[]
  validUntilLabel: string | null
  status: OfferStatus
  signatureName: string | null
}

function packageHeadline(packages: OfferPackage[]) {
  const primary = packages[0]
  if (!primary) return "MARKETING"
  if (packages.length > 1) return `${primary.name.toUpperCase()} (+ valg)`
  return primary.name.toUpperCase()
}

export function PublicOfferEditorial({
  slug,
  companyName,
  cvr,
  packages,
  services,
  status,
  signatureName,
}: PublicOfferEditorialProps) {
  const headline = packageHeadline(packages)
  const primary = packages[0]
  const packageLine = primary ? offerPackageHeroLabel(primary) : ""
  const [offerStatus, setOfferStatus] = useState(status)
  const [signedName, setSignedName] = useState(signatureName)
  const [selectedPackageId, setSelectedPackageId] = useState<PublicPackageTierId>(() => {
    const initial = primary?.id as PublicPackageTierId | undefined
    if (
      initial === "basisk-marketing" ||
      initial === "marketing-fundament" ||
      initial === "vaekstpakke"
    ) {
      return initial
    }
    return "vaekstpakke"
  })

  const showPackageSticky = offerStatus !== "accepted"
  const selectedTier = publicPackageTierById(selectedPackageId)
  const showMarketAnalysisSection =
    selectedTier !== undefined && tierIncludesMarketAnalysis(selectedTier)
  const showCenhubLeadSection =
    (selectedTier !== undefined && tierIncludesLeadSystem(selectedTier)) ||
    services.includes("lead-system")
  const showVideoMarketingSection =
    selectedTier !== undefined && tierIncludesVideoMarketing(selectedTier)

  function handleOfferAccepted(name: string) {
    setOfferStatus("accepted")
    setSignedName(name)
  }

  return (
    <>
    <div className={showPackageSticky ? "offer-ed offer-ed--has-sticky" : "offer-ed"}>
      <OfferEditorialHero companyName={companyName} cvr={cvr} packageLine={packageLine} />

      <OfferPackagePicker
        initialPackageId={primary?.id}
        selectedId={selectedPackageId}
        onSelect={setSelectedPackageId}
      />

      {showMarketAnalysisSection ? <OfferMarketAnalysisSection /> : null}

      <OfferMarketingWorkSection />

      <OfferPaidSocialSection />

      {showCenhubLeadSection ? <OfferCenhubLeadSection /> : null}

      {showVideoMarketingSection ? <OfferVideoMarketingSection /> : null}

      <OfferTotalPricingSection
        slug={slug}
        status={offerStatus}
        selectedPackageId={selectedPackageId}
        services={services}
        onAccepted={handleOfferAccepted}
      />

      <footer className="site-footer">
        <div className="inner site-footer__row">
          <div>
            <p className="wordmark" style={{ color: "#fff", marginBottom: "0.35rem" }}>
              censio<span className="wordmark__dot">.</span>
            </p>
            <p className="mono" style={{ color: "rgba(255,255,255,0.45)" }}>
              {headline} · {companyName}
            </p>
          </div>
          <a href="https://censio.dk/handelsbetingelser" target="_blank" rel="noopener noreferrer">
            Handelsbetingelser
          </a>
        </div>
      </footer>
    </div>
    {showPackageSticky ? (
      <OfferPackageStickyBar
        selectedId={selectedPackageId}
        status={offerStatus}
        slug={slug}
        onAccepted={handleOfferAccepted}
      />
    ) : null}
    </>
  )
}
