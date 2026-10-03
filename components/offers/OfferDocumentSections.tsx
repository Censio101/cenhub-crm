import type { ReactNode } from "react"
import { CheckIcon, ShieldCheckIcon } from "lucide-react"

import type { OfferPackage } from "@/lib/internal/offer-packages"
import {
  CENSIO_COMPANY_FOOTER,
  HANDELSBETINGELSER_INTRO,
  HANDELSBETINGELSER_SECTIONS,
} from "@/lib/internal/offer-handelsbetingelser"
import {
  OFFER_COVER_STATS,
  OFFER_NO_BINDING,
  buildProjectContractSections,
  type OfferDocumentPhase,
  projectOverview,
} from "@/lib/internal/offer-document"
import type { OfferPackageId, OfferServiceId } from "@/lib/onboarding/types"
import { formatCurrencyDKK } from "@/lib/performance/format"

export function OfferCover({
  companyName,
  contactName,
}: {
  companyName: string
  contactName: string
}) {
  return (
    <section className="relative min-h-[min(92vh,820px)] overflow-hidden bg-[#0a0a0a] px-[5%] pb-16 pt-10 text-white sm:pb-20 sm:pt-14">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_70%_20%,rgba(228,102,12,0.35),transparent_55%)]"
        aria-hidden
      />
      <div className="relative mx-auto flex max-w-6xl flex-col justify-end">
        <p className="text-xs font-medium tracking-[0.22em] text-white/45 uppercase">Performancebureau</p>
        <p className="mt-2 text-sm tracking-wide text-white/70">Vores fokus er din vækst</p>

        <ul className="mt-10 grid gap-3 sm:grid-cols-3">
          {OFFER_COVER_STATS.map((stat) => (
            <li
              key={stat.label}
              className="rounded-2xl border border-white/10 bg-white/[0.06] px-5 py-4 backdrop-blur-sm"
            >
              <p className="text-2xl font-medium text-[#E4660C]">{stat.value}</p>
              <p className="mt-1 text-xs leading-snug text-white/60">{stat.label}</p>
            </li>
          ))}
        </ul>

        <h1 className="mt-12 max-w-4xl text-[clamp(2rem,5vw,3.5rem)] font-medium leading-[1.06] tracking-tight">
          Vi skaber jer digital vækst i jeres forretning
        </h1>
        <p className="mt-5 text-sm text-white/50">Censio vækstpartner</p>
        <p className="mt-1 text-3xl font-medium text-[#E4660C] sm:text-4xl">{companyName}</p>
        <p className="mt-8 max-w-xl text-sm leading-relaxed text-white/65 sm:text-base">
          Tilbud til {contactName}. Scroll ned for faser, priser og vilkår, samme overblik som i vores projekt-PDF,
          bare nemmere at læse på mobil og desktop.
        </p>
      </div>
    </section>
  )
}

