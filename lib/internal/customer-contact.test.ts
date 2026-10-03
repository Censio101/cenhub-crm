import { describe, expect, it } from "vitest"

import { normalizeCustomerContact, syncContactLegacyFields } from "@/lib/internal/customer-contact"

describe("normalizeCustomerContact", () => {
  it("bygger people fra legacy felter", () => {
    const contact = normalizeCustomerContact(
      {
        workspaceId: "ws-1",
        contactName: "Anna",
        phone: "12 34 56 78",
        subEmail: "anna@firma.dk",
        cvr: "12345678",
      },
      "kontakt@firma.dk"
    )
    expect(contact.people).toHaveLength(1)
    expect(contact.people[0].name).toBe("Anna")
    expect(contact.people[0].phones[0].number).toBe("12 34 56 78")
    expect(contact.contactName).toBe("Anna")
  })

  it("spejler primær person til legacy", () => {
    const legacy = syncContactLegacyFields(
      [
        {
          id: "p1",
          name: "Bo",
          title: "Ejer",
          phones: [
            { id: "ph1", label: "Mobil", number: "20 20 20 20" },
            { id: "ph2", label: "Kontor", number: "30 30 30 30" },
          ],
          emails: [{ id: "em1", label: "Direkte", email: "bo@firma.dk" }],
        },
      ],
      "kontakt@firma.dk"
    )
    expect(legacy.contactName).toBe("Bo")
    expect(legacy.phone).toBe("20 20 20 20")
    expect(legacy.subEmail).toBe("bo@firma.dk")
  })
})
