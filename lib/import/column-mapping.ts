import { foldText } from "@/lib/import/parse-values"
import type { ColumnMapping } from "@/lib/import/types"

/** The standard lead fields a sheet column can fill, in the order they are shown. */
export const IMPORT_STANDARD_TARGETS = [
  "fullName",
  "email",
  "phone",
  "date",
  "segment",
  "companyName",
  "address",
  "zipCode",
  "city",
  "serviceIds",
  "status",
  "salesPrice",
  "profit",
] as const

export type ImportStandardTarget = (typeof IMPORT_STANDARD_TARGETS)[number]

/** Prefix of a target that fills one of the client's custom sheet columns. */
export const IMPORT_CUSTOM_PREFIX = "customFields."

/** Column names people use for each field, in English and Danish (folded, best match first). */
const HEADER_ALIASES: Record<ImportStandardTarget, string[]> = {
  fullName: [
    "fullname",
    "name",
    "navn",
    "kundenavn",
    "contactname",
    "yourname",
    "fuldenavn",
    "kontaktperson",
  ],
  email: ["email", "emailaddress", "emailadresse", "mail", "epost", "kundemail"],
  phone: [
    "phone",
    "phonenumber",
    "telefon",
    "telefonnummer",
    "tlf",
    "tlfnr",
    "mobil",
    "mobile",
    "mobilnummer",
    "tel",
  ],
  date: [
    "date",
    "dato",
    "leaddate",
    "oprettet",
    "oprettetdato",
    "createdat",
    "created",
    "modtaget",
    "receivedat",
    "timestamp",
    "tidspunkt",
  ],
  segment: ["segment", "kundetype", "type", "privaterhverv"],
  companyName: ["company", "companyname", "firma", "firmanavn", "virksomhed", "virksomhedsnavn"],
  address: ["address", "adresse", "vej", "street", "streetaddress", "gade"],
  zipCode: ["zip", "zipcode", "postnr", "postnummer", "postalcode", "postcode"],
  city: ["city", "by", "bynavn", "town"],
  serviceIds: ["services", "service", "ydelser", "ydelse", "opgave", "serviceydelse"],
  status: ["status", "leadstatus", "fase", "stage"],
  salesPrice: ["salesprice", "salgspris", "pris", "omsaetning", "beloeb", "tilbudspris", "revenue"],
  profit: ["profit", "fortjeneste", "avance", "daekningsbidrag", "db", "margin"],
}

const FIRST_NAME = ["firstname", "fornavn", "givenname"]
const LAST_NAME = ["lastname", "efternavn", "surname", "familyname"]

export type ImportTarget = {
  /** `fullName` or `customFields.<key>`. */
  target: string
  /** Extra names to match, e.g. a custom column's key and label. */
  names?: string[]
}

/**
 * A first guess at the mapping from the file's headers. Every header is used once. Full name
 * falls back to first name plus last name when the file has no single name column.
 */
export function suggestColumnMapping(
  headers: readonly string[],
  targets: readonly ImportTarget[]
): ColumnMapping {
  const folded = headers.map((header) => ({ header, key: foldText(header) }))
  const used = new Set<string>()
  const mapping: ColumnMapping = {}

  const take = (aliases: readonly string[]): string | null => {
    for (const alias of aliases) {
      const hit = folded.find((entry) => entry.key === alias && !used.has(entry.header))
      if (hit) {
        used.add(hit.header)
        return hit.header
      }
    }
    return null
  }

  for (const { target, names = [] } of targets) {
    const standard = HEADER_ALIASES[target as ImportStandardTarget] ?? []
    const aliases = [...standard, ...names.map(foldText)].filter(Boolean)
    const header = take(aliases)
    if (header) mapping[target] = [header]
  }

  if (!mapping.fullName && targets.some((t) => t.target === "fullName")) {
    const first = take(FIRST_NAME)
    const last = take(LAST_NAME)
    const parts = [first, last].filter((part): part is string => Boolean(part))
    if (parts.length > 0) mapping.fullName = parts
  }
  return mapping
}

/** Header names that are not in the file (for example after choosing another sheet). */
export function missingHeaders(mapping: ColumnMapping, headers: readonly string[]): string[] {
  const known = new Set(headers)
  return Object.values(mapping)
    .flat()
    .filter((header) => !known.has(header))
}

/** Drops mapping entries whose column is not in the file, and empty entries. */
export function cleanMapping(mapping: ColumnMapping, headers: readonly string[]): ColumnMapping {
  const known = new Set(headers)
  const out: ColumnMapping = {}
  for (const [target, columns] of Object.entries(mapping)) {
    const kept = columns.filter((column) => known.has(column))
    if (kept.length > 0) out[target] = kept
  }
  return out
}
