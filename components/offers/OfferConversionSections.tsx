import Image from "next/image"
import { CheckIcon } from "lucide-react"

import { MODULE_MEDIA, CENSIO_OFFER_MEDIA } from "@/lib/internal/offer-censio-media"
import {
  OFFER_CASES,
  OFFER_COMPARISON,
  OFFER_FLOW_STEPS,
  type OfferModuleContent,
  type OfferModuleId,
} from "@/lib/internal/offer-modules"
import { OFFER_COVER_STATS } from "@/lib/internal/offer-document"
import type { OfferPackage } from "@/lib/internal/offer-packages"
import { formatCurrencyDKK } from "@/lib/performance/format"

export function OfferConversionHero({
  companyName,
  contactName,
}: {
  companyName: string
  contactName: string
}) {
  return (
    <section className="relative min-h-[min(88vh,780px)] overflow-hidden bg-[#0a0a0a] text-white">
      <Image
        src={CENSIO_OFFER_MEDIA.hero.src}
        alt={CENSIO_OFFER_MEDIA.hero.alt}
        fill
        priority
        className="object-cover object-center opacity-45"
        sizes="100vw"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/75 to-[#0a0a0a]/40" aria-hidden />
      <div className="relative mx-auto flex max-w-6xl flex-col justify-end px-[5%] pb-16 pt-28 sm:pb-20">
        <p className="text-xs font-medium tracking-[0.22em] text-white/50 uppercase">Performancebureau</p>
        <p className="mt-2 text-sm text-white/70">Vores fokus er din vækst</p>
        <h1 className="mt-8 max-w-3xl text-[clamp(2rem,5vw,3.25rem)] font-medium leading-[1.08] tracking-tight">
          Stabil kundeflow med målbart overblik, skræddersyet til{" "}
          <span className="text-[#E4660C]">{companyName}</span>
        </h1>
        <p className="mt-5 max-w-xl text-base leading-relaxed text-white/75">
          Hej {contactName}. Her er jeres vækstsystem: fra strategi og hjemmeside til tracking, video, annoncering og
          leads samlet i CenHub, med total pris i bunden.
        </p>
        <ul className="mt-10 grid gap-3 sm:grid-cols-3">
          {OFFER_COVER_STATS.map((stat) => (
            <li key={stat.label} className="rounded-xl border border-white/15 bg-black/35 px-4 py-3 backdrop-blur-sm">
              <p className="text-xl font-medium text-[#E4660C]">{stat.value}</p>
              <p className="mt-1 text-xs leading-snug text-white/65">{stat.label}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function OfferValueStack({ modules }: { modules: OfferModuleContent[] }) {
  return (
    <section id="vaerdi" className="scroll-mt-24 bg-white px-[5%] py-14 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs tracking-[0.16em] text-[#E4660C] uppercase">Værdien for jer</p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl">Det I reelt får ud af samarbejdet</h2>
        <p className="mt-2 max-w-2xl text-sm text-[#6b6560]">
          Outcome før features, hver del løfter en konkret del af jeres vækst.
        </p>
        <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {modules.map((mod) => (
            <li
              key={mod.id}
              className="flex flex-col rounded-2xl border border-[#141414]/10 bg-[#f7f7f5] p-5 transition-shadow hover:shadow-md"
            >
              <p className="text-xs font-medium tracking-wide text-[#E4660C] uppercase">{mod.title}</p>
              <h3 className="mt-2 text-lg font-medium leading-snug">{mod.headline}</h3>
              <ul className="mt-4 flex flex-1 flex-col gap-2">
                {mod.bullets.map((b) => (
                  <li key={b} className="flex gap-2 text-sm text-[#6b6560]">
                    <CheckIcon className="mt-0.5 size-4 shrink-0 text-[#E4660C]" strokeWidth={2.5} aria-hidden />
                    {b}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function OfferGrowthFlow({ activeModuleIds }: { activeModuleIds: OfferModuleId[] }) {
  const steps = OFFER_FLOW_STEPS.filter((s) => activeModuleIds.includes(s.moduleId))

  return (
    <section id="system" className="scroll-mt-24 border-y border-[#141414]/8 bg-[#0a0a0a] px-[5%] py-14 text-white sm:py-16">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs tracking-[0.16em] text-[#E4660C] uppercase">Sådan hænger det sammen</p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl">Ét vækstsystem, ikke seks løse køb</h2>
        <ol className="mt-10 flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-2">
          {steps.map((step, index) => (
            <li key={step.label} className="relative flex flex-1 flex-col rounded-xl bg-white/5 px-4 py-4 lg:px-3">
              <span className="flex size-8 items-center justify-center rounded-full bg-[#E4660C] text-sm font-medium">
                {index + 1}
              </span>
              <p className="mt-3 text-sm font-medium leading-snug">{step.label}</p>
              {index < steps.length - 1 ? (
                <span
                  className="absolute right-0 top-1/2 hidden size-2 translate-x-1/2 -translate-y-1/2 rotate-45 border-r border-t border-white/25 lg:block"
                  aria-hidden
                />
              ) : null}
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}

export function OfferModuleDeepDives({ modules }: { modules: OfferModuleContent[] }) {
  return (
    <>
      {modules.map((mod, index) => {
        const media = MODULE_MEDIA[mod.id]
        const imageRight = index % 2 === 0
        return (
          <section
            key={mod.id}
            className={`px-[5%] py-14 sm:py-16 ${index % 2 === 0 ? "bg-[#f7f7f5]" : "bg-white"}`}
          >
            <div
              className={`mx-auto grid max-w-6xl items-center gap-10 lg:grid-cols-2 ${
                imageRight ? "" : "[&>*:first-child]:lg:order-2"
              }`}
            >
              <div>
                <p className="text-xs tracking-[0.16em] text-[#E4660C] uppercase">{mod.title}</p>
                <h2 className="mt-2 text-2xl font-medium tracking-tight sm:text-3xl">{mod.headline}</h2>
                <ul className="mt-6 space-y-3">
                  {mod.bullets.map((b) => (
                    <li key={b} className="flex gap-3 text-sm leading-relaxed text-[#6b6560]">
                      <CheckIcon className="mt-0.5 size-4 shrink-0 text-[#E4660C]" strokeWidth={2.5} aria-hidden />
                      {b}
                    </li>
                  ))}
                </ul>
                {mod.processSteps ? (
                  <div className="mt-8 rounded-xl border border-[#141414]/10 bg-white p-4">
                    <p className="text-xs font-medium uppercase tracking-wide text-[#6b6560]">Processen</p>
                    <p className="mt-2 text-sm">{mod.processSteps.join(" → ")}</p>
                  </div>
                ) : null}
              </div>
              <div className="relative aspect-[4/3] overflow-hidden rounded-2xl bg-[#141414]/5 shadow-lg">
                <Image
                  src={media.src}
                  alt={media.alt}
                  fill
                  className="object-cover"
                  sizes="(max-width: 1024px) 100vw, 50vw"
                />
              </div>
            </div>
          </section>
        )
      })}
    </>
  )
}

export function OfferCaseStrip() {
  return (
    <section className="bg-white px-[5%] py-14 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <p className="text-xs tracking-[0.16em] text-[#E4660C] uppercase">Resultater & cases</p>
        <h2 className="mt-2 text-2xl font-medium tracking-tight">Lignende virksomheder har allerede vækstet med os</h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-2">
          {OFFER_CASES.map((item) => (
            <li key={item.title} className="rounded-2xl border border-[#141414]/10 bg-[#f7f7f5] p-6">
              <p className="text-lg font-medium">{item.title}</p>
              <p className="mt-2 text-sm text-[#E4660C]">{item.result}</p>
              <p className="mt-3 text-xs text-[#6b6560]">{item.tags.join(" · ")}</p>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}

export function OfferComparisonStrip() {
  return (
    <section className="bg-[#f7f7f5] px-[5%] py-14 sm:py-16">
      <div className="mx-auto max-w-6xl">
        <h2 className="text-center text-2xl font-medium tracking-tight">Censio vs. andre bureauer</h2>
        <div className="mt-10 grid gap-6 lg:grid-cols-2">
          <div className="rounded-2xl border border-[#141414]/10 bg-white/80 p-6">
            <p className="text-sm font-medium text-[#6b6560]">Andre bureauer</p>
            <ul className="mt-4 space-y-2">
              {OFFER_COMPARISON.others.map((line) => (
                <li key={line} className="text-sm text-[#6b6560]">
                  – {line}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-2xl bg-[#0a0a0a] p-6 text-white ring-2 ring-[#E4660C]">
            <p className="text-sm font-medium text-[#E4660C]">Censio</p>
            <ul className="mt-4 space-y-2">
              {OFFER_COMPARISON.censio.map((line) => (
                <li key={line} className="flex gap-2 text-sm">
                  <CheckIcon className="size-4 shrink-0 text-[#E4660C]" aria-hidden />
                  {line}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </section>
  )
}

export function OfferStickyTotals({
  packages,
  establishmentTotal,
  subscriptionTotal,
  visible,
}: {
  packages: OfferPackage[]
  establishmentTotal: number
  subscriptionTotal: number
  visible: boolean
}) {
  const primary = packages.find((p) => p.recommended) ?? packages[0]
  if (!primary || !visible) return null

  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-40 border-t border-[#141414]/10 bg-white/95 px-[5%] py-3 shadow-[0_-8px_30px_rgba(0,0,0,0.08)] backdrop-blur-md sm:py-4"
      role="region"
      aria-label="Hurtigt prisoverblik"
    >
      <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3">
        <p className="text-sm font-medium">{primary.name}</p>
        <div className="flex flex-wrap items-center gap-4 text-sm tabular-nums">
          <span>
            Etablering{" "}
            <strong className="text-[#E4660C]">{formatCurrencyDKK(establishmentTotal)}</strong>
          </span>
          <span className="hidden sm:inline text-[#6b6560]">·</span>
          <span>
            Pr. md. <strong>{formatCurrencyDKK(subscriptionTotal)}</strong>
          </span>
          <a
            href="#overblik"
            className="rounded-full bg-[#E4660C] px-4 py-1.5 text-xs font-medium text-white"
          >
            Se total
          </a>
        </div>
      </div>
    </div>
  )
}
