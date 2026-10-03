import Image from "next/image"
import Link from "next/link"
import type { CSSProperties } from "react"

import { formatOfferCvrLabel } from "@/lib/internal/offer-admin"
import {
  EDITORIAL_HERO_IMAGE,
  EDITORIAL_HERO_STATS,
  EDITORIAL_LOGO_WHITE,
  EDITORIAL_OFFER_CVR_PLACEHOLDER,
  EDITORIAL_TRUSTPILOT_LOGO,
  EDITORIAL_TRUSTPILOT_STARS,
  EDITORIAL_TRUSTPILOT_URL,
} from "@/lib/internal/offer-editorial-content"

type OfferEditorialHeroProps = {
  companyName: string
  cvr: string
  packageLine: string
}

export function OfferEditorialHero({ companyName, cvr, packageLine }: OfferEditorialHeroProps) {
  const cvrLabel =
    formatOfferCvrLabel(cvr) ?? formatOfferCvrLabel(EDITORIAL_OFFER_CVR_PLACEHOLDER)
  const heroStyle = {
    ["--offer-hero-image" as string]: `url(${EDITORIAL_HERO_IMAGE})`,
  } as CSSProperties

  return (
    <section className="hero-censio" id="top" style={heroStyle}>
      <div className="hero-censio__overlay" aria-hidden />
      <div className="hero-censio__inner inner">
        <div className="hero-censio__top">
          <Link
            href="https://censio.dk"
            className="hero-censio__logo-link"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Image
              src={EDITORIAL_LOGO_WHITE}
              alt="Censio"
              width={148}
              height={36}
              className="hero-censio__logo"
              priority
            />
          </Link>
          <a
            href={EDITORIAL_TRUSTPILOT_URL}
            className="hero-censio__trustpilot"
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Se Censio på Trustpilot"
          >
            <Image
              src={EDITORIAL_TRUSTPILOT_STARS}
              alt=""
              width={128}
              height={24}
              className="hero-censio__trust-stars-img"
              aria-hidden
            />
            <Image
              src={EDITORIAL_TRUSTPILOT_LOGO}
              alt="Trustpilot"
              width={96}
              height={24}
              className="hero-censio__trust-logo-img"
            />
          </a>
        </div>

        <div className="hero-censio__copy">
          <p className="hero-censio__eyebrow mono">Vækstpartner tilbud</p>
          <h1 className="hero-censio__title">Vi skaber digital vækst i din forretning</h1>
          <div className="hero-censio__client">
            {packageLine ? <p className="hero-censio__package">{packageLine}</p> : null}
            <p className="hero-censio__company">{companyName}</p>
            <p className="hero-censio__cvr">{cvrLabel}</p>
          </div>
        </div>

        <div className="hero-censio__stats">
          {EDITORIAL_HERO_STATS.map((item) => (
            <div key={`${item.value}-${item.label}`} className="hero-censio__stat">
              <p
                className={
                  item.variant === "accent"
                    ? "hero-censio__stat-value hero-censio__stat-value--accent"
                    : "hero-censio__stat-value"
                }
              >
                {item.value}
              </p>
              <p className="hero-censio__stat-label">{item.label}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}
