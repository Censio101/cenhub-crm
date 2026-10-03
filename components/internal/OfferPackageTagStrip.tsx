import { offerPackageTagDef, type OfferPackageTagId } from "@/lib/internal/offer-package-tags"

export function OfferPackageTagStrip({ tags }: { tags: OfferPackageTagId[] }) {
  if (tags.length === 0) return null
  return (
    <div className="flex flex-wrap gap-2">
      {tags.map((id) => {
        const tag = offerPackageTagDef(id)
        const Icon = tag.icon
        return (
          <span
            key={id}
            className="inline-flex w-[4.25rem] flex-col items-center gap-0.5 text-center"
            title={tag.label}
          >
            <Icon className="size-5 shrink-0" style={{ color: tag.color }} aria-hidden />
            <span className="text-[10px] leading-tight font-medium text-[var(--text-secondary)]">
              {tag.label}
            </span>
          </span>
        )
      })}
    </div>
  )
}
