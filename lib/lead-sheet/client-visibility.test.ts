import { describe, expect, it } from "vitest"

import {
  columnVisibility,
  hiddenCustomFieldKeys,
  sanitizeClientHiddenKeys,
  visibleColumnsForClient,
} from "@/lib/lead-sheet/client-visibility"
import type { LeadSheetTemplateColumn, ResolvedLeadSheetConfig } from "@/lib/lead-sheet/types"

function builtin(key: string, hidden = false): LeadSheetTemplateColumn {
  return {
    id: `b-${key}`,
    sortIndex: 0,
    kind: "builtin",
    builtinKey: key as never,
    hiddenForClient: hidden,
  }
}

function custom(key: string, hidden = false): LeadSheetTemplateColumn {
  return {
    id: `c-${key}`,
    sortIndex: 0,
    kind: "custom",
    hiddenForClient: hidden,
    customField: {
      id: key,
      fieldKey: key,
      label: key,
      fieldType: "text",
      required: false,
      config: {},
    },
  }
}

const config: ResolvedLeadSheetConfig = {
  template: {} as ResolvedLeadSheetConfig["template"],
  columns: [
    builtin("fullName", true),
    builtin("email"),
    builtin("metaAdId", true),
    builtin("city"),
    custom("budget"),
    custom("notes", true),
  ],
}

describe("visibleColumnsForClient", () => {
  it("never hides locked columns, even when the template flag is set", () => {
    const visible = visibleColumnsForClient(config, ["builtin:email"]).columns
    expect(
      visible.map((c) => (c.kind === "builtin" ? c.builtinKey : c.customField.fieldKey))
    ).toEqual(["fullName", "email", "city", "budget"])
  })

  it("hides columns the template hides and columns the client hides", () => {
    const visible = visibleColumnsForClient(config, ["builtin:city", "custom:budget"]).columns
    expect(visible.map((c) => c.id)).toEqual(["b-fullName", "b-email"])
  })
})

describe("columnVisibility", () => {
  it("reports where the hiding comes from", () => {
    expect(columnVisibility(builtin("metaAdId", true), [])).toMatchObject({
      hidden: true,
      byTemplate: true,
      byClient: false,
    })
    expect(columnVisibility(custom("budget"), ["custom:budget"])).toMatchObject({
      hidden: true,
      byTemplate: false,
      byClient: true,
    })
    expect(columnVisibility(builtin("phone"), ["builtin:phone"])).toMatchObject({
      hidden: false,
      locked: true,
    })
  })
})

describe("hiddenCustomFieldKeys", () => {
  it("lists hidden custom fields only", () => {
    expect(hiddenCustomFieldKeys(config, ["custom:budget", "builtin:city"])).toEqual([
      "budget",
      "notes",
    ])
  })
})

describe("sanitizeClientHiddenKeys", () => {
  it("drops locked, unknown, duplicate and non-string entries", () => {
    expect(
      sanitizeClientHiddenKeys(
        ["builtin:email", "builtin:city", "builtin:city", "custom:nope", 4, "custom:budget"],
        config
      )
    ).toEqual(["builtin:city", "custom:budget"])
  })
})

describe("locked columns", () => {
  it("covers the five core fields", () => {
    for (const key of ["fullName", "email", "phone", "date", "status"]) {
      expect(columnVisibility(builtin(key, true), ["builtin:" + key]).locked).toBe(true)
    }
    expect(columnVisibility(builtin("metaAdId"), []).locked).toBe(false)
  })
})
