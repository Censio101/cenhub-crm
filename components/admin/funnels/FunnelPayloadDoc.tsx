"use client"

import { CheckIcon, CopyIcon } from "lucide-react"

import { adminOutlineButtonClass } from "@/components/admin/admin-ui-styles"
import { fieldTypeLabelKey } from "@/components/admin/lead-sheets/field-type-meta"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import type { MessageKey } from "@/lib/i18n"
import { CANONICAL_INBOUND_EXAMPLE } from "@/lib/leads/inbound-payload"
import {
  STANDARD_WEBHOOK_FIELDS,
  buildCurlExample,
  buildExamplePayload,
  type WebhookCustomFieldSpec,
  type WebhookLeadSheetInfo,
} from "@/lib/lead-sheet/webhook-spec"
import { cn } from "cn"

type Props = {
  funnelId: string
  url: string
  secret: string
  leadSheet: WebhookLeadSheetInfo | null
  copiedKey: string | null
  onCopy: (key: string, value: string) => void
}

const thClass = "px-3 py-2 text-left font-medium text-muted-foreground"
const tdClass = "px-3 py-2 align-top"

function formatHint(type: string, options: string[] | undefined, t: (key: MessageKey) => string) {
  const hint = t(`webhookFormat_${type}` as MessageKey)
  return hint.replace("{options}", options?.length ? options.join(", ") : "—")
}

/** Native `<details>` with the browser's default arrow — keyboard and a11y for free. */
function CollapsibleSection({
  title,
  defaultOpen,
  children,
}: {
  title: string
  defaultOpen?: boolean
  children: React.ReactNode
}) {
  return (
    <details open={defaultOpen}>
      <summary className="cursor-pointer font-medium text-foreground">{title}</summary>
      <div className="mt-2 space-y-2">{children}</div>
    </details>
  )
}

function FieldsTable({ children }: { children: React.ReactNode }) {
  return (
    <div className="overflow-x-auto rounded-lg border border-[#e8e0d8]">
      <table className="w-full min-w-[32rem] border-collapse text-xs">{children}</table>
    </div>
  )
}

/** Expected webhook body for one funnel, generated from the client's active lead sheet. */
export function FunnelPayloadDoc({ funnelId, url, secret, leadSheet, copiedKey, onCopy }: Props) {
  const { t } = useLanguage()
  const customFields: WebhookCustomFieldSpec[] = leadSheet?.customFields ?? []
  const payload = buildExamplePayload(
    CANONICAL_INBOUND_EXAMPLE as Record<string, unknown>,
    customFields
  )
  const json = JSON.stringify(payload, null, 2)
  const curl = buildCurlExample(url, secret, payload)
  const jsonKey = `${funnelId}-json`
  const curlKey = `${funnelId}-curl`

  return (
    <section className="space-y-3 text-sm">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="font-medium text-foreground">{t("funnelCanonicalDoc")}</p>
        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={adminOutlineButtonClass}
            onClick={() => onCopy(jsonKey, json)}
          >
            {copiedKey === jsonKey ? (
              <CheckIcon className="size-4 text-emerald-600" aria-hidden />
            ) : (
              <CopyIcon className="size-4" aria-hidden />
            )}
            {copiedKey === jsonKey ? t("funnelCopied") : t("funnelCopyJson")}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={adminOutlineButtonClass}
            onClick={() => onCopy(curlKey, curl)}
          >
            {copiedKey === curlKey ? (
              <CheckIcon className="size-4 text-emerald-600" aria-hidden />
            ) : (
              <CopyIcon className="size-4" aria-hidden />
            )}
            {copiedKey === curlKey ? t("funnelCopied") : t("webhookCopyCurl")}
          </Button>
        </div>
      </div>

      <pre className="max-h-72 overflow-auto rounded-lg border border-[#e8e0d8] bg-[#faf8f5] p-3 font-mono text-[11px] leading-relaxed text-muted-foreground">
        {json}
      </pre>
      {customFields.length === 0 ? null : (
        <CollapsibleSection title={t("webhookSheetFields")} defaultOpen>
          <FieldsTable>
            <thead className="bg-[#faf8f6]">
              <tr>
                <th className={thClass}>{t("webhookColKey")}</th>
                <th className={thClass}>{t("webhookColLabel")}</th>
                <th className={thClass}>{t("webhookColType")}</th>
                <th className={thClass}>{t("webhookColFormat")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#efe7de]">
              {customFields.map((field) => (
                <tr key={field.key}>
                  <td className={cn(tdClass, "font-mono text-[12px] text-foreground")}>
                    customFields.{field.key}
                  </td>
                  <td className={tdClass}>{field.label}</td>
                  <td className={tdClass}>{t(fieldTypeLabelKey(field.type))}</td>
                  <td className={cn(tdClass, "text-muted-foreground")}>
                    {formatHint(field.type, field.options, t)}
                  </td>
                </tr>
              ))}
            </tbody>
          </FieldsTable>
        </CollapsibleSection>
      )}

      <CollapsibleSection title={t("webhookStandardFields")}>
        <div>
          <FieldsTable>
            <thead className="bg-[#faf8f6]">
              <tr>
                <th className={thClass}>{t("webhookColKey")}</th>
                <th className={thClass}>{t("webhookColRequired")}</th>
                <th className={thClass}>{t("webhookColFormat")}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#efe7de]">
              {STANDARD_WEBHOOK_FIELDS.map((field) => (
                <tr key={field.key}>
                  <td className={cn(tdClass, "font-mono text-[12px] text-foreground")}>
                    {field.key}
                  </td>
                  <td className={tdClass}>
                    {field.required === "recommended"
                      ? t("webhookRecommended")
                      : t("webhookOptional")}
                  </td>
                  <td className={cn(tdClass, "text-muted-foreground")}>
                    {formatHint(field.type, undefined, t)}
                  </td>
                </tr>
              ))}
            </tbody>
          </FieldsTable>
        </div>
      </CollapsibleSection>
    </section>
  )
}
