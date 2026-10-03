import { OFFER_SERVICE_LABELS } from "@/lib/internal/offers"
import { OFFER_SERVICE_MARKS } from "@/lib/internal/offer-service-marks"
import { offerContentTagIds } from "@/lib/internal/offer-admin"
import type { Offer } from "@/lib/onboarding/types"

export function OfferContentTags({ offer }: { offer: Pick<Offer, "packages" | "services"> }) {
  const tagIds = offerContentTagIds(offer)

  return (
    <div className="flex flex-wrap items-start gap-3">
      {tagIds.map((id) => {
        const mark = OFFER_SERVICE_MARKS[id]
        const Icon = mark.icon
        return (
          <span key={id} className="inline-flex w-[4.25rem] flex-col items-center gap-1 text-center">
            <Icon className="size-5 shrink-0" style={{ color: mark.color }} aria-hidden />
            <span className="text-[10px] leading-tight font-medium text-[var(--text-secondary)]">
              {OFFER_SERVICE_LABELS[id]}
            </span>
          </span>
        )
      })}
    </div>
  )
}
