import type {
  CustomerContact,
  CustomerEmailEntry,
  CustomerPerson,
  CustomerPhoneEntry,
} from "@/lib/onboarding/types"

export function contactEntryId() {
  return crypto.randomUUID()
}

export function emptyPerson(): CustomerPerson {
  return {
    id: contactEntryId(),
    name: "",
    title: "",
    phones: [],
    emails: [],
  }
}

export function syncContactLegacyFields(
  people: CustomerPerson[],
  workspaceEmail: string
): Pick<CustomerContact, "contactName" | "phone" | "subEmail"> {
  const primary = people.find((person) => person.name.trim() || person.phones.length > 0) ?? people[0]
  if (!primary) {
    return { contactName: "", phone: "", subEmail: "" }
  }
  const phone = primary.phones.find((entry) => entry.number.trim())?.number.trim() ?? ""
  const normalizedWorkspace = workspaceEmail.trim().toLowerCase()
  const subEmail =
    primary.emails.find(
      (entry) => entry.email.trim() && entry.email.trim().toLowerCase() !== normalizedWorkspace
    )?.email.trim().toLowerCase() ?? ""
  return {
    contactName: primary.name.trim(),
    phone,
    subEmail,
  }
}

export function normalizeCustomerContact(
  raw: Partial<CustomerContact> & { workspaceId: string },
  workspaceEmail = ""
): CustomerContact {
  const website = (raw.website ?? "").trim()
  const cvr = (raw.cvr ?? "").replace(/[^\d]/g, "").slice(0, 8)
  let people = (raw.people ?? []).map(normalizePerson)

  if (people.length === 0) {
    const legacyName = (raw.contactName ?? "").trim()
    const legacyPhone = (raw.phone ?? "").trim()
    const legacySub = (raw.subEmail ?? "").trim().toLowerCase()
    const phones: CustomerPhoneEntry[] = legacyPhone
      ? [{ id: contactEntryId(), label: "Hoved", number: legacyPhone }]
      : []
    const emails: CustomerEmailEntry[] = legacySub
      ? [{ id: contactEntryId(), label: "Direkte", email: legacySub }]
      : []
    if (legacyName || phones.length > 0 || emails.length > 0) {
      people = [
        {
          id: contactEntryId(),
          name: legacyName,
          title: "",
          phones,
          emails,
        },
      ]
    }
  }

  const legacy = syncContactLegacyFields(people, workspaceEmail)
  return {
    workspaceId: raw.workspaceId,
    website,
    cvr,
    people,
    contactName: legacy.contactName,
    phone: legacy.phone,
    subEmail: legacy.subEmail,
  }
}

function normalizePerson(person: CustomerPerson): CustomerPerson {
  return {
    id: person.id || contactEntryId(),
    name: person.name.trim().slice(0, 120),
    title: person.title.trim().slice(0, 80),
    phones: (person.phones ?? [])
      .map((entry) => ({
        id: entry.id || contactEntryId(),
        label: (entry.label || "Telefon").trim().slice(0, 40),
        number: entry.number.trim().slice(0, 40),
      }))
      .filter((entry) => entry.number),
    emails: (person.emails ?? [])
      .map((entry) => ({
        id: entry.id || contactEntryId(),
        label: (entry.label || "E-mail").trim().slice(0, 40),
        email: entry.email.trim().toLowerCase().slice(0, 160),
      }))
      .filter((entry) => entry.email.includes("@")),
  }
}

export function patchPerson(
  people: CustomerPerson[],
  personId: string,
  patch: Partial<Pick<CustomerPerson, "name" | "title">>
) {
  return people.map((person) => (person.id === personId ? { ...person, ...patch } : person))
}

export function patchPersonPhones(
  people: CustomerPerson[],
  personId: string,
  phones: CustomerPhoneEntry[]
) {
  return people.map((person) => (person.id === personId ? { ...person, phones } : person))
}

export function patchPersonEmails(
  people: CustomerPerson[],
  personId: string,
  emails: CustomerEmailEntry[]
) {
  return people.map((person) => (person.id === personId ? { ...person, emails } : person))
}

export function websiteHref(url: string) {
  const trimmed = url.trim()
  if (!trimmed) return undefined
  if (/^https?:\/\//i.test(trimmed)) return trimmed
  return `https://${trimmed}`
}
