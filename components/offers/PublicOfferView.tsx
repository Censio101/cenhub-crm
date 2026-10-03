"use client"

import { useEffect, useMemo, useRef, useState } from "react"

import { PublicOfferEditorial } from "@/components/offers/PublicOfferEditorial"
import { resolveOfferModules } from "@/lib/internal/offer-modules"
import type { OfferPackage } from "@/lib/internal/offer-packages"
import { offerValidUntil } from "@/lib/internal/offer-document"
import type { OfferModuleId } from "@/lib/internal/offer-modules"
import type { OfferServiceId, OfferStatus } from "@/lib/onboarding/types"

type PublicOffer = {
  slug: string
  companyName: string
  cvr: string
  contactName: string
  packages: OfferPackage[]
  services: OfferServiceId[]
  modules: OfferModuleId[]
  createdAt: string
  status: OfferStatus
  signatureName: string | null
}

function scrollPct() {
  const doc = document.documentElement
  const scrollTop = doc.scrollTop || document.body.scrollTop
  const height = doc.scrollHeight - doc.clientHeight
  if (height <= 0) return 100
  return Math.round((scrollTop / height) * 100)
}

function formatDaDate(date: Date) {
  return new Intl.DateTimeFormat("da-DK", { dateStyle: "long" }).format(date)
}

function OfferState({ message }: { message: string }) {
  return (
    <div className="offer-ed">
      <div className="offer-ed-loading">{message}</div>
    </div>
  )
}

export function PublicOfferView({ slug }: { slug: string }) {
  const [offer, setOffer] = useState<PublicOffer | null>(null)
  const [error, setError] = useState<string | null>(null)
  const sessionIdRef = useRef<string | null>(null)
  const maxScrollRef = useRef(0)
  const startedRef = useRef<number>(Date.now())

  const validUntilLabel = useMemo(() => {
    if (!offer?.createdAt) return null
    const until = offerValidUntil(offer.createdAt)
    return until ? formatDaDate(until) : null
  }, [offer?.createdAt])

  async function track(type: "open" | "pulse" | "leave") {
    const durationSec = Math.round((Date.now() - startedRef.current) / 1000)
    maxScrollRef.current = Math.max(maxScrollRef.current, scrollPct())
    await fetch(`/api/offers/${slug}/track`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        type,
        sessionId: sessionIdRef.current ?? undefined,
        maxScrollPct: maxScrollRef.current,
        durationSec,
      }),
      keepalive: type === "leave",
    })
      .then(async (response) => {
        const payload = (await response.json()) as { sessionId?: string }
        if (payload.sessionId) sessionIdRef.current = payload.sessionId
      })
      .catch(() => undefined)
  }

  useEffect(() => {
    void (async () => {
      const response = await fetch(`/api/offers/${slug}`)
      const payload = (await response.json()) as { offer?: PublicOffer; error?: string }
      if (!response.ok) {
        setError(payload.error || "Tilbuddet findes ikke.")
        return
      }
      const raw = payload.offer
      if (raw) {
        setOffer({
          ...raw,
          modules:
            raw.modules ??
            resolveOfferModules({
              packages: raw.packages.map((p) => p.id),
              services: raw.services,
            }),
        })
      } else {
        setOffer(null)
      }
    })()
  }, [slug])

  useEffect(() => {
    if (!offer) return
    startedRef.current = Date.now()
    void track("open")
    const onScroll = () => {
      maxScrollRef.current = Math.max(maxScrollRef.current, scrollPct())
    }
    const pulse = window.setInterval(() => {
      void track("pulse")
    }, 10_000)
    const onLeave = () => {
      void track("leave")
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("pagehide", onLeave)
    window.addEventListener("beforeunload", onLeave)
    return () => {
      window.clearInterval(pulse)
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("pagehide", onLeave)
      window.removeEventListener("beforeunload", onLeave)
      void track("leave")
    }
  }, [offer, slug])

  if (error) {
    return <OfferState message={error} />
  }

  if (!offer) {
    return <OfferState message="Henter tilbud…" />
  }

  return (
    <PublicOfferEditorial
      slug={offer.slug}
      companyName={offer.companyName}
      cvr={offer.cvr ?? ""}
      contactName={offer.contactName}
      packages={offer.packages}
      services={offer.services}
      validUntilLabel={validUntilLabel}
      status={offer.status ?? "draft"}
      signatureName={offer.signatureName ?? null}
    />
  )
}
