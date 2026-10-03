import {
  BadgeCheck,
  Camera,
  Clapperboard,
  Scissors,
  type LucideIcon,
} from "lucide-react"

import { EDITORIAL_VIDEO_MARKETING } from "@/lib/internal/offer-editorial-content"

const DELIVERABLE_ICONS: Record<
  (typeof EDITORIAL_VIDEO_MARKETING.deliverables)[number]["id"],
  LucideIcon
> = {
  shoot: Clapperboard,
  creatives: Scissors,
  equipment: Camera,
  rights: BadgeCheck,
}

export function OfferVideoMarketingSection() {
  const { phaseLabel, titleBeforeAccent, titleAccent, introLines, deliverables, promoVideoSrc } =
    EDITORIAL_VIDEO_MARKETING

  return (
    <section
      className="section section--white offer-video-marketing"
      id="video-marketing"
      aria-labelledby="offer-video-marketing-title"
    >
      <div className="inner">
        <div className="offer-video-marketing__head">
          <p className="label">{phaseLabel}</p>
          <h2 className="headline-lg offer-video-marketing__title" id="offer-video-marketing-title">
            {titleBeforeAccent} <span className="accent">{titleAccent}</span>
          </h2>
          <p className="body-lg offer-video-marketing__intro">
            {introLines.map((line) => (
              <span key={line} className="offer-video-marketing__intro-line">
                {line}
              </span>
            ))}
          </p>
        </div>

        <div className="offer-video-marketing__body">
          <ol className="offer-video-marketing__pipeline">
            {deliverables.map((item, index) => {
              const Icon = DELIVERABLE_ICONS[item.id]
              return (
                <li key={item.id} className="offer-video-marketing__stage">
                  <div className="offer-video-marketing__rail" aria-hidden>
                    <span className="offer-video-marketing__node">{index + 1}</span>
                    {index < deliverables.length - 1 ? (
                      <span className="offer-video-marketing__track" />
                    ) : null}
                  </div>
                  <article className="offer-video-marketing__card">
                    <Icon className="offer-video-marketing__icon" size={22} strokeWidth={2} aria-hidden />
                    <h3 className="offer-video-marketing__cell-title">{item.title}</h3>
                    <p className="offer-video-marketing__cell-text">{item.text}</p>
                  </article>
                </li>
              )
            })}
          </ol>

          <div className="offer-video-marketing__media">
            <video
              className="offer-video-marketing__video"
              src={promoVideoSrc}
              autoPlay
              muted
              loop
              playsInline
              preload="metadata"
              aria-label="Eksempel på Censio video marketing materiale"
            />
          </div>
        </div>
      </div>
    </section>
  )
}
