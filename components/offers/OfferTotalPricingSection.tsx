"use client"

import { useState } from "react"

import { OfferAcceptDialog } from "@/components/offers/OfferAcceptDialog"
import { EDITORIAL_TOTAL_PRICING } from "@/lib/internal/offer-editorial-content"
import { buildEditorialPricingSummary } from "@/lib/internal/offer-editorial-pricing"
import { formatInteger } from "@/lib/performance/format"
import type { PublicPackageTierId } from "@/lib/internal/offer-public-package-tiers"
import type { OfferServiceId, OfferStatus } from "@/lib/onboarding/types"

type OfferTotalPricingSectionProps = {
  slug: string
  status: OfferStatus
  selectedPackageId: PublicPackageTierId
  services: OfferServiceId[]
  onAccepted?: (signatureName: string) => void
}

function formatPriceTotal(amount: number) {
  return `${formatInteger(amount)} kr.`
}

export function OfferTotalPricingSection({
  slug,
  status,
  selectedPackageId,
  services,
  onAccepted,
}: OfferTotalPricingSectionProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const pricing = buildEditorialPricingSummary(selectedPackageId, services)

  if (!pricing) return null

  const showAccept = status !== "accepted" && status !== "draft"
  const { title, establishmentTotalLabel, subscriptionTotalLabel, acceptLabel } = EDITORIAL_TOTAL_PRICING

  return (
    <section className="section section--white offer-total-pricing" id="priser">
      <div className="inner">
        <div className="offer-total-pricing__board">
          <div className="offer-total-pricing__col offer-total-pricing__col--establishment">
            <h2 className="offer-total-pricing__title">{title}</h2>
            <h3 className="offer-total-pricing__col-title">Etablering</h3>
            <ul className="offer-total-pricing__lines">
              {pricing.establishmentLines.map((line) => (
                <li key={line.label}>
                  <span className="offer-total-pricing__line-label">{line.label}</span>
                  <span className="offer-total-pricing__line-value">
                    {line.compareAmount != null ? (
                      <>
                        <span className="offer-total-pricing__compare">
                          {formatInteger(line.compareAmount)}
                        </span>
                        <strong>{formatInteger(line.amount)}</strong>
                      </>
                    ) : (
                      formatInteger(line.amount)
                    )}
                  </span>
                </li>
              ))}
            </ul>
            <footer className="offer-total-pricing__footer">
              <div className="offer-total-pricing__footer-row">
                <div className="offer-total-pricing__footer-copy">
                  <p className="offer-total-pricing__footer-label">{establishmentTotalLabel}</p>
                  <p className="offer-total-pricing__footer-note">Alle priser er ekskl. moms</p>
                </div>
                <p className="offer-total-pricing__footer-price">
                  {pricing.establishmentCompareTotal != null ? (
                    <>
                      <span className="offer-total-pricing__compare">
                        {formatPriceTotal(pricing.establishmentCompareTotal)}
                      </span>
                      <strong>{formatPriceTotal(pricing.establishmentTotal)}</strong>
                    </>
                  ) : (
                    <strong>{formatPriceTotal(pricing.establishmentTotal)}</strong>
                  )}
                </p>
              </div>
            </footer>
          </div>

          <div className="offer-total-pricing__col offer-total-pricing__col--subscription">
            <h3 className="offer-total-pricing__col-title offer-total-pricing__col-title--pair">
              Abonnement
            </h3>
            <ul className="offer-total-pricing__lines">
              {pricing.subscriptionLines.map((line) => (
                <li key={line.label}>
                  <span className="offer-total-pricing__line-label">{line.label}</span>
                  <span className="offer-total-pricing__line-value">{formatInteger(line.amount)}</span>
                </li>
              ))}
              <li>
                <span className="offer-total-pricing__line-label">{pricing.metaSpendLabel}</span>
                <span className="offer-total-pricing__line-value offer-total-pricing__line-value--range">
                  {pricing.metaSpendRange}
                </span>
              </li>
            </ul>
            <footer className="offer-total-pricing__footer">
              <div className="offer-total-pricing__footer-row">
                <div className="offer-total-pricing__footer-copy">
                  <p className="offer-total-pricing__footer-label">{subscriptionTotalLabel}</p>
                  <p className="offer-total-pricing__footer-note">Alle priser er ekskl. moms</p>
                </div>
                <p className="offer-total-pricing__footer-price">
                  <strong>{formatPriceTotal(pricing.subscriptionTotal)} pr md.</strong>
                </p>
              </div>
            </footer>
          </div>
        </div>

        {showAccept ? (
          <div className="offer-total-pricing__actions">
            <button
              type="button"
              className="offer-total-pricing__accept btn-primary"
              onClick={() => setDialogOpen(true)}
            >
              {acceptLabel}
            </button>
          </div>
        ) : status === "accepted" ? (
          <p className="offer-total-pricing__accepted">Tilbuddet er accepteret.</p>
        ) : null}

        <OfferAcceptDialog
          slug={slug}
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          packageTitle={pricing.packageTitle}
          onAccepted={onAccepted}
        />
      </div>
    </section>
  )
}
