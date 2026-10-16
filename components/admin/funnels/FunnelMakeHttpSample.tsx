"use client"

import { useState } from "react"
import { CheckIcon, CopyIcon } from "lucide-react"

import { adminIconBoxClass, adminOutlineButtonClass } from "@/components/admin/admin-ui-styles"
import { ModalShell } from "@/components/admin/ModalShell"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

type Props = {
  funnelId: string
  variant: "fixed" | "mapping"
  url: string
  secret: string
  payload: Record<string, unknown>
  copiedKey: string | null
  onCopy: (key: string, value: string) => void
  /** No inner card chrome — sits inside a parent section (mapping tab). */
  embedded?: boolean
}

type GuideStep =
  | { title: string; body: string }
  | { title: string; body: string; method: string; url: string; urlCopyValue: string }
  | {
      title: string
      body: string
      headers: { name: string; value: string; copyValue: string }[]
    }
  | { title: string; body: string; json: string }

function GuideCopyIconButton({
  copyKey,
  value,
  disabled,
  copiedKey,
  onCopy,
  label,
}: {
  copyKey: string
  value: string
  disabled?: boolean
  copiedKey: string | null
  onCopy: (key: string, value: string) => void
  label: string
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      disabled={disabled}
      className="size-8 shrink-0 text-primary hover:bg-primary/10 disabled:opacity-40"
      aria-label={label}
      onClick={() => onCopy(copyKey, value)}
    >
      {copiedKey === copyKey ? (
        <CheckIcon className="size-4 text-emerald-600" aria-hidden />
      ) : (
        <CopyIcon className="size-4" aria-hidden />
      )}
    </Button>
  )
}

function GuideCopyTextButton({
  copyKey,
  value,
  disabled,
  copiedKey,
  onCopy,
  idleLabel,
  copiedLabel,
}: {
  copyKey: string
  value: string
  disabled?: boolean
  copiedKey: string | null
  onCopy: (key: string, value: string) => void
  idleLabel: string
  copiedLabel: string
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      disabled={disabled}
      className="h-7 shrink-0 gap-1 px-2 text-primary hover:bg-primary/10 disabled:opacity-40"
      onClick={() => onCopy(copyKey, value)}
    >
      {copiedKey === copyKey ? (
        <CheckIcon className="size-3.5 text-emerald-600" aria-hidden />
      ) : (
        <CopyIcon className="size-3.5" aria-hidden />
      )}
      {copiedKey === copyKey ? copiedLabel : idleLabel}
    </Button>
  )
}

type GuideNameValueRow = {
  name: string
  value: string
  copyKey?: string
  copyValue?: string
  copyDisabled?: boolean
  copyLabel?: string
}

function GuideRequestUrlBlock({
  method,
  url,
  urlCopyValue,
  copiedKey,
  onCopy,
  copyKeyPrefix,
}: {
  method: string
  url: string
  urlCopyValue: string
  copiedKey: string | null
  onCopy: (key: string, value: string) => void
  copyKeyPrefix: string
}) {
  const { t } = useLanguage()

  return (
    <div className="space-y-2 rounded-lg border border-primary/25 bg-[#f9f5ef]/80 px-3 py-2.5">
      <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1 text-xs">
        <span className="font-semibold text-foreground">{t("funnelMakeGuideRequestMethod")}</span>
        <span className="rounded-md bg-primary/10 px-2 py-0.5 font-mono text-[11px] font-medium text-primary">
          {method}
        </span>
      </div>
      <div className="space-y-1">
        <p className="text-xs font-semibold text-foreground">{t("funnelMakeGuideRequestUrl")}</p>
        <div className="flex items-start gap-2">
          <p className="min-w-0 flex-1 break-all font-mono text-[11px] text-foreground">{url}</p>
          <GuideCopyIconButton
            copyKey={`${copyKeyPrefix}-url`}
            value={urlCopyValue}
            disabled={!urlCopyValue}
            copiedKey={copiedKey}
            onCopy={onCopy}
            label={t("funnelCopyWebhook")}
          />
        </div>
      </div>
    </div>
  )
}

