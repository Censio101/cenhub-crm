"use client"

import { useEffect, useState } from "react"
import { createPortal } from "react-dom"

import { OfferAcceptDialog } from "@/components/offers/OfferAcceptDialog"
import {
  formatTierPriceLabel,
  PUBLIC_TIER_META_ADS_SPEND_LABEL,
  publicPackageTierById,
  publicTierOpstartLabel,
  tierFirstMonthTotal,
  type PublicPackageTierId,
} from "@/lib/internal/offer-public-package-tiers"
import type { OfferStatus } from "@/lib/onboarding/types"

const STICKY_LEADS_LABEL = "Første kundehenvendelser: 2-4 uger efter underskrift"

type OfferPackageStickyBarProps = {
  selectedId: PublicPackageTierId
  status: OfferStatus
  slug: string
  onAccepted?: (signatureName: string) => void
}

export function OfferPackageStickyBar({
  selectedId,
  status,
  slug,
  onAccepted,
}: OfferPackageStickyBarProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  if (status === "accepted") return null

  const tier = publicPackageTierById(selectedId)
  if (!tier) return null

  const monthlyLabel = formatTierPriceLabel(tier.monthlyFee)
  const firstMonthLabel = formatTierPriceLabel(tierFirstMonthTotal(tier))
  const opstartLabel = publicTierOpstartLabel(tier)

  const bar = (
    <div className="offer-pkg-sticky" role="region" aria-label="Valgt pakke" key={selectedId}>
      <div className="offer-pkg-sticky__inner">
        <div className="offer-pkg-sticky__product">
          <p className="offer-pkg-sticky__name">{tier.title}</p>
          <p className="offer-pkg-sticky__facts">
            <span>{opstartLabel}</span>
            <span className="offer-pkg-sticky__facts-sep" aria-hidden>
              ·
            </span>
            <span>{STICKY_LEADS_LABEL}</span>
          </p>
        </div>

        <div className="offer-pkg-sticky__pricing">
          <p className="offer-pkg-sticky__price-line">
            <span className="offer-pkg-sticky__price-lead">
              Første måned: {firstMonthLabel} kr
            </span>
            <span className="offer-pkg-sticky__price-follow">
              - herefter {monthlyLabel} kr pr md.
            </span>
          </p>
          <p className="offer-pkg-sticky__meta-spend">{PUBLIC_TIER_META_ADS_SPEND_LABEL}</p>
        </div>

        <button
          type="button"
          className="offer-pkg-sticky__cta"
          onClick={() => setDialogOpen(true)}
          disabled={status === "draft"}
          title={status === "draft" ? "Tilbuddet skal være sendt før accept" : undefined}
        >
          <span className="offer-pkg-sticky__cta-text offer-pkg-sticky__cta-text--long">
            Accepter vækstpartner-samarbejde
          </span>
          <span className="offer-pkg-sticky__cta-text offer-pkg-sticky__cta-text--short">
            Acceptér samarbejde
          </span>
        </button>
      </div>
    </div>
  )

  return (
    <>
      {mounted ? createPortal(bar, document.body) : null}
      <OfferAcceptDialog
        slug={slug}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        packageTitle={tier.title}
        onAccepted={onAccepted}
      />
    </>
  )
}
