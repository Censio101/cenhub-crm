"use client"

import { adminSectionCardClass } from "@/components/admin/admin-ui-styles"
import type { MetaInstantFormRow } from "@/components/admin/meta-instant-forms/types"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { isMetaFieldMappingConfigured } from "@/lib/meta/meta-field-mapping"
import { Button } from "@/components/ui/button"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { cn } from "cn"

type Props = {
  forms: MetaInstantFormRow[]
  busyFormId: string | null
  onConfigure: (form: MetaInstantFormRow) => void
  onEnable: (form: MetaInstantFormRow) => void
  onDisable: (form: MetaInstantFormRow) => void
}

export function MetaInstantFormsTable({
  forms,
  busyFormId,
  onConfigure,
  onEnable,
  onDisable,
}: Props) {
  const { t } = useLanguage()

  if (forms.length === 0) return null

  return (
    <div className={cn(adminSectionCardClass, "overflow-hidden p-0")}>
      <Table containerClassName="rounded-b-2xl">
        <TableHeader className="sticky top-0 z-10 bg-[#fffcf9]">
          <TableRow className="hover:bg-transparent">
            <TableHead className="min-w-[10rem] pl-5 sm:pl-6">
              {t("metaInstantFormsColForm")}
            </TableHead>
            <TableHead className="min-w-[8.5rem] whitespace-normal sm:min-w-[9.5rem]">
              {t("metaInstantFormsColMapping")}
            </TableHead>
            <TableHead className="w-[1%] whitespace-nowrap pr-5 pl-3 text-right sm:pr-6">
              {t("metaInstantFormsColActions")}
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody className="[&_tr:last-child_td]:pb-4">
          {forms.map((form) => {
            const configured = isMetaFieldMappingConfigured(form.field_mapping ?? {})
            const busy = busyFormId === form.meta_form_id
            const mappingLabel = configured
              ? t("metaInstantFormsMappingConfigured")
              : t("metaInstantFormsMappingNotConfigured")
            return (
              <TableRow key={form.meta_form_id}>
                <TableCell className="min-w-0 max-w-[min(100%,20rem)] py-3 pl-5 align-top sm:max-w-[24rem] sm:pl-6 lg:max-w-[28rem]">
                  <p className="truncate font-medium" title={form.name}>
                    {form.name}
                  </p>
                  {form.status === "MISSING" ? (
                    <span
                      className="mt-1 flex w-fit items-center gap-1 rounded-full border border-red-200 bg-red-50 px-2 py-0.5 text-[11px] font-medium leading-4 text-red-800"
                      title={t("metaInstantFormsMissingOnMetaTitle")}
                    >
                      <span className="size-1.5 rounded-full bg-red-500" aria-hidden />
                      {t("metaInstantFormsMissingOnMeta")}
                    </span>
                  ) : null}
                  <p
                    className="mt-0.5 truncate font-mono text-[10px] text-muted-foreground"
                    title={form.meta_form_id}
                  >
                    {form.meta_form_id}
                  </p>
                </TableCell>
                <TableCell className="min-w-[8.5rem] whitespace-normal py-3 align-top sm:min-w-[9.5rem]">
                  <span className="text-xs leading-snug text-muted-foreground">{mappingLabel}</span>
                  {form.mappingStatus?.needsRemap ? (
                    <span
                      className="mt-1 flex w-fit items-center gap-1 rounded-full border border-amber-300 bg-amber-50 px-2 py-0.5 text-[11px] font-medium leading-4 text-amber-900"
                      title={t("metaInstantFormsRemapNeededTitle")}
                    >
                      <span className="size-1.5 rounded-full bg-amber-500" aria-hidden />
                      {t("metaInstantFormsRemapNeeded")}
                    </span>
                  ) : null}
                </TableCell>
                <TableCell className="w-[1%] whitespace-nowrap py-3 pr-5 pl-3 text-right align-top sm:pr-6">
                  <div className="flex flex-nowrap items-center justify-end gap-1.5">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={busy}
                      onClick={() => onConfigure(form)}
                      title={t("metaInstantFormsConfigure")}
                    >
                      {t("metaInstantFormsConfigureShort")}
                    </Button>
                    {form.enabled ? (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        disabled={busy}
                        onClick={() => onDisable(form)}
                      >
                        {t("metaInstantFormsDisable")}
                      </Button>
                    ) : (
                      <Button
                        type="button"
                        size="sm"
                        disabled={busy}
                        onClick={() => onEnable(form)}
                      >
                        {t("metaInstantFormsEnable")}
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            )
          })}
        </TableBody>
      </Table>
    </div>
  )
}
