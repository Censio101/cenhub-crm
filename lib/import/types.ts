import type { LeadPlatformId, LeadStatusId } from "@/lib/leads"

/** A cell as it travels between the browser and the server (dates are already text). */
export type CellValue = string | number | boolean | null

/** One spreadsheet row: column header to cell value. */
export type ImportRowValues = Record<string, CellValue>

/** Lead field (`fullName`, `customFields.budget`, ...) to the column header(s) that fill it. */
export type ColumnMapping = Record<string, string[]>

export type ImportOptions = {
  /** Status for rows that have none (or one we do not recognise). */
  defaultStatus: LeadStatusId
  /** Lead source shown on the dashboard for every imported lead. `""` means none. */
  defaultPlatform: LeadPlatformId | ""
  /** Skip rows whose email or phone is already a lead of this client, or repeats in the file. */
  skipDuplicates: boolean
}

export type ImportRowInput = {
  /** Row number in the sheet (1 = the header row), so messages can point at it. */
  rowNumber: number
  values: ImportRowValues
  /** The browser already found the same email or phone earlier in the file. */
  fileDuplicate?: boolean
}

export type ImportWarning = { field: string; message: string }

/** A cell whose text was turned into something else, e.g. "Vundet" into the Won status. */
export type ImportChange = { field: string; from: string; to: string }

export type ImportSkipReason = "no_contact" | "duplicate_existing" | "duplicate_file"

export type ImportRowResult = {
  rowNumber: number
  outcome: "import" | "skip"
  reason?: ImportSkipReason
  warnings: ImportWarning[]
  changes: ImportChange[]
  /** Included for the first rows only, to keep responses small. */
  lead?: ImportLeadPreview
}

/** The lead an import would create (or created), as plain JSON. */
export type ImportLeadPreview = {
  date: string
  time: string | null
  fullName: string
  email: string
  phone: string
  segment: string
  companyName: string
  address: string
  zipCode: string
  city: string
  serviceIds: string[]
  status: string
  salesPrice: number | null
  profit: number | null
  platform: string
  customFields: Record<string, unknown>
}

export type ImportChunkResponse = {
  results: ImportRowResult[]
  /** Only for real imports: how many leads were inserted. */
  inserted?: number
}

export const MAX_IMPORT_ROWS = 20_000
export const MAX_IMPORT_FILE_BYTES = 10 * 1024 * 1024
export const IMPORT_CHUNK_SIZE = 500
export const IMPORT_PREVIEW_LEADS = 25
