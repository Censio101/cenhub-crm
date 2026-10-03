import { normalizeCustomerContact } from "@/lib/internal/customer-contact"
import { normalizeOffer } from "@/lib/internal/offers"
import { normalizeUser } from "@/lib/onboarding/store-normalize-user"
import type { StoreData } from "@/lib/onboarding/types"

export function normalizeParsedStore(parsed: Partial<StoreData>): StoreData {
  return {
    workspaces: parsed.workspaces ?? [],
    users: (parsed.users ?? []).map((user) => normalizeUser(user)),
    auditLogs: parsed.auditLogs ?? [],
    memberships: parsed.memberships ?? [],
    invites: parsed.invites ?? [],
    sessions: parsed.sessions ?? [],
    commercialLines: (parsed.commercialLines ?? []).map((line) => ({
      ...line,
      note: line.note ?? "",
    })),
    fixedExpenses: parsed.fixedExpenses ?? [],
    customerContacts: (parsed.customerContacts ?? []).map((contact) => {
      const workspace = (parsed.workspaces ?? []).find((item) => item.id === contact.workspaceId)
      return normalizeCustomerContact(contact, workspace?.email ?? "")
    }),
    customerDocuments: (parsed.customerDocuments ?? []).map((document) => ({
      ...document,
      name: document.name ?? "",
      note: document.note ?? "",
    })),
    offers: (parsed.offers ?? []).map((offer) => normalizeOffer(offer)),
    offerEngagement: parsed.offerEngagement ?? [],
  }
}