export function OfferNoBindingBanner() {
  return (
    <section className="border-y border-[#E4660C]/25 bg-[#fff1e6] px-[5%] py-8 sm:py-10">
      <div className="mx-auto flex max-w-6xl flex-col gap-4 sm:flex-row sm:items-center sm:gap-8">
        <div className="flex size-14 shrink-0 items-center justify-center rounded-2xl bg-[#E4660C]/15 text-[#E4660C]">
          <ShieldCheckIcon className="size-7" strokeWidth={1.75} aria-hidden />
        </div>
        <div>
          <p className="text-xs font-medium tracking-[0.16em] text-[#833b08] uppercase">Opsigelse</p>
          <p className="mt-1 text-xl font-medium tracking-tight text-[#141414] sm:text-2xl">{OFFER_NO_BINDING}</p>
          <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[#6b6560]">
            I er ikke låst fast. Samarbejdet bygger på resultater, og I kan træde ud med den notice, der står i
            kontrakten nedenfor.
          </p>
        </div>
      </div>
    </section>
  )
}

function ProcessRail({ steps }: { steps: string[] }) {
  return (
    <div className="mt-8 rounded-2xl border border-[#141414]/8 bg-[#0a0a0a] p-5 text-white sm:p-6">
      <p className="text-xs font-medium tracking-[0.14em] text-white/45 uppercase">Processen</p>
      <ol className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {steps.map((step, index) => (
          <li key={step} className="flex items-start gap-3 rounded-xl bg-white/5 px-3 py-2.5 text-sm">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-full bg-[#E4660C] text-xs font-medium text-white">
              {index + 1}
            </span>
            <span className="leading-snug text-white/85">{step}</span>
          </li>
        ))}
      </ol>
    </div>
  )
}

function FeatureGrid({ features }: { features: NonNullable<OfferDocumentPhase["features"]> }) {
  return (
    <ul className="mt-8 grid gap-4 sm:grid-cols-2">
      {features.map((feature) => (
        <li
          key={feature.title}
          className="rounded-2xl border border-[#141414]/8 bg-white p-5 shadow-[0_8px_30px_rgba(20,20,20,0.04)]"
        >
          <h3 className="text-base font-medium">{feature.title}</h3>
          <p className="mt-2 text-sm leading-relaxed text-[#6b6560]">{feature.body}</p>
          {feature.note ? (
            <p className="mt-3 inline-block rounded-full bg-[#E4660C]/10 px-2.5 py-0.5 text-xs font-medium text-[#E4660C]">
              {feature.note}
            </p>
          ) : null}
        </li>
      ))}
    </ul>
  )
}

export function OfferPhaseSection({
  phase,
  packageHint,
  index,
}: {
  phase: OfferDocumentPhase
  packageHint?: string
  index: number
}) {
  const light = index % 2 === 0

  return (
    <section className={`px-[5%] py-14 sm:py-16 ${light ? "bg-[#f7f7f5]" : "bg-white"}`}>
      <div className="relative mx-auto max-w-6xl">
        {phase.label ? (
          <p
            className="pointer-events-none absolute -top-6 right-0 select-none text-[clamp(4rem,14vw,9rem)] font-medium leading-none text-[#141414]/[0.04]"
            aria-hidden
          >
            {phase.label.replace(/\D/g, "") || "·"}
          </p>
        ) : null}
        <div className="relative flex flex-wrap items-center gap-3">
          {phase.label ? (
            <p className="text-xs font-medium tracking-[0.2em] text-[#E4660C] uppercase">{phase.label}</p>
          ) : null}
          {packageHint ? (
            <span className="rounded-full bg-[#E4660C]/10 px-2.5 py-0.5 text-xs font-medium text-[#E4660C]">
              {packageHint}
            </span>
          ) : null}
        </div>
        <h2 className="mt-3 max-w-2xl text-2xl font-medium tracking-tight sm:text-[2rem]">{phase.title}</h2>
        <p className="mt-4 max-w-3xl text-base leading-relaxed text-[#6b6560]">{phase.intro}</p>
        {phase.processSteps ? <ProcessRail steps={phase.processSteps} /> : null}
        {phase.features ? <FeatureGrid features={phase.features} /> : null}
      </div>
    </section>
  )
}

export function OfferPackageSummary({
  packages,
  showComparison,
}: {
  packages: OfferPackage[]
  showComparison: boolean
}) {
  if (!showComparison && packages.length === 1) {
    const pkg = packages[0]
    return (
      <section className="bg-white px-[5%] py-10 sm:py-12">
        <div className="mx-auto max-w-6xl rounded-3xl border border-[#141414]/10 bg-[#f7f7f5] p-8">
          <p className="text-xs tracking-[0.16em] text-[#E4660C] uppercase">Jeres pakke</p>
          <div className="mt-3 flex flex-wrap items-end justify-between gap-4">
            <h2 className="text-2xl font-medium">{pkg.name}</h2>
            <p className="text-3xl font-medium tabular-nums text-[#E4660C]">{formatCurrencyDKK(pkg.price)}</p>
          </div>
          <p className="mt-1 text-xs text-[#6b6560]">Etablering ekskl. moms · detaljer i prisoverblikket nederst</p>
          <ul className="mt-6 grid gap-2 sm:grid-cols-2">
            {pkg.includes.map((item) => (
              <li key={item} className="flex gap-2 text-sm">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-[#E4660C]" strokeWidth={2.5} aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>
    )
  }

  return (
    <section className="bg-white px-[5%] py-10 sm:py-12">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs tracking-[0.16em] text-[#E4660C] uppercase">Pakkevalg</p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl">Vi anbefaler Vækstpakken</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#6b6560]">
          Begge valg følger samme faser nedenfor. Forskellen er video, tracking og etableringspris, se total i bunden.
        </p>
        <div className="mt-8 grid gap-6 lg:grid-cols-2">
          {[...packages]
            .sort((a, b) => (a.recommended === b.recommended ? 0 : a.recommended ? -1 : 1))
            .map((pkg) => (
              <article
                key={pkg.id}
                className={`rounded-3xl p-7 sm:p-8 ${
                  pkg.recommended
                    ? "bg-[#0a0a0a] text-white shadow-[0_20px_60px_rgba(0,0,0,0.25)] ring-2 ring-[#E4660C]"
                    : "border border-[#141414]/10 bg-[#f7f7f5]"
                }`}
              >
                {pkg.recommended ? (
                  <span className="inline-block rounded-full bg-[#E4660C] px-3 py-1 text-xs font-medium">Anbefalet</span>
                ) : (
                  <span className="inline-block rounded-full bg-[#141414]/10 px-3 py-1 text-xs font-medium text-[#6b6560]">
                    Alternativ
                  </span>
                )}
                <h3 className="mt-4 text-xl font-medium">{pkg.name}</h3>
                <p className={`mt-2 text-3xl font-medium tabular-nums ${pkg.recommended ? "text-[#E4660C]" : ""}`}>
                  {formatCurrencyDKK(pkg.price)}
                </p>
                <p className={`mt-1 text-xs ${pkg.recommended ? "text-white/50" : "text-[#6b6560]"}`}>
                  Marketing etablering ekskl. moms
                </p>
                <ul className="mt-6 space-y-2.5">
                  {pkg.includes.map((item) => (
                    <li key={item} className="flex gap-2 text-sm">
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-[#E4660C]" strokeWidth={2.5} aria-hidden />
                      <span className={pkg.recommended ? "text-white/90" : undefined}>{item}</span>
                    </li>
                  ))}
                </ul>
              </article>
            ))}
        </div>
      </div>
    </section>
  )
}

function EstablishmentBreakdown({
  lines,
  total,
}: {
  lines: { label: string; amount: number }[]
  total: number
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-[#141414]/10 bg-white">
      <div className="border-b border-[#141414]/8 bg-[#f7f7f5] px-5 py-3">
        <h4 className="text-sm font-medium">Etablering</h4>
        <p className="text-xs text-[#6b6560]">Alle priser ekskl. moms</p>
      </div>
      <ul className="divide-y divide-[#141414]/8 px-5">
        {lines.map((line) => (
          <li key={line.label} className="flex items-center justify-between gap-4 py-3.5 text-sm">
            <span>{line.label}</span>
            <span className="tabular-nums font-medium">{formatCurrencyDKK(line.amount)}</span>
          </li>
        ))}
      </ul>
      <div className="flex items-center justify-between gap-4 border-t border-[#141414]/10 bg-[#fff1e6]/50 px-5 py-4">
        <span className="font-medium">Etablering i alt</span>
        <span className="text-lg font-medium tabular-nums text-[#E4660C]">{formatCurrencyDKK(total)}</span>
      </div>
    </div>
  )
}

export function OfferPricingSection({
  packages,
  services,
  validUntilLabel,
}: {
  packages: OfferPackage[]
  services: OfferServiceId[]
  validUntilLabel: string | null
}) {
  const sorted = [...packages].sort((a, b) => (a.recommended === b.recommended ? 0 : a.recommended ? -1 : 1))

  return (
    <section className="bg-[#0a0a0a] px-[5%] py-14 text-white sm:py-16">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs tracking-[0.16em] text-[#E4660C] uppercase">Priser</p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl">Overslag på projekt</h2>
        {validUntilLabel ? (
          <p className="mt-2 text-sm text-white/55">Tilbuddet er gældende til {validUntilLabel}</p>
        ) : null}

        <div className={`mt-10 grid gap-8 ${sorted.length > 1 ? "lg:grid-cols-2" : ""}`}>
          {sorted.map((pkg) => {
            const overview = projectOverview(pkg, services)
            return (
              <div key={pkg.id} className="space-y-4">
                <p className="text-sm font-medium text-[#E4660C]">{pkg.name}</p>
                <EstablishmentBreakdown lines={overview.establishmentLines} total={overview.establishmentTotal} />
                <div className="overflow-hidden rounded-2xl border border-white/10 bg-white/5">
                  <div className="border-b border-white/10 px-5 py-3">
                    <h4 className="text-sm font-medium">Abonnement</h4>
                    <p className="text-xs text-white/50">Alle priser ekskl. moms</p>
                  </div>
                  <ul className="divide-y divide-white/10 px-5">
                    {overview.subscriptionLines.map((line) => (
                      <li key={line.label} className="flex justify-between gap-4 py-3.5 text-sm">
                        <span className="text-white/85">{line.label}</span>
                        <span className="tabular-nums font-medium">{formatCurrencyDKK(line.amount)}</span>
                      </li>
                    ))}
                  </ul>
                  <div className="flex justify-between gap-4 border-t border-white/10 px-5 py-4">
                    <span className="font-medium">Abonnement pr. md.</span>
                    <span className="text-lg font-medium tabular-nums text-[#E4660C]">
                      {formatCurrencyDKK(overview.subscriptionTotal)}
                    </span>
                  </div>
                </div>
                {overview.metaSpendNote ? (
                  <p className="text-xs leading-relaxed text-white/45">{overview.metaSpendNote}</p>
                ) : null}
              </div>
            )
          })}
        </div>
      </div>
    </section>
  )
}

export function OfferTotalOverviewSection({
  packages,
  services,
}: {
  packages: OfferPackage[]
  services: OfferServiceId[]
}) {
  const sorted = [...packages].sort((a, b) => (a.recommended === b.recommended ? 0 : a.recommended ? -1 : 1))
  const primary = sorted[0]

  return (
    <section id="overblik" className="scroll-mt-24 bg-white px-[5%] py-14 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs tracking-[0.16em] text-[#E4660C] uppercase">Total overblik</p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl">Det I betaler, samlet</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#6b6560]">
          Én etablering for at komme i gang. Et fast månedligt samarbejde til Censio. Meta spend betaler I selv
          direkte til Meta.
        </p>

        <div className={`mt-10 grid gap-6 ${sorted.length > 1 ? "lg:grid-cols-2" : "max-w-xl"}`}>
          {sorted.map((pkg) => {
            const o = projectOverview(pkg, services)
            return (
              <article
                key={pkg.id}
                className={`rounded-3xl p-6 sm:p-8 ${
                  pkg.recommended
                    ? "bg-[#0a0a0a] text-white ring-2 ring-[#E4660C]"
                    : "border border-[#141414]/10 bg-[#f7f7f5]"
                }`}
              >
                <p className={`text-sm font-medium ${pkg.recommended ? "text-[#E4660C]" : "text-[#6b6560]"}`}>
                  {pkg.name}
                  {pkg.recommended ? " · anbefalet" : ""}
                </p>
                <dl className="mt-6 space-y-4">
                  <div className="flex items-end justify-between gap-4 border-b border-current/10 pb-4">
                    <dt className="text-sm opacity-80">Etablering (ekskl. moms)</dt>
                    <dd className="text-2xl font-medium tabular-nums">{formatCurrencyDKK(o.establishmentTotal)}</dd>
                  </div>
                  <div className="flex items-end justify-between gap-4 border-b border-current/10 pb-4">
                    <dt className="text-sm opacity-80">Abonnement pr. md. (ekskl. moms)</dt>
                    <dd className="text-2xl font-medium tabular-nums">{formatCurrencyDKK(o.subscriptionTotal)}</dd>
                  </div>
                  <div className="flex items-start justify-between gap-4">
                    <dt className="text-sm opacity-80">Forventet Meta spend</dt>
                    <dd className="text-right text-sm font-medium opacity-90">Ca. 5.000–10.000 kr./md.</dd>
                  </div>
                </dl>
              </article>
            )
          })}
        </div>

        {sorted.length > 1 && primary ? (
          <p className="mt-6 text-center text-sm text-[#6b6560]">
            Vi anbefaler <span className="font-medium text-[#141414]">{primary.name}</span>, den giver video og
            server-side tracking med i etableringen.
          </p>
        ) : null}
      </div>
    </section>
  )
}

export function OfferTermsSection({
  services,
  includesVideo,
}: {
  services: OfferServiceId[]
  includesVideo: boolean
}) {
  const contract = buildProjectContractSections({ services, includesVideo })

  return (
    <section id="vilkaar" className="scroll-mt-24 border-t border-[#141414]/8 bg-[#f7f7f5] px-[5%] py-14 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs tracking-[0.16em] text-[#E4660C] uppercase">Kontrakt & vilkår</p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl">Aftale for dette tilbud</h2>
        <p className="mt-2 max-w-3xl text-sm text-[#6b6560]">
          Det samme indhold som i jeres projekt-PDF, inkl. opsigelse og fulde handelsbetingelser.
        </p>

        <div className="mt-8 rounded-3xl border-2 border-[#E4660C]/30 bg-white p-6 sm:p-8">
          <p className="text-xs font-medium tracking-[0.14em] text-[#E4660C] uppercase">Opsigelse</p>
          <p className="mt-2 text-lg font-medium leading-snug sm:text-xl">{OFFER_NO_BINDING}</p>
          <ul className="mt-4 space-y-3">
            {contract.cancellation.map((term) => (
              <li key={term} className="flex gap-2 text-sm leading-relaxed text-[#6b6560]">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-[#E4660C]" strokeWidth={2.5} aria-hidden />
                {term}
              </li>
            ))}
          </ul>
        </div>

        <div className="mt-8 rounded-3xl border border-[#141414]/10 bg-white p-6 sm:p-8">
          <h3 className="text-lg font-medium">Igangsættelse og kundens ansvar</h3>
          <ul className="mt-4 space-y-3">
            {contract.start.map((term) => (
              <li key={term} className="flex gap-3 text-sm leading-relaxed text-[#6b6560]">
                <CheckIcon className="mt-0.5 size-4 shrink-0 text-[#E4660C]" strokeWidth={2.5} aria-hidden />
                {term}
              </li>
            ))}
          </ul>
        </div>

        <ul className="mt-6 space-y-3">
          {contract.validity.map((term) => (
            <li key={term} className="flex gap-3 text-sm leading-relaxed text-[#6b6560]">
              <CheckIcon className="mt-0.5 size-4 shrink-0 text-[#E4660C]" strokeWidth={2.5} aria-hidden />
              {term}
            </li>
          ))}
          <li className="flex gap-3 text-sm leading-relaxed text-[#6b6560]">
            <CheckIcon className="mt-0.5 size-4 shrink-0 text-[#E4660C]" strokeWidth={2.5} aria-hidden />
            {contract.precedence}
          </li>
        </ul>

        <div className="mt-14 border-t border-[#141414]/10 pt-12">
          <h3 className="text-xl font-medium tracking-tight sm:text-2xl">Handelsbetingelser</h3>
          <p className="mt-3 max-w-3xl text-sm leading-relaxed text-[#6b6560]">{HANDELSBETINGELSER_INTRO}</p>

          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Indhold handelsbetingelser">
            {HANDELSBETINGELSER_SECTIONS.map((section) => (
              <a
                key={section.id}
                href={`#hb-${section.id}`}
                className="rounded-full border border-[#141414]/12 bg-white px-3 py-1.5 text-xs text-[#141414] transition-colors hover:border-[#E4660C] hover:text-[#E4660C]"
              >
                {section.title.replace(/ \(fortsat\)$/, "")}
              </a>
            ))}
          </nav>

          <div className="mt-8 space-y-6">
            {HANDELSBETINGELSER_SECTIONS.map((section) => (
              <article
                key={section.id}
                id={`hb-${section.id}`}
                className="scroll-mt-28 rounded-2xl border border-[#141414]/10 bg-white p-5 sm:p-6"
              >
                <h4 className="text-base font-medium">{section.title}</h4>
                <div className="mt-3 space-y-3">
                  {section.blocks.map((block) => (
                    <p key={block} className="text-sm leading-relaxed text-[#6b6560]">
                      {block}
                    </p>
                  ))}
                </div>
                {section.bullets ? (
                  <ul className="mt-3 list-disc space-y-1.5 pl-5 text-sm text-[#6b6560]">
                    {section.bullets.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                ) : null}
              </article>
            ))}
          </div>

          <div className="mt-8 rounded-2xl bg-[#0a0a0a] p-6 text-sm text-white/80 sm:p-8">
            <p className="font-medium text-white">{CENSIO_COMPANY_FOOTER.name}</p>
            <p className="mt-2">CVR {CENSIO_COMPANY_FOOTER.cvr}</p>
            <p className="mt-1">
              {CENSIO_COMPANY_FOOTER.address} · Tlf. {CENSIO_COMPANY_FOOTER.phone} ·{" "}
              {CENSIO_COMPANY_FOOTER.email}
            </p>
            <p className="mt-1">Åbningstider: {CENSIO_COMPANY_FOOTER.hours}</p>
            <p className="mt-4 text-xs text-white/50">
              Kilde:{" "}
              <a
                href="https://censio.dk/handelsbetingelser"
                className="text-[#E4660C] underline-offset-2 hover:underline"
                target="_blank"
                rel="noopener noreferrer"
              >
                censio.dk/handelsbetingelser
              </a>{" "}
              (gældende fra 1. december 2023)
            </p>
          </div>
        </div>
      </div>
    </section>
  )
}

export function OfferContactSection({ children }: { children?: ReactNode }) {
  return (
    <section className="border-t border-[#141414]/8 bg-white px-[5%] py-12 sm:py-14">
      <div className="mx-auto max-w-6xl text-center">
        <h2 className="text-2xl font-medium tracking-tight">Klar til næste skridt?</h2>
        <p className="mx-auto mt-3 max-w-lg text-sm text-[#6b6560]">
          Skriv eller ring, så tager vi en uforpligtende snak om tilbuddet og jeres vækstplan.
        </p>
        {children}
      </div>
    </section>
  )
}

export function packageHintForPhase(
  _phase: OfferDocumentPhase,
  _visiblePackageIds: OfferPackageId[]
): string | undefined {
  return undefined
}
