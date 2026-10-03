import { Check, Route } from "lucide-react"

import { EDITORIAL_MARKETING_WORK } from "@/lib/internal/offer-editorial-content"

export function OfferMarketingWorkSection() {
  const {
    phaseLabel,
    title,
    whatLabel,
    what,
    whyLabel,
    why,
    processTitle,
    processIntro,
    timelineSteps,
  } = EDITORIAL_MARKETING_WORK

  return (
    <section
      className="section section--dark offer-marketing-work"
      id="marketing"
      aria-labelledby="offer-marketing-work-title"
    >
      <div className="inner offer-marketing-work__shell">
        <header className="offer-marketing-work__header">
          <p className="label">{phaseLabel}</p>
          <h2 className="headline-lg" id="offer-marketing-work-title">
            {title}
          </h2>
        </header>

        <div className="offer-marketing-work__grid">
          <div className="offer-marketing-work__story">
            <article className="offer-marketing-work__block">
              <h3 className="offer-marketing-work__block-label">{whatLabel}</h3>
              <p className="offer-marketing-work__block-text">{what}</p>
            </article>
            <article className="offer-marketing-work__block">
              <h3 className="offer-marketing-work__block-label">{whyLabel}</h3>
              <p className="offer-marketing-work__block-text">{why}</p>
            </article>
          </div>

          <aside className="offer-marketing-work__process-panel" aria-labelledby="offer-marketing-process-title">
            <div className="offer-marketing-work__process-head">
              <Route className="offer-marketing-work__process-icon" size={22} strokeWidth={2} aria-hidden />
              <div>
                <h3 className="offer-marketing-work__process-title" id="offer-marketing-process-title">
                  {processTitle}
                </h3>
                <p className="offer-marketing-work__process-intro">{processIntro}</p>
              </div>
            </div>
            <ol className="offer-marketing-work__timeline">
              {timelineSteps.map((step, index) => (
                <li key={step.title} className="offer-marketing-work__step">
                  <div className="offer-marketing-work__rail" aria-hidden>
                    {index === 0 ? (
                      <span className="offer-marketing-work__node offer-marketing-work__node--start">
                        <Check size={13} strokeWidth={2.5} aria-hidden />
                      </span>
                    ) : (
                      <span className="offer-marketing-work__node" />
                    )}
                    {index < timelineSteps.length - 1 ? (
                      <span className="offer-marketing-work__track" />
                    ) : null}
                  </div>
                  <div className="offer-marketing-work__step-copy">
                    <p className="offer-marketing-work__step-title">{step.title}</p>
                    <p className="offer-marketing-work__step-detail">{step.detail}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
        </div>
      </div>
    </section>
  )
}
