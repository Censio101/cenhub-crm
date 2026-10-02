import {
  META_MAPPABLE_CANONICAL_FIELDS,
  type MetaMappableCanonicalField,
} from "@/lib/meta/meta-field-mapping"
import type { MessageKey } from "@/lib/i18n"

export const META_CRM_FIELD_I18N: Record<
  MetaMappableCanonicalField,
  { labelKey: MessageKey; helpKey: MessageKey }
> = {
  fullName: { labelKey: "metaCrmFieldFullName", helpKey: "metaCrmFieldFullNameHelp" },
  email: { labelKey: "metaCrmFieldEmail", helpKey: "metaCrmFieldEmailHelp" },
  phone: { labelKey: "metaCrmFieldPhone", helpKey: "metaCrmFieldPhoneHelp" },
  companyName: { labelKey: "metaCrmFieldCompanyName", helpKey: "metaCrmFieldCompanyNameHelp" },
  address: { labelKey: "metaCrmFieldAddress", helpKey: "metaCrmFieldAddressHelp" },
  zipCode: { labelKey: "metaCrmFieldZipCode", helpKey: "metaCrmFieldZipCodeHelp" },
  city: { labelKey: "metaCrmFieldCity", helpKey: "metaCrmFieldCityHelp" },
  metaAdId: { labelKey: "metaCrmFieldMetaAdId", helpKey: "metaCrmFieldMetaAdIdHelp" },
}

export const META_CRM_FIELDS_ORDER: MetaMappableCanonicalField[] = [
  ...META_MAPPABLE_CANONICAL_FIELDS,
]
