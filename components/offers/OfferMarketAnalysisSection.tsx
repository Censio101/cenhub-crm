import { EDITORIAL_MARKET_ANALYSIS } from "@/lib/internal/offer-editorial-content"

export function OfferMarketAnalysisSection() {
  const { phaseLabel, titleBeforeAccent, titleAccent, lead, steps } = EDITORIAL_MARKET_ANALYSIS

  return (
    <section
      className="section section--offwhite offer-market-analysis"
      id="analyse"
      aria-labelledby="offer-market-analysis-title"
    >
      <div className="inner">
        <div className="offer-market-analysis__head">
          <p className="label">{phaseLabel}</p>
          <h2 className="headline-lg offer-market-analysis__title" id="offer-market-analysis-title">
            {titleBeforeAccent} <span className="accent">{titleAccent}</span>
          </h2>
          <p className="offer-market-analysis__lead">{lead}</p>
        </div>

        <ol className="offer-market-analysis__timeline">
          {steps.map((step, index) => (
            <li key={step.id} className="offer-market-analysis__stage">
              <div className="offer-market-analysis__rail" aria-hidden>
                <span className="offer-market-analysis__node">{index + 1}</span>
                {index < steps.length - 1 ? <span className="offer-market-analysis__track" /> : null}
              </div>
              <article className="offer-market-analysis__card">
                <dl className="offer-market-analysis__details">
                  <div className="offer-market-analysis__detail">
                    <dt className="mono">Hvorfor</dt>
                    <dd>{step.why}</dd>
                  </div>
                </dl>
              </article>
            </li>
          ))}
        </ol>
      </div>
    </section>
  )
}
