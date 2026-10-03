import { normalizeCustomerContact, syncContactLegacyFields } from "@/lib/internal/customer-contact"
import { describeCustomerChanges, pushAudit } from "@/lib/onboarding/audit"
import { jsonError, requireCensioAdmin } from "@/lib/onboarding/auth"
import { getStore } from "@/lib/onboarding/store"
import type { CustomerContact, CustomerPerson } from "@/lib/onboarding/types"

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

export async function PUT(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const actor = await requireCensioAdmin()
    const { workspaceId } = await context.params
    const body = (await request.json()) as {
      phone?: string
      subEmail?: string
      contactName?: string
      cvr?: string
      companyName?: string
      email?: string
      website?: string
      people?: unknown
    }
    const companyName = body.companyName?.trim().slice(0, 160) ?? ""
    const email = body.email?.trim().toLowerCase() ?? ""
    const website = body.website?.trim().slice(0, 200) ?? ""
    const people = parsePeople(body.people)
    const cvrInput = (body.cvr ?? "").replace(/[^\d]/g, "").slice(0, 8)
    if (cvrInput && cvrInput.length !== 8) {
      throw new Error("CVR skal være 8 cifre.")
    }
    if (!companyName) throw new Error("Virksomheden skal have et navn.")
    if (!email.includes("@")) throw new Error("E-mail er ugyldig.")
    for (const person of people) {
      for (const entry of person.emails) {
        const value = entry.email.trim().toLowerCase()
        if (value && !value.includes("@")) {
          throw new Error("En kontakt-e-mail er ugyldig.")
        }
      }
    }

    const store = getStore()
    const saved = await store.update((data) => {
      const workspace = data.workspaces.find((item) => item.id === workspaceId)
      if (!workspace) throw new Error("Kunden findes ikke.")
      if (workspace.useDemoData) {
        throw new Error("Demo-kunden indgår ikke i Censio Internal.")
      }
      const previousContact = data.customerContacts.find((item) => item.workspaceId === workspaceId)
      const previousNormalized = normalizeCustomerContact(
        previousContact ?? { workspaceId },
        workspace.email
      )
      const previous = {
        name: workspace.name,
        email: workspace.email,
        contactName: previousNormalized.contactName,
        phone: previousNormalized.phone,
        subEmail: previousNormalized.subEmail,
        cvr: previousNormalized.cvr,
        website: previousNormalized.website,
      }

      const previousEmail = workspace.email.toLowerCase()
      if (email !== previousEmail) {
        const takenByWorkspace = data.workspaces.some(
          (item) => item.id !== workspaceId && item.email.toLowerCase() === email
        )
        if (takenByWorkspace) throw new Error("E-mailen er allerede i brug.")
        const ownerMembership = data.memberships.find(
          (item) => item.workspaceId === workspaceId && item.role === "admin"
        )
        const owner = data.users.find((user) => user.id === ownerMembership?.userId)
        if (owner && owner.email.toLowerCase() === previousEmail) {
          const takenByUser = data.users.some(
            (user) => user.id !== owner.id && user.email.toLowerCase() === email
          )
          if (takenByUser) throw new Error("E-mailen er allerede i brug.")
          owner.email = email
        }
        workspace.email = email
      }
      workspace.name = companyName

      const legacy = syncContactLegacyFields(people, email)
      const contact: CustomerContact = normalizeCustomerContact(
        {
          workspaceId,
          website,
          cvr: cvrInput,
          people,
          contactName: legacy.contactName,
          phone: legacy.phone,
          subEmail: legacy.subEmail,
        },
        email
      )

      data.customerContacts = [
        ...data.customerContacts.filter((item) => item.workspaceId !== workspaceId),
        contact,
      ]
      const change = describeCustomerChanges(previous, {
        name: companyName,
        email,
        contactName: contact.contactName,
        phone: contact.phone,
        subEmail: contact.subEmail,
        cvr: contact.cvr,
        website: contact.website,
      })
      if (change) {
        pushAudit(data, actor, { action: "Kunde", target: companyName, change })
      }
      return contact
    })
    return Response.json({ contact: saved })
  } catch (error) {
    return jsonError(error)
  }
}
