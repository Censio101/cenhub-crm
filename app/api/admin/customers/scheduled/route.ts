import { pushAudit } from "@/lib/onboarding/audit"
import { jsonError, requireCensioAdmin } from "@/lib/onboarding/auth"
import { createPipelineCustomer, type ScheduledServiceInput } from "@/lib/internal/pipeline-customer"
import type { ServiceId } from "@/lib/internal/services"
import { getStore } from "@/lib/onboarding/store"
import type { CustomerPerson } from "@/lib/onboarding/types"

const SERVICE_IDS: ServiceId[] = [
  "meta",
  "google",
  "video",
  "seo",
  "geo",
  "hjemmeside",
  "webshop",
  "hosting",
  "support",
]

function parseServices(raw: unknown): ScheduledServiceInput[] {
  if (!Array.isArray(raw)) return []
  return raw.flatMap((item) => {
    const row = item as { serviceId?: string; amount?: number }
    if (!row.serviceId || !SERVICE_IDS.includes(row.serviceId as ServiceId)) return []
    const amount = Number(row.amount ?? 0)
    return [{ serviceId: row.serviceId as ServiceId, amount: Math.max(0, Math.round(amount)) }]
  })
}

function parsePeople(raw: unknown): CustomerPerson[] {
  if (!Array.isArray(raw)) return []
  return raw.map((item) => {
    const person = item as Partial<CustomerPerson>
    return {
      id: typeof person.id === "string" ? person.id : crypto.randomUUID(),
      name: typeof person.name === "string" ? person.name : "",
      title: typeof person.title === "string" ? person.title : "",
      phones: Array.isArray(person.phones)
        ? person.phones.map((phone) => {
            const entry = phone as { id?: string; label?: string; number?: string }
            return {
              id: typeof entry.id === "string" ? entry.id : crypto.randomUUID(),
              label: typeof entry.label === "string" ? entry.label : "Telefon",
              number: typeof entry.number === "string" ? entry.number : "",
            }
          })
        : [],
      emails: Array.isArray(person.emails)
        ? person.emails.map((mail) => {
            const entry = mail as { id?: string; label?: string; email?: string }
            return {
              id: typeof entry.id === "string" ? entry.id : crypto.randomUUID(),
              label: typeof entry.label === "string" ? entry.label : "E-mail",
              email: typeof entry.email === "string" ? entry.email : "",
            }
          })
        : [],
    }
  })
}

export async function POST(request: Request) {
  try {
    const actor = await requireCensioAdmin()
    const body = (await request.json()) as {
      companyName?: string
      email?: string
      website?: string
      cvr?: string
      people?: unknown
      startsOn?: string
      services?: unknown
    }
    const store = getStore()
    const created = await createPipelineCustomer(store, {
      companyName: body.companyName ?? "",
      email: body.email ?? "",
      website: body.website,
      cvr: body.cvr,
      people: parsePeople(body.people),
      startsOn: body.startsOn ?? "",
      services: parseServices(body.services),
    })
    await store.update((data) => {
      pushAudit(data, actor, {
        action: "Ny kunde",
        target: created.name,
        change: `Opstart ${created.startsOn}. ${created.lines.length} service(r) planlagt.`,
      })
      return null
    })
    return Response.json({ ok: true, ...created })
  } catch (error) {
    return jsonError(error)
  }
}
