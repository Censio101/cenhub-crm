import { ArrowDown, Play } from "lucide-react"

const DELIVERABLES = [
  {
    title: "Video pakke",
    text: "Vi producerer video og billeder med fokus på salg, kendskab og et stærkt brand. Materialet udvikles med en direkte rød tråd til jeres vækstplan.",
  },
  {
    title: "Tracking",
    text: "Vi opsætter kampagnerne og sikrer, at vi tracker profitabelt og skalerer efter en forbedret bundlinje frem for toplinjen.",
  },
  {
    title: "Strategi",
    text: "Vi udvikler en målrettet annoncestrategi og tilbyder løbende rådgivning for optimal synlighed, konverteringer og effektiv budgetudnyttelse.",
  },
  {
    title: "Opsætning af Meta",
    text: "Vi opsætter jeres Meta Ads-kampagner og skalerer løbende med udgangspunkt i en forbedret bundlinje.",
  },
  {
    title: "Analyse af Meta-konto",
    text: "En marketinganalyse skaber grundlaget for opsætning, eksekvering og kontinuerlige performancejusteringer.",
  },
  {
    title: "Konkurrentanalyse",
    text: "Vi identificerer styrker og svagheder på markedet, så løsningerne finjusteres til en stærkere markedsposition.",
  },
] as const

const PROCESS = [
  {
    num: "01",
    title: "Onboarding",
    text: "Vi samler målsætninger, forretningsindsigt og det eksisterende marketinggrundlag.",
  },
  {
    num: "02",
    title: "Analyse",
    text: "Vi finder konkurrenter, analyserer markedet og bruger indsigterne til at skabe de rigtige idéer.",
  },
  {
    num: "03",
    title: "Opsætning & eksekvering",
    text: "Vi udvikler strategi, kreativer, tracking og kampagner med en samlet rød tråd.",
  },
  {
    num: "04",
    title: "Performance justering",
    text: "Vi overvåger, rapporterer og optimerer kontinuerligt for at forbedre afkastet.",
  },
] as const

const VIDEO_ITEMS = [
  {
    title: "Video marketing shoot",
    text: "Vi kører ud til jeres lokation og skyder mellem 5–10 marketingvideoer med direkte rød tråd til vækstplanen.",
  },
  {
    title: "Udstyr & scripts",
    text: "Vi medbringer flere kameraer, objekter, lyd, lys og marketingscripts, og hjælper med optagelserne.",
  },
  {
    title: "Kreativer & rettigheder",
    text: "Vi redigerer og lancerer materialet i kampagnerne. Kunden ejer og har fulde rettigheder til alt skabt materiale.",
  },
] as const

const META_ITEMS = [
  {
    title: "Løbende overvågning",
    text: "Vi overvåger og optimerer kampagnerne kontinuerligt, så budgettet bruges mest effektivt.",
  },
  {
    title: "Månedlig rapport",
    text: "Du modtager en detaljeret månedlig rapport og gennemgang af resultater med optimeringsforslag.",
  },
  {
    title: "Profitjustering",
    text: "Vi justerer med fokus på en forbedret bundlinje frem for kun at se på toplinjen.",
  },
  {
    title: "Backend kommunikation",
    text: "Direkte adgang via jeres egen kundekanal med hurtigt prioriterede og konkrete svar.",
  },
] as const

const TERMS = [
  {
    title: "Igangsættelse",
    text: "Censio igangsætter projektet og samarbejdet, når betalingen for marketing, video og onboarding er modtaget. Dette sikrer, at vi kan dedikere fuldt fokus og ressourcer til at levere optimale resultater.",
  },
  {
    title: "Ansvar",
    text: "Kunden er ansvarlig for at betale for annonce spend og for at kontakte og sende tilbud til leads.",
  },
  {
    title: "Opsigelse",
    text: "Der er ingen bindingsperiode. Kunden kan opsige samarbejdet eller en service med virkning inden for den løbende måned + 30 dage. Censio forbeholder sig retten til at opsige samarbejdsaftalen med en måneds varsel.",
  },
] as const

