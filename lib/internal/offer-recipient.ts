import { normalizeOfferPhone } from "@/lib/internal/offer-admin"
import type { StoreData } from "@/lib/onboarding/types"

export type OfferRecipientBody = {
  workspaceId?: string | null
  companyName?: string
  contactName?: string
  email?: string
  phone?: string
  cvr?: string
}

function parseCvr(value: unknown) {
  const cvr = String(value ?? "").replace(/[^\d]/g, "").slice(0, 8)
  if (cvr && cvr.length !== 8) throw new Error("CVR skal være 8 cifre.")
  return cvr
}

export function resolveOfferRecipient(data: StoreData, body: OfferRecipientBody) {
  const workspaceId = body.workspaceId?.trim() || null
  const companyName = body.companyName?.trim().slice(0, 160) ?? ""
  const contactName = body.contactName?.trim().slice(0, 120) ?? ""
  const email = body.email?.trim().toLowerCase().slice(0, 160) ?? ""
  const cvr = parseCvr(body.cvr)
  let phone = normalizeOfferPhone(body.phone)

  if (workspaceId) {
    const workspace = data.workspaces.find((item) => item.id === workspaceId)
    if (!workspace || workspace.useDemoData) throw new Error("Kunden findes ikke.")
    if (!phone) {
      const contact = data.customerContacts?.find((item) => item.workspaceId === workspaceId)
      phone = normalizeOfferPhone(contact?.phone)
    }
  }

  if (!companyName) throw new Error("Skriv et virksomhedsnavn.")
  if (!contactName) throw new Error("Skriv et navn.")
  if (!email.includes("@")) throw new Error("Skriv en gyldig e-mail.")
  return { workspaceId, companyName, contactName, email, phone, cvr }
}
