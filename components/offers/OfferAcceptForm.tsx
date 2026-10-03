"use client"

import { useState, type FormEvent } from "react"

export function OfferAcceptForm({
  slug,
  onAccepted,
  submitLabel = "Acceptér tilbud",
}: {
  slug: string
  onAccepted?: (signatureName: string) => void
  submitLabel?: string
}) {
  const [signatureName, setSignatureName] = useState("")
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  async function submitAccept(event: FormEvent) {
    event.preventDefault()
    setError(null)
    setSubmitting(true)
    try {
      const response = await fetch(`/api/offers/${slug}/accept`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ signatureName, termsAccepted }),
      })
      const payload = (await response.json()) as {
        error?: string
        offer?: { status: string; signatureName?: string | null }
      }
      if (!response.ok) {
        setError(payload.error || "Accept kunne ikke registreres.")
        return
      }
      const signed = payload.offer?.signatureName ?? signatureName
      onAccepted?.(signed)
    } catch {
      setError("Accept kunne ikke registreres.")
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <form className="offer-accept-form grid gap-4" onSubmit={submitAccept}>
      <label className="grid gap-1.5 text-sm text-[#3a3a3a]">
        Fulde navn (digital underskrift)
        <input
          required
          value={signatureName}
          onChange={(event) => setSignatureName(event.target.value)}
          className="h-11 border border-[#0d0d0e]/15 bg-white px-3 text-base text-[#0d0d0e] outline-none focus:border-[#f47818]"
          autoComplete="name"
        />
      </label>
      <label className="flex items-start gap-2 text-sm text-[#3a3a3a]">
        <input
          type="checkbox"
          checked={termsAccepted}
          onChange={(event) => setTermsAccepted(event.target.checked)}
          className="mt-1 size-4 shrink-0 accent-[#f47818]"
          required
        />
        <span>
          Jeg accepterer tilbuddet og har læst{" "}
          <a
            href="https://censio.dk/handelsbetingelser"
            target="_blank"
            rel="noopener noreferrer"
            className="underline underline-offset-2"
          >
            handelsbetingelserne
          </a>
          .
        </span>
      </label>
      {error ? <p className="text-sm text-red-700">{error}</p> : null}
      <button type="submit" className="btn-primary justify-self-start" disabled={submitting}>
        {submitting ? "REGISTRERER…" : submitLabel}
      </button>
    </form>
  )
}