function GuideNameValueTable({
  rows,
  copiedKey,
  onCopy,
  headerNameLabel,
  headerValueLabel,
}: {
  rows: GuideNameValueRow[]
  copiedKey: string | null
  onCopy: (key: string, value: string) => void
  headerNameLabel: string
  headerValueLabel: string
}) {
  const { t } = useLanguage()

  return (
    <div className="overflow-hidden rounded-lg border border-primary/25">
      <div className="grid grid-cols-[minmax(7rem,0.9fr)_minmax(0,1.4fr)_auto] gap-2 border-b border-primary/20 bg-primary/10 px-2.5 py-1.5 text-[10px] font-semibold uppercase tracking-wide text-primary">
        <span>{headerNameLabel}</span>
        <span>{headerValueLabel}</span>
        <span className="sr-only">{t("portalCopy")}</span>
      </div>
      <ul className="divide-y divide-primary/10">
        {rows.map((row) => (
          <li
            key={row.name}
            className="grid grid-cols-[minmax(7rem,0.9fr)_minmax(0,1.4fr)_auto] items-center gap-2 bg-[#f9f5ef]/80 px-2.5 py-2"
          >
            <span className="font-mono text-[11px] font-medium text-foreground">{row.name}</span>
            <span className="min-w-0 break-all font-mono text-[11px] text-foreground">{row.value}</span>
            {row.copyKey && row.copyValue !== undefined ? (
              <GuideCopyIconButton
                copyKey={row.copyKey}
                value={row.copyValue}
                disabled={row.copyDisabled}
                copiedKey={copiedKey}
                onCopy={onCopy}
                label={row.copyLabel ?? `${t("portalCopy")} ${row.name}`}
              />
            ) : (
              <span className="size-8 shrink-0" aria-hidden />
            )}
          </li>
        ))}
      </ul>
    </div>
  )
}

function MakeSetupGuide({
  variant,
  url,
  secret,
  bodyHint,
  json,
  copiedKey,
  onCopy,
  copyKeyPrefix,
  onClose,
}: {
  variant: "fixed" | "mapping"
  url: string
  secret: string
  bodyHint: string
  json: string
  copiedKey: string | null
  onCopy: (key: string, value: string) => void
  copyKeyPrefix: string
  onClose: () => void
}) {
  const { t } = useLanguage()
  const trimmedSecret = secret.trim()
  const authorizationValue = trimmedSecret
    ? `Bearer ${trimmedSecret}`
    : t("funnelMakeGuideBearerMissing")

  const steps: GuideStep[] = [
    { title: t("funnelMakeGuideStep1Title"), body: t("funnelMakeGuideStep1Body") },
    { title: t("funnelMakeGuideStep2Title"), body: t("funnelMakeGuideStep2Body") },
    {
      title: t("funnelMakeGuideStep3Title"),
      body: t("funnelMakeGuideStep3Body"),
      method: "POST",
      url: url.trim() || t("funnelMakeGuideUrlPlaceholder"),
      urlCopyValue: url.trim(),
    },
    {
      title: t("funnelMakeGuideStep4Title"),
      body: t("funnelMakeGuideStep4Body"),
      headers: [
        {
          name: "Content-Type",
          value: "application/json",
          copyValue: "application/json",
        },
        {
          name: "Authorization",
          value: authorizationValue,
          copyValue: authorizationValue,
        },
      ],
    },
    {
      title: t("funnelMakeGuideStep5Title"),
      body: bodyHint,
      json,
    },
    ...(variant === "mapping"
      ? [{ title: t("funnelMakeGuideStep6MapTitle"), body: t("funnelMakeGuideStep6MapBody") }]
      : []),
  ]

  return (
    <ModalShell
      size="md"
      title={t("funnelMakeGuideTitle")}
      onClose={onClose}
      icon={<span className="text-sm font-bold leading-none">M</span>}
      bodyClassName="bg-[#faf8f6]"
      footer={
        <Button type="button" variant="ghost" onClick={onClose}>
          {t("leadSheetCancel")}
        </Button>
      }
    >
      <ol className="space-y-3">
        {steps.map((step, index) => (
          <li
            key={step.title}
            className="flex gap-3 rounded-xl border border-[#e8e0d8] bg-white p-3.5 shadow-sm"
          >
            <span
              className={cn(
                adminIconBoxClass("brand"),
                "size-8 shrink-0 rounded-full text-sm font-bold"
              )}
              aria-hidden
            >
              {index + 1}
            </span>
            <div className="min-w-0 flex-1 space-y-1.5">
              <p className="text-sm font-semibold text-foreground">{step.title}</p>
              {step.body.trim() ? (
                <p className="text-xs leading-relaxed text-muted-foreground">{step.body}</p>
              ) : null}
              {"method" in step && "url" in step ? (
                <GuideRequestUrlBlock
                  method={step.method}
                  url={step.url}
                  urlCopyValue={step.urlCopyValue}
                  copiedKey={copiedKey}
                  onCopy={onCopy}
                  copyKeyPrefix={copyKeyPrefix}
                />
              ) : null}
              {"json" in step && step.json ? (
                <div className="space-y-1.5">
                  <div className="flex justify-end">
                    <GuideCopyTextButton
                      copyKey={`${copyKeyPrefix}-json`}
                      value={step.json}
                      copiedKey={copiedKey}
                      onCopy={onCopy}
                      idleLabel={t("funnelCopyJson")}
                      copiedLabel={t("funnelCopied")}
                    />
                  </div>
                  <pre className="max-h-48 overflow-auto rounded-lg border border-primary/25 bg-[#fde6d2]/60 px-2.5 py-2 font-mono text-[11px] whitespace-pre-wrap text-foreground">
                    {step.json}
                  </pre>
                </div>
              ) : null}
              {"headers" in step && step.headers ? (
                <GuideNameValueTable
                  headerNameLabel={t("funnelMakeGuideHeaderNameCol")}
                  headerValueLabel={t("funnelMakeGuideHeaderValueCol")}
                  copiedKey={copiedKey}
                  onCopy={onCopy}
                  rows={step.headers.map((row) => ({
                    name: row.name,
                    value: row.value,
                    copyKey: `${copyKeyPrefix}-header-${row.name}`,
                    copyValue: row.copyValue,
                    copyLabel: `${t("portalCopy")} ${row.name}`,
                  }))}
                />
              ) : null}
            </div>
          </li>
        ))}
      </ol>
    </ModalShell>
  )
}

