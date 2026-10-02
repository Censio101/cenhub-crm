import { BUILTIN_COLUMN_KEYS, type ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"

export function buildDefaultLeadSheetConfig(): ResolvedLeadSheetConfig {
  return {
    template: {
      id: "default",
      name: "Standard",
      description: "",
      isSystemDefault: true,
      isShared: true,
      organizationId: null,
      sourceTemplateId: null,
      subcategoryIds: [],
      categoryIds: [],
    },
    columns: BUILTIN_COLUMN_KEYS.map((builtinKey, sortIndex) => ({
      id: `builtin-${builtinKey}`,
      sortIndex,
      kind: "builtin" as const,
      builtinKey,
    })),
  }
}
