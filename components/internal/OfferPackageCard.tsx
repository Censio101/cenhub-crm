import { OfferPackageTagStrip } from "@/components/internal/OfferPackageTagStrip"
import type { OfferPackage } from "@/lib/internal/offer-packages"
import { formatCurrencyDKK } from "@/lib/performance/format"

export function OfferPackageCard({
  pkg,
  selected,
  onToggle,
}: {
  pkg: OfferPackage
  selected: boolean
  onToggle: () => void
}) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      onClick={onToggle}
      className={`grid w-full gap-3 rounded-[15px] border p-4 text-left transition-colors ${
        selected
          ? "border-[#E4660C] bg-[#E4660C]/5 ring-1 ring-[#E4660C]/25"
          : pkg.recommended
            ? "border-[#E4660C]/35 bg-white hover:border-[#E4660C]/55"
            : "border-border bg-white hover:border-[#141414]/20"
      }`}
    >
      <span className="flex items-start justify-between gap-3">
        <span className="min-w-0">
          {pkg.recommended ? (
            <span className="mb-1 inline-block text-xs font-medium text-[#E4660C]">Anbefalet</span>
          ) : null}
          <span className="block text-base font-medium text-[var(--text-primary)]">{pkg.name}</span>
        </span>
      </span>

      <OfferPackageTagStrip tags={pkg.tags} />

      <div className="grid gap-1 rounded-[12px] bg-[#141414]/[0.03] px-3 py-2.5 text-sm">
        <p className="flex flex-wrap items-baseline justify-between gap-2">
          <span className="text-[var(--text-secondary)]">Opstart</span>
          <span className="font-medium tabular-nums text-[var(--text-primary)]">
            {formatCurrencyDKK(pkg.price)}
          </span>
        </p>
        {pkg.monthlyRetainer != null ? (
          <p className="flex flex-wrap items-baseline justify-between gap-2">
            <span className="text-[var(--text-secondary)]">
              {pkg.monthlyRetainerLabel ?? "Retainer pr. md."}
            </span>
            <span className="font-medium tabular-nums text-[var(--text-primary)]">
              {formatCurrencyDKK(pkg.monthlyRetainer)}
            </span>
          </p>
        ) : null}
        {pkg.expectedAdSpend ? (
          <p className="pt-1 text-xs leading-snug text-[var(--text-secondary)]">
            Forventet annoncespend: {pkg.expectedAdSpend} (betales direkte til Meta)
          </p>
        ) : null}
      </div>

      <ul className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-sm text-[var(--text-secondary)]">
        {pkg.includes.map((item) => (
          <li key={item} className="flex min-w-0 gap-1.5">
            <span className="shrink-0 text-[#E4660C]" aria-hidden>
              ·
            </span>
            <span className="min-w-0 leading-snug">{item}</span>
          </li>
        ))}
      </ul>
    </button>
  )
}
