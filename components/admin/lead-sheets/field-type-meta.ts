import {
  AlignLeftIcon,
  CalendarIcon,
  ClockIcon,
  HashIcon,
  LinkIcon,
  ListIcon,
  TypeIcon,
  type LucideIcon,
} from "lucide-react"

import type { MessageKey } from "@/lib/i18n"
import type { CustomFieldType } from "@/lib/lead-sheet/types"

export const FIELD_TYPE_ICONS: Record<CustomFieldType, LucideIcon> = {
  text: TypeIcon,
  textarea: AlignLeftIcon,
  date: CalendarIcon,
  time: ClockIcon,
  number: HashIcon,
  select: ListIcon,
  image: LinkIcon,
}

export function fieldTypeLabelKey(fieldType: CustomFieldType): MessageKey {
  return `leadSheetsFieldType_${fieldType}` as MessageKey
}
