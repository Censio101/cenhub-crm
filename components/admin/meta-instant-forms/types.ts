import type { MappingStatus } from "@/lib/lead-sheet/mapping-review"
import type { MetaFieldMapping } from "@/lib/meta/meta-field-mapping"
import type { MetaInstantFormsSummary } from "@/lib/meta/meta-instant-forms-service"

export type MetaFormQuestion = { key?: string; label?: string; type?: string }

export type MetaInstantFormRow = {
  meta_form_id: string
  name: string
  status: string
  enabled: boolean
  field_mapping: MetaFieldMapping
  questions_snapshot: MetaFormQuestion[]
  inActiveAds: boolean
  /** Whether the mapping still matches the client's lead sheet (from the forms API). */
  mappingStatus?: MappingStatus | null
}

export type MetaInstantFormsLoadState = {
  metaEnabled: boolean
  hasPage: boolean
  canLoadForms: boolean
  loadError: string | null
  syncRecommended: boolean
}

export type MetaInstantFormAlertRow = {
  code: string
  severity: string
  titleKey: string
  bodyKey?: string
}

export type MetaInstantFormsFilter = "all" | "enabled" | "disabled"

export type MetaInstantFormsTab = "overview" | "forms" | "leads"

export type MetaInstantLeadPreviewRow = {
  metaLeadId: string
  metaFormId: string
  formName: string
  createdTime: string | null
  fields: Record<string, string>
}

export type { MetaInstantFormsSummary }
