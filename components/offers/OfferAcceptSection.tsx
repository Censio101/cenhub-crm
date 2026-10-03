"use client"

import { useState } from "react"

import { OfferAcceptForm } from "@/components/offers/OfferAcceptForm"

type OfferAcceptSectionProps = {
  slug: string
  initialStatus: "draft" | "sent" | "accepted"
  initialSignatureName: string | null
  status?: "draft" | "sent" | "accepted"
  onAccepted?: (signatureName: string) => void
}

export function OfferAcceptSection({
  slug,
  initialStatus,
  initialSignatureName,
  status: controlledStatus,
  onAccepted,
}: OfferAcceptSectionProps) {
  const [internalStatus, setInternalStatus] = useState(initialStatus)
  const [signedAs, setSignedAs] = useState(initialSignatureName)
  const status = controlledStatus ?? internalStatus

  if (status === "draft") return null

  if (status === "accepted") {
    return (
      <section className="section section--white" id="accept">
        <div className="inner">
          <p className="label">ACCEPT</p>
          <h2 className="headline-lg">
            Tilbuddet er <span className="accent">accepteret.</span>
          </h2>
          <p className="body-lg" style={{ marginTop: "1rem", maxWidth: "36rem" }}>
            {signedAs ? `Underskrevet af ${signedAs}.` : "Tak, vi vender tilbage med næste skridt."}
          </p>
        </div>
      </section>
    )
  }

  function handleAccepted(signatureName: string) {
    setInternalStatus("accepted")
    setSignedAs(signatureName)
    onAccepted?.(signatureName)
  }

  return (
    <section className="section section--offwhite" id="accept">
      <div className="inner two-col">
        <div>
          <p className="label">ACCEPTÉR TILBUD</p>
          <h2 className="headline-lg">
            Bekræft og
            <br />
            <span className="accent">underskriv her.</span>
          </h2>
          <p className="body-lg" style={{ marginTop: "1.25rem", maxWidth: "32rem" }}>
            Når du accepterer, bekræfter du tilbuddets indhold og vilkår. Du kan også bruge knappen i
            bunden af siden. Der er ingen binding, opsigelse følger vilkårene (løbende måned + 30 dage).
          </p>
        </div>
        <OfferAcceptForm slug={slug} onAccepted={handleAccepted} />
      </div>
    </section>
  )
}
