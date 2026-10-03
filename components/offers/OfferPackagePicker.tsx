"use client"

import { Check } from "lucide-react"
import {

  formatTierPriceLabel,
  PUBLIC_PACKAGE_TIER_ORDER,
  PUBLIC_PACKAGE_TIERS,
  tierFirstMonthTotal,
  type PublicPackageTier,
} from "@/lib/internal/offer-public-package-tiers"
import type { PublicPackageTierId } from "@/lib/internal/offer-public-package-tiers"
import type { OfferPackageId } from "@/lib/onboarding/types"

function tierMap() {
  return new Map(PUBLIC_PACKAGE_TIERS.map((tier) => [tier.id, tier]))
}

function hasTextSelection() {
  if (typeof window === "undefined") return false
  const selection = window.getSelection()
  return Boolean(selection && selection.type === "Range" && selection.toString().length > 0)
}

export function OfferPackagePicker({
  selectedId,
  onSelect,
  initialPackageId,
}: {
  selectedId: PublicPackageTierId
  onSelect: (id: PublicPackageTierId) => void
  initialPackageId?: OfferPackageId
}) {
  const tiers = tierMap()

  return (
    <>
    <section className="section section--offwhite offer-pkg-pick" id="vaelg-pakke">
      <div className="inner">
        <h2 className="headline-lg offer-pkg-pick__title">
          Find den pakke der matcher <span className="accent">jeres ambitioner.</span>
        </h2>

        <div className="offer-pkg-pick__table">
          <div className="offer-pkg-pick__table-head">
            <span className="offer-pkg-pick__table-head-spacer" aria-hidden />
            <p className="offer-pkg-pick__badge mono">Anbefalet & Bedste resultater</p>
            <span className="offer-pkg-pick__table-head-spacer" aria-hidden />
          </div>
          <div className="offer-pkg-pick__grid" role="list">
          {PUBLIC_PACKAGE_TIER_ORDER.map((id) => {
            const tier = tiers.get(id)
            if (!tier) return null
            return (
              <PackageTierCard
                key={id}
                tier={tier}
                selected={selectedId === id}
                onSelect={() => onSelect(id)}
              />
            )
          })}
          </div>
          {tiers.get("vaekstpakke")?.titleSubline ? (
            <div className="offer-pkg-pick__table-foot">
              <span className="offer-pkg-pick__table-foot-spacer" aria-hidden />
              <p className="offer-pkg-pick__table-foot-note">{tiers.get("vaekstpakke")!.titleSubline}</p>
              <span className="offer-pkg-pick__table-foot-spacer" aria-hidden />
            </div>
          ) : null}
        </div>
      </div>
    </section>
    </>
  )
}

function PackageTierCard({
  tier,
  selected,
  onSelect,
}: {
  tier: PublicPackageTier
  selected: boolean
  onSelect: () => void
}) {
  const onboardingLabel = formatTierPriceLabel(tier.onboardingFee)
  const monthlyLabel = formatTierPriceLabel(tier.monthlyFee)
  const firstMonthLabel = formatTierPriceLabel(tierFirstMonthTotal(tier))
  const compareFirstMonthLabel =
    tier.featured && tier.compareFirstMonth
      ? formatTierPriceLabel(tier.compareFirstMonth)
      : null
  const savingsLabel =
    tier.featured && tier.savingsAmount != null
      ? formatTierPriceLabel(tier.savingsAmount)
      : null

  return (
    <article
      role="listitem"
      className={[
        "offer-pkg-pick__card",
        `offer-pkg-pick__card--${tier.id}`,
        tier.featured ? "offer-pkg-pick__card--featured" : "",
        selected ? "offer-pkg-pick__card--selected" : "",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      <div
        className="offer-pkg-pick__hit"
        role="button"
        tabIndex={0}
        aria-pressed={selected}
        onClick={() => {
          if (hasTextSelection()) return
          onSelect()
        }}
        onKeyDown={(event) => {
          if (event.key !== "Enter" && event.key !== " ") return
          event.preventDefault()
          onSelect()
        }}
      >
        {tier.featured && tier.discountLabel ? (
          <span className="offer-pkg-pick__fold" aria-hidden>
            <span className="offer-pkg-pick__fold-flap">
              <span className="offer-pkg-pick__fold-text" aria-hidden>
                <span className="offer-pkg-pick__fold-pct">{tier.discountLabel.replace(/\s*rabat\s*$/i, "").trim()}</span>
                <span className="offer-pkg-pick__fold-word">Rabat</span>
              </span>
            </span>
          </span>
        ) : null}

        <h3 className="offer-pkg-pick__name">{tier.title}</h3>

        {tier.featured && savingsLabel && compareFirstMonthLabel ? (
          <div className="offer-pkg-pick__pricing offer-pkg-pick__pricing--featured">
            <p className="offer-pkg-pick__save">
              Spar {savingsLabel} kr på din marketing opstart.
            </p>
            <p className="offer-pkg-pick__opstart-prices">
              <s className="offer-pkg-pick__opstart-compare">{compareFirstMonthLabel} kr</s>
              <span className="offer-pkg-pick__opstart-now">{onboardingLabel} kr</span>
            </p>
            <p className="offer-pkg-pick__price offer-pkg-pick__price--monthly">
              <span className="offer-pkg-pick__price-value">{monthlyLabel}</span>
              <span className="offer-pkg-pick__price-unit"> kr pr. måned</span>
            </p>
            <p className="offer-pkg-pick__first-month">
              <span className="offer-pkg-pick__first-month-label">Første måned:</span>{" "}
              <span className="offer-pkg-pick__first-month-value">{firstMonthLabel} kr</span>
            </p>
          </div>
        ) : (
          <>
            <p className="offer-pkg-pick__onboarding">
              {onboardingLabel} kr i onboarding
            </p>

            <p className="offer-pkg-pick__price">
              <span className="offer-pkg-pick__price-value">{monthlyLabel}</span>
              <span className="offer-pkg-pick__price-unit"> kr./md.</span>
            </p>

            <p className="offer-pkg-pick__first-month">
              <span className="offer-pkg-pick__first-month-label">Første måned:</span>{" "}
              <span className="offer-pkg-pick__first-month-value">{firstMonthLabel} kr</span>
            </p>
          </>
        )}

        <ul className="offer-pkg-pick__features">
          {tier.steps.map((step) => (
            <li key={step}>
              <Check className="offer-pkg-pick__check" strokeWidth={2.25} aria-hidden />
              <span>{step}</span>
            </li>
          ))}
        </ul>

        <div className="offer-pkg-pick__results">
          <p className="offer-pkg-pick__results-head">
            <span className="offer-pkg-pick__results-label">Forventet resultater:</span>
            <span className="offer-pkg-pick__results-range">{tier.expectedResultsRange}</span>
          </p>
          {tier.expectedResultsNote ? (
            <p className="offer-pkg-pick__results-note">{tier.expectedResultsNote}</p>
          ) : null}
          {tier.expectedResultsSubnote ? (
            <p className="offer-pkg-pick__results-subnote">{tier.expectedResultsSubnote}</p>
          ) : null}
        </div>

        <span
          className={
            selected
              ? "offer-pkg-pick__foot offer-pkg-pick__foot--selected mono"
              : "offer-pkg-pick__foot mono"
          }
        >
          {selected ? (
            <>
              <Check className="offer-pkg-pick__foot-icon" strokeWidth={2.5} aria-hidden />
              Valgt
            </>
          ) : (
            "Vælg pakke"
          )}
        </span>
      </div>
    </article>
  )
}
