import { TrendingUp } from "lucide-react"

import { EDITORIAL_PAID_SOCIAL } from "@/lib/internal/offer-editorial-content"

export function OfferPaidSocialSection() {
  const { phaseLabel, titleBeforeAccent, titleAccent, intro, deliverables } = EDITORIAL_PAID_SOCIAL

  return (
    <section
      className="section section--white offer-paid-social"
      id="meta-ads"
      aria-labelledby="offer-paid-social-title"
    >
      <div className="inner">
        <div className="offer-paid-social__head two-col">
          <div>
            <p className="label">{phaseLabel}</p>
            <h2 className="headline-lg" id="offer-paid-social-title">
              {titleBeforeAccent} <span className="accent">{titleAccent}</span>
            </h2>
          </div>
          <p className="body-lg offer-paid-social__intro">{intro}</p>
        </div>

        <div className="offer-paid-social__grid">
          {deliverables.map((item) => (
            <article key={item.id} className="offer-paid-social__cell">
              <TrendingUp className="offer-paid-social__icon" size={22} strokeWidth={2} aria-hidden />
              <h3 className="offer-paid-social__cell-title">{item.title}</h3>
              <p className="offer-paid-social__cell-text">{item.text}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  )
}
