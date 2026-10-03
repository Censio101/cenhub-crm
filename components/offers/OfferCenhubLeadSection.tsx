import { BarChart3, Kanban, UserCheck, type LucideIcon } from "lucide-react"

import { OfferCenhubLeadGrowthChart } from "@/components/offers/OfferCenhubLeadGrowthChart"
import { EDITORIAL_CENHUB_LEAD } from "@/lib/internal/offer-editorial-content"

const HIGHLIGHT_ICONS: Record<(typeof EDITORIAL_CENHUB_LEAD.highlights)[number]["id"], LucideIcon> = {
  pipeline: Kanban,
  qualified: UserCheck,
  channels: BarChart3,
}

export function OfferCenhubLeadSection() {
  const { phaseLabel, titleBeforeAccent, titleAccent, intro, highlights } = EDITORIAL_CENHUB_LEAD

  return (
    <section
      className="section section--dark offer-cenhub-lead"
      id="cenhub-lead"
      aria-labelledby="offer-cenhub-lead-title"
    >
      <div className="inner">
        <header className="offer-cenhub-lead__head">
          <p className="label">{phaseLabel}</p>
          <h2 className="headline-lg offer-cenhub-lead__title" id="offer-cenhub-lead-title">
            {titleBeforeAccent} <span className="accent">{titleAccent}</span>
          </h2>
          <p className="offer-cenhub-lead__intro">{intro}</p>
        </header>

        <div className="offer-cenhub-lead__layout">
          <div className="offer-cenhub-lead__main">
            <div className="offer-cenhub-lead__grid">
              {highlights.map((item) => {
                const Icon = HIGHLIGHT_ICONS[item.id]
                return (
                  <article key={item.id} className="offer-cenhub-lead__cell">
                    <Icon className="offer-cenhub-lead__icon" size={24} strokeWidth={2} aria-hidden />
                    <div className="offer-cenhub-lead__cell-copy">
                      <p className="offer-cenhub-lead__cell-title">{item.title}</p>
                      <p className="offer-cenhub-lead__cell-text">{item.text}</p>
                    </div>
                  </article>
                )
              })}
            </div>
          </div>

          <aside className="offer-cenhub-lead__chart-col" aria-label="Graf over lead-vækst">
            <OfferCenhubLeadGrowthChart />
          </aside>
        </div>
      </div>
    </section>
  )
}