/** Copy JSON/cURL for Make.com; full steps live in the setup guide popup. */
export function FunnelMakeHttpSample({
  funnelId,
  variant,
  url,
  secret,
  payload,
  copiedKey,
  onCopy,
  embedded = false,
}: Props) {
  const { t } = useLanguage()
  const [guideOpen, setGuideOpen] = useState(false)
  const json = JSON.stringify(payload, null, 2)
  const jsonKey = `${funnelId}-${variant}-make-json`
  const bodyHint =
    variant === "fixed" ? t("funnelMakeHttpBodyFixed") : t("funnelMakeHttpBodyMapping")

  return (
    <>
      <div
        className={cn(
          "flex flex-wrap items-center justify-between gap-2 sm:gap-3",
          embedded ? "py-0.5" : "rounded-xl border border-[#e8e0d8] bg-white px-3 py-2.5 shadow-sm"
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span
            className={cn(
              adminIconBoxClass("brand"),
              "flex size-8 shrink-0 items-center justify-center rounded-lg text-sm font-bold"
            )}
            aria-hidden
          >
            M
          </span>
          <div className="min-w-0">
            <span className="text-sm font-semibold text-foreground">{t("funnelMakeHttpTitle")}</span>
            <p className="text-xs text-muted-foreground">{t("funnelMakeHttpCompactHint")}</p>
          </div>
        </div>
        <div className="flex shrink-0 flex-wrap items-center gap-2">
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
          <Button type="button" size="sm" className="shrink-0" onClick={() => setGuideOpen(true)}>
            {t("funnelMakeGuideOpen")}
          </Button>
        </div>
      </div>

      {guideOpen ? (
        <MakeSetupGuide
          variant={variant}
          url={url}
          secret={secret}
          bodyHint={bodyHint}
          json={json}
          copiedKey={copiedKey}
          onCopy={onCopy}
          copyKeyPrefix={`${funnelId}-${variant}-make-guide`}
          onClose={() => setGuideOpen(false)}
        />
      ) : null}
    </>
  )
}
