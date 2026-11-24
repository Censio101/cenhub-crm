import { describe, expect, it } from "vitest"

import { parseStructuredText, shouldShowFormatted } from "@/lib/leads/structured-text"

const MOVING = [
  "FLYTTER FRA",
  "Adresse: Vej 1, 4400 Kalundborg",
  "Bolig: Lejlighed, 2. sal, elevator",
  "",
  "FLYTTER TIL",
  "Adresse: Vej 2, 4300 Holbæk",
  "",
  "OM BOLIGEN",
  "Værelser: 4",
  "Størrelse: 95 m²",
  "Flyttekasser: Ja",
  "Bemærkninger: Vi har et klaver",
  "og en stor fryser",
].join("\n")

describe("parseStructuredText", () => {
  it("reads headings and Label: value rows from the plugin's moving details", () => {
    const parsed = parseStructuredText(MOVING)
    expect(parsed.headingCount).toBe(3)
    expect(parsed.rowCount).toBe(7)
    expect(parsed.blocks[0]).toEqual({ kind: "heading", text: "FLYTTER FRA" })
    expect(parsed.blocks[1]).toEqual({
      kind: "row",
      label: "Adresse",
      value: "Vej 1, 4400 Kalundborg",
    })
  })

  it("joins a following plain line onto the row above it", () => {
    const rows = parseStructuredText(MOVING).blocks.filter((b) => b.kind === "row")
    expect(rows.at(-1)).toEqual({
      kind: "row",
      label: "Bemærkninger",
      value: "Vi har et klaver\nog en stor fryser",
    })
  })

  it("keeps the whole value when it contains more colons", () => {
    const parsed = parseStructuredText("Side: https://example.dk/flyt\nTid: kl. 14:30")
    expect(parsed.blocks).toEqual([
      { kind: "row", label: "Side", value: "https://example.dk/flyt" },
      { kind: "row", label: "Tid", value: "kl. 14:30" },
    ])
  })

  it("does not treat a URL or a time on its own as a row", () => {
    expect(parseStructuredText("https://example.dk/flyt").rowCount).toBe(0)
    expect(parseStructuredText("14:30").rowCount).toBe(0)
  })

  it("finds no rows in ordinary writing", () => {
    const parsed = parseStructuredText("Ring til kunden i morgen.\nHan vil gerne have et tilbud.")
    expect(parsed.rowCount).toBe(0)
    expect(parsed.blocks.every((b) => b.kind === "text")).toBe(true)
  })

  it("counts rows and headings, including a single row", () => {
    expect(parseStructuredText("Opgave: Skift en dør").rowCount).toBe(1)
    expect(parseStructuredText("Vægt: 200 kg\nAfstand: 12 m").rowCount).toBe(2)
    const withHeading = parseStructuredText("OM BOLIGEN\nVærelser: 4")
    expect(withHeading.headingCount).toBe(1)
    expect(withHeading.rowCount).toBe(1)
  })

  it("only reads a capital-letter line as a heading at the start of a block", () => {
    const parsed = parseStructuredText("Note: første linje\nOK TAK\nAdresse: Vej 1")
    expect(parsed.headingCount).toBe(0)
    expect(parsed.blocks[0]).toEqual({ kind: "row", label: "Note", value: "første linje\nOK TAK" })
  })

  it("handles Windows line breaks and empty values", () => {
    const parsed = parseStructuredText("Navn: Anders\r\nTelefon:\r\nEmail: a@x.dk")
    expect(parsed.blocks).toEqual([
      { kind: "row", label: "Navn", value: "Anders" },
      { kind: "row", label: "Telefon", value: "" },
      { kind: "row", label: "Email", value: "a@x.dk" },
    ])
  })

  it("returns nothing for empty text", () => {
    expect(parseStructuredText("").blocks).toEqual([])
    expect(parseStructuredText("  \n \n").rowCount).toBe(0)
  })
})

describe("shouldShowFormatted", () => {
  const show = (on: boolean, text: string) => shouldShowFormatted(on, parseStructuredText(text))

  it("never formats when the column switch is off", () => {
    expect(show(false, MOVING)).toBe(false)
    expect(show(false, "Opgave: Skift en dør")).toBe(false)
  })

  it("formats a single Label: value line when the switch is on", () => {
    expect(show(true, "Opgave: Skift en dør")).toBe(true)
  })

  it("formats a heading with only one row under it", () => {
    expect(show(true, "OM BOLIGEN\nVærelser: 4")).toBe(true)
  })

  it("formats longer details, as before", () => {
    expect(show(true, MOVING)).toBe(true)
  })

  it("keeps text without any label in the plain text box, and empty text too", () => {
    expect(show(true, "Ring til kunden i morgen.")).toBe(false)
    expect(show(true, "")).toBe(false)
  })
})
