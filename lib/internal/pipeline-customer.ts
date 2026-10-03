import { CURRENT_COMPANY } from "@/lib/company"
import { createId, nowIso } from "@/lib/onboarding/ids"
import type { StoreApi } from "@/lib/onboarding/store"
import { normalizeCustomerContact } from "@/lib/internal/customer-contact"
import type { CommercialCategory, CommercialLine, CustomerPerson } from "@/lib/onboarding/types"
import type { ServiceId } from "@/lib/internal/services"

const SERVICE_LINE: Record<ServiceId, { category: CommercialCategory; name: string }> = {
  meta: { category: "marketing", name: "Meta ads" },
  google: { category: "marketing", name: "Google ads" },
  video: { category: "marketing", name: "Video" },
  seo: { category: "seo", name: "SEO" },
  geo: { category: "geo", name: "GEO" },
  hjemmeside: { category: "website", name: "Hjemmeside" },
  webshop: { category: "website", name: "Webshop" },
  hosting: { category: "hosting", name: "Hosting" },
  support: { category: "support", name: "Support pakke" },
}

export type ScheduledServiceInput = {
  serviceId: ServiceId
  amount: number
}

export type CreatePipelineCustomerInput = {
  companyName: string
  email: string
  website?: string
  cvr?: string
  people?: CustomerPerson[]
  startsOn: string
  services: ScheduledServiceInput[]
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value) && !Number.isNaN(new Date(`${value}T00:00:00`).getTime())
}

function commercialLine(
  workspaceId: string,
  serviceId: ServiceId,
  startsOn: string,
  amount: number
): CommercialLine {
  const spec = SERVICE_LINE[serviceId]
  return {
    id: createId("line"),
    workspaceId,
    category: spec.category,
    name: spec.name,
    amount,
    cadence: "monthly",
    startsOn,
    endsOn: null,
    note: "",
    billingPeriods: [
      {
        id: crypto.randomUUID(),
        from: startsOn,
        to: null,
        amount,
        note: "",
      },
    ],
  }
}

export function createPipelineCustomer(store: StoreApi, input: CreatePipelineCustomerInput) {
  const companyName = input.companyName.trim().slice(0, 160)
  const email = input.email.trim().toLowerCase()
  const website = (input.website ?? "").trim().slice(0, 200)
  const cvr = (input.cvr ?? "").replace(/[^\d]/g, "").slice(0, 8)
  const people = input.people ?? []
  const startsOn = input.startsOn.trim()
  if (!companyName) throw new Error("Virksomhedsnavn mangler.")
  if (!email.includes("@")) throw new Error("Hoved-e-mail er ugyldig.")
  if (cvr && cvr.length !== 8) throw new Error("CVR skal være 8 cifre.")
  if (!isIsoDate(startsOn)) throw new Error("Opstartsdato er ugyldig.")
  if (input.services.length === 0) throw new Error("Vælg mindst én service.")
  for (const person of people) {
    for (const entry of person.emails) {
      const value = entry.email.trim().toLowerCase()
      if (value && !value.includes("@")) throw new Error("En kontakt-e-mail er ugyldig.")
    }
  }
  for (const item of input.services) {
    if (!Number.isFinite(item.amount) || item.amount < 0) {
      throw new Error("Månedlig pris skal være 0 eller højere.")
    }
  }

  const createdAt = nowIso()
  const workspaceId = createId("ws")

  return store.update((data) => {
    if (data.workspaces.some((workspace) => workspace.email.toLowerCase() === email)) {
      throw new Error("E-mailen er allerede i brug.")
    }
    data.workspaces.push({
      id: workspaceId,
      name: companyName,
      email,
      logo: CURRENT_COMPANY.logo,
      profileImage: CURRENT_COMPANY.image,
      enabledServiceIds: [],
      customServices: [],
      hvidbjergPartner: false,
      status: "awaiting_start",
      useDemoData: false,
      createdAt,
      provisionedAt: null,
    })

    const lines = input.services.map((item) =>
      commercialLine(workspaceId, item.serviceId, startsOn, Math.round(item.amount))
    )
    data.commercialLines.push(...lines)

    const contact = normalizeCustomerContact({ workspaceId, website, cvr, people }, email)
    data.customerContacts = [
      ...data.customerContacts.filter((item) => item.workspaceId !== workspaceId),
      contact,
    ]

    return { workspaceId, name: companyName, startsOn, lines }
  })
}