export default function App() {
  return (
    <div className="shell">
      <header className="site-header">
        <div className="inner site-header__row">
          <a href="#" className="wordmark" aria-label="Censio">
            censio<span className="wordmark__dot">.</span>
          </a>
          <p className="header-meta mono">
            MARKETING VÆKSTPAKKE · JSV BYG APS
          </p>
        </div>
      </header>

      <section className="hero" id="top">
        <div className="hero__grid">
          <div className="inner hero__copy">
            <p className="hero__kicker mono">TILBUD 01 · 2026</p>
            <p className="mono" style={{ color: "rgba(255,255,255,0.45)", marginBottom: "1rem" }}>
              MARKETING VÆKSTPAKKE · JSV BYG APS
            </p>
            <h1 className="hero__title">
              Vi skaber digital vækst
              <br />
              <span className="accent fw-light">i din forretning.</span>
            </h1>
            <p className="hero__lead">
              En datadrevet marketingindsats med strategi, video, tracking og Meta Ads, opbygget til at skabe
              synlighed, trafik og bedre nøgletal.
            </p>
            <div className="hero__actions">
              <a href="#leverancer" className="btn-primary">
                UDFORSK PAKKEN
                <ArrowDown size={16} strokeWidth={2} aria-hidden />
              </a>
              <a href="#priser" className="link-muted">
                Gå til priser
              </a>
            </div>
            <div className="hero__footer">
              <span>01 / 05</span>
              <span>
                Performancebureau
                <br />
                Fokus på en forbedret bundlinje.
              </span>
            </div>
          </div>
          <div className="hero__aside" aria-hidden>
            <div className="hero__image" />
          </div>
        </div>
      </section>

      <div className="stats-bar">
        <div className="stats-bar__grid">
          <div className="stats-bar__cell">
            <p className="stats-bar__value">+200</p>
            <p className="stats-bar__label">Virksomheder hjulpet</p>
          </div>
          <div className="stats-bar__cell">
            <p className="stats-bar__value">+10 år</p>
            <p className="stats-bar__label">Arbejdet med digital vækst</p>
          </div>
          <div className="stats-bar__cell">
            <p className="stats-bar__tagline">Vores fokus er din vækst.</p>
          </div>
        </div>
      </div>

      <section className="section section--white">
        <div className="inner two-col">
          <div>
            <p className="label">VÆKSTFUNDAMENT</p>
            <h2 className="headline-lg">
              Én samlet indsats.
              <br />
              Mere klarhed i <span className="accent">hver beslutning.</span>
            </h2>
          </div>
          <div>
            <p className="body-lg">
              Gennem datadrevne strategier og kontinuerlig optimering skaber vi øget synlighed, højere trafik og
              forbedrede nøgletal som ROI og LTV til CAC.
            </p>
            <p className="body-lg">
              Indsatsen samler analyse, kreative materialer og Meta-kampagner i en plan, der er bygget til eksekvering.
            </p>
          </div>
        </div>
      </section>

      <section className="section section--white" id="leverancer">
        <div className="inner">
          <p className="label">HVAD PAKKEN OMFATTER</p>
          <h2 className="headline-lg">
            De seks byggesten
            <br />
            i jeres <span className="accent">vækstplan.</span>
          </h2>
          <p className="body-lg" style={{ marginTop: "1.25rem", maxWidth: "36rem" }}>
            Fra markedets indsigter til kontinuerlige justeringer. Hver del er udviklet til at styrke den næste.
          </p>
          <div className="deliverables-grid">
            {DELIVERABLES.map((item) => (
              <article key={item.title} className="deliverable">
                <h3 className="deliverable__title">{item.title}</h3>
                <p className="deliverable__text">{item.text}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--dark">
        <div className="inner two-col">
          <div>
            <p className="label">PROCESSEN</p>
            <h2 className="headline-lg">
              Fra onboarding til
              <br />
              <span className="accent">performance.</span>
            </h2>
            <p className="body-lg" style={{ marginTop: "1.25rem" }}>
              En overskuelig proces med fokus på den rigtige rækkefølge, analyse først, eksekvering derefter og
              kontinuerlig justering hele vejen.
            </p>
          </div>
          <ol className="process-list">
            {PROCESS.map((step) => (
              <li key={step.num}>
                <span className="process-list__num">{step.num}</span>
                <p className="process-list__title">{step.title}</p>
                <p className="process-list__text">{step.text}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section--offwhite">
        <div className="inner two-col">
          <div className="video-visual" aria-hidden>
            <div className="video-visual__ring video-visual__ring--1" />
            <div className="video-visual__ring video-visual__ring--2" />
            <Play className="video-visual__play" size={48} strokeWidth={1.25} />
          </div>
          <div>
            <p className="label">VIDEO MARKETING</p>
            <h2 className="headline-lg">
              Kreativer med en klar
              <br />
              <span className="accent">rød tråd.</span>
            </h2>
            <p className="body-lg" style={{ marginTop: "1.25rem" }}>
              Video- og billedmateriale bliver produceret, redigeret og implementeret direkte i markedsføringsstrategien.
            </p>
            <ul className="line-list">
              {VIDEO_ITEMS.map((item) => (
                <li key={item.title}>
                  <p className="line-list__title">{item.title}</p>
                  <p className="line-list__text">{item.text}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="inner two-col">
          <div>
            <p className="label">META ADS</p>
            <h2 className="headline-lg">
              Indsigter omsat
              <br />
              til <span className="accent">handling.</span>
            </h2>
          </div>
          <div className="meta-grid">
            {META_ITEMS.map((item) => (
              <div key={item.title} className="meta-grid__cell">
                <p className="meta-grid__title">{item.title}</p>
                <p className="meta-grid__text">{item.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section section--offwhite" id="priser">
        <div className="inner">
          <p className="label">INVESTERING</p>
          <h2 className="headline-lg">
            En klar ramme
            <br />
            for <span className="accent">vækst.</span>
          </h2>
          <p className="pricing-note-top">Alle priser er ekskl. moms.</p>

          <div className="pricing-row">
            <div className="pricing-block">
              <h3 className="headline-lg" style={{ fontSize: "1.5rem" }}>
                Etablering
              </h3>
              <ul className="price-lines">
                <li>
                  <span>Video marketing pakke</span>
                  <span>17.500 kr.</span>
                </li>
                <li>
                  <span>Marketing & tracking onboarding</span>
                  <span>3.500 kr.</span>
                </li>
              </ul>
              <div className="price-total">
                <span>Overslag på projekt</span>
                <span>23.000 kr.</span>
              </div>
              <p className="price-note">
                Den oprindelige prisoversigt viser 36.000 kr. / 23.000 kr. for det samlede projekt.
              </p>
            </div>

            <div className="pricing-block pricing-block--dark">
              <h3 className="headline-lg" style={{ fontSize: "1.5rem", color: "#fff" }}>
                Abonnement
              </h3>
              <ul className="price-lines">
                <li>
                  <span>Meta ads samarbejde</span>
                  <span>5.000 kr.</span>
                </li>
                <li>
                  <span>Forventet Meta spend</span>
                  <span>5.000–10.000 kr.</span>
                </li>
              </ul>
              <div className="price-total">
                <span>Abonnement pr. md.</span>
                <span>5.000 kr.</span>
              </div>
              <p className="price-note">Annonce spend betales af kunden direkte.</p>
            </div>
          </div>
        </div>
      </section>

      <section className="section section--white">
        <div className="inner two-col">
          <div>
            <p className="label">KONTRAKT & VILKÅR</p>
            <h2 className="headline-lg">
              Rammer for et
              <br />
              <span className="accent">klart samarbejde.</span>
            </h2>
          </div>
          <ol className="terms-list">
            {TERMS.map((item, index) => (
              <li key={item.title}>
                <span className="terms-list__num">{index + 1}.</span>
                <div>
                  <p className="terms-list__title">{item.title}</p>
                  <p className="terms-list__text">{item.text}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <section className="section section--orange">
        <div className="inner cta-row">
          <div>
            <p className="mono" style={{ color: "rgba(13,13,14,0.55)" }}>
              NÆSTE SKRIDT
            </p>
            <h2 className="headline-lg" style={{ marginTop: "0.75rem" }}>
              Klar til at sætte
              <br />
              <span style={{ color: "#0d0d0e" }}>væksten i gang?</span>
            </h2>
          </div>
          <div style={{ textAlign: "right" }}>
            <p className="body-lg" style={{ color: "rgba(13,13,14,0.7)", marginBottom: "1.5rem" }}>
              Tilbuddet er gældende 45 dage efter modtagelse.
            </p>
            <a href="#top" className="btn-dark">
              TILBAGE TIL TOPPEN
            </a>
          </div>
        </div>
      </section>

      <footer className="site-footer">
        <div className="inner site-footer__row">
          <div>
            <p className="wordmark" style={{ color: "#fff", marginBottom: "0.35rem" }}>
              censio<span className="wordmark__dot">.</span>
            </p>
            <p className="mono" style={{ color: "rgba(255,255,255,0.45)" }}>
              Marketing Vækstpakke · JSV BYG ApS
            </p>
          </div>
          <a href="https://censio.dk/handelsbetingelser" target="_blank" rel="noopener noreferrer">
            Handelsbetingelser
          </a>
        </div>
      </footer>
    </div>
  )
}
