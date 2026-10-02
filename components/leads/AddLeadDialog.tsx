"use client"

import { FormEvent, useMemo, useState } from "react"
import {
  CalendarIcon,
  Loader2Icon,
  MailIcon,
  PhoneIcon,
  UserIcon,
  type LucideIcon,
} from "lucide-react"

import { useCompanyServices } from "@/hooks/useCompanyServices"
import { ModalShell } from "@/components/admin/ModalShell"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useLeadSelectOptions } from "@/components/leads/useLeadSelectOptions"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { IMAGE_LINK_TEXT_MAX, buildImageLinkValue } from "@/lib/lead-sheet/image-link"
import { imageLinkErrorMessageKey } from "@/lib/lead-sheet/image-link-messages"
import { builtinColumnLabelKey } from "@/lib/lead-sheet/lead-labels"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import { isEmptyCustomFieldValue } from "@/lib/lead-sheet/validate"
import { LEAD_STATUSES, emptyLead, isLeadStatusId, type Lead } from "@/lib/leads"
import { formatLeadDateTime, nowLeadDateTime, parseLeadDateTime } from "@/lib/leads/lead-datetime"
import { isServiceId } from "@/lib/performance/services"
import { cn } from "cn"

function currentDateText(): string {
  const now = nowLeadDateTime()
  return formatLeadDateTime(now.date, now.time)
}

const fieldClass =
  "h-10 w-full rounded-xl border border-[#d3c3b2] bg-white px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"

/** Full name, Email and Phone must be filled in here (senders and forms only get a warning). */
const REQUIRED_BUILTINS = ["fullName", "email", "phone"] as const

/** Name, email, phone and date sit first. Every other column is shown under them, and stays optional. */
const CORE_BUILTINS = ["date", "fullName", "email", "phone"] as const

const CORE_ICONS = {
  fullName: UserIcon,
  email: MailIcon,
  phone: PhoneIcon,
  date: CalendarIcon,
} as const

type Props = {
  columns: LeadSheetTemplateColumn[]
  trigger: React.ReactNode
  onCreate: (lead: Lead) => void | Promise<unknown>
}

export function AddLeadDialog({ columns, trigger, onCreate }: Props) {
  const { t } = useLanguage()
  const { segments, statuses } = useLeadSelectOptions()
  const { enabledServices } = useCompanyServices()
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<Lead>(() => emptyLead(`lead-${Date.now()}`))
  // The date is text: the day first, then the time. It starts as "now" every time the popup opens.
  const [dateText, setDateText] = useState(() => currentDateText())
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})

  const hasBuiltin = (key: string) =>
    columns.some((col) => col.kind === "builtin" && col.builtinKey === key)
  const moreBuiltins = useMemo(
    () =>
      columns.flatMap((col) =>
        col.kind === "builtin" &&
        col.builtinKey !== "metaAdId" &&
        !(CORE_BUILTINS as readonly string[]).includes(col.builtinKey)
          ? [col.builtinKey]
          : []
      ),
    [columns]
  )
  const customColumns = useMemo(
    () => columns.flatMap((col) => (col.kind === "custom" ? [col] : [])),
    [columns]
  )

  function resetDraft() {
    setDraft(emptyLead(`lead-${Date.now()}`))
    setDateText(currentDateText())
    setFieldErrors({})
  }

  function openDialog() {
    resetDraft()
    setOpen(true)
  }

  /** Validates custom fields; returns cleaned values or per-field errors. */
  function prepareCustomFields(): {
    customFields: Record<string, unknown>
    errors: Record<string, string>
  } {
    const customFields = { ...draft.customFields }
    const errors: Record<string, string> = {}
    for (const col of columns) {
      if (col.kind !== "custom") continue
      const key = col.customField.fieldKey
      const raw = customFields[key]

      if (col.customField.fieldType === "image") {
        const link = (raw && typeof raw === "object" ? raw : {}) as {
          text?: unknown
          url?: unknown
        }
        const text = typeof link.text === "string" ? link.text : ""
        const url = typeof link.url === "string" ? link.url : ""
        if (!text.trim() && !url.trim()) {
          delete customFields[key]
          continue
        }
        const built = buildImageLinkValue(text, url)
        if (built.ok) customFields[key] = built.value
        else errors[key] = t(imageLinkErrorMessageKey(built.error))
        continue
      }

      if (isEmptyCustomFieldValue(raw)) delete customFields[key]
    }
    return { customFields, errors }
  }

  function clearFieldError(key: string) {
    setFieldErrors((prev) => {
      if (!prev[key]) return prev
      const rest = { ...prev }
      delete rest[key]
      return rest
    })
  }

  function setCustomValue(fieldKey: string, value: unknown) {
    clearFieldError(fieldKey)
    setDraft((d) => ({ ...d, customFields: { ...d.customFields, [fieldKey]: value } }))
  }

  async function submit(event?: FormEvent) {
    event?.preventDefault()
    if (busy) return
    const { customFields, errors } = prepareCustomFields()
    for (const key of REQUIRED_BUILTINS) {
      if (!draft[key].trim()) errors[key] = t("leadSheetFieldRequired")
    }
    const parsedDate = parseLeadDateTime(dateText)
    if (!parsedDate) errors.date = t("leadSheetDateInvalid")
    if (Object.keys(errors).length > 0 || !parsedDate) {
      setFieldErrors(errors)
      return
    }
    setBusy(true)
    try {
      await onCreate({ ...draft, date: parsedDate.date, time: parsedDate.time, customFields })
      setOpen(false)
    } finally {
      setBusy(false)
    }
  }

  function renderBuiltin(key: string) {
    if (key === "metaAdId") return null
    const label = t(builtinColumnLabelKey(key as Parameters<typeof builtinColumnLabelKey>[0]))
    if (key === "segment") {
      return (
        <label key={key} className="grid gap-1 text-sm">
          <span className="font-medium">{label}</span>
          <Select
            value={draft.segment || null}
            onValueChange={(v) =>
              setDraft((d) => ({
                ...d,
                segment: typeof v === "string" ? (v as Lead["segment"]) : "",
              }))
            }
          >
            <SelectTrigger className={fieldClass}>
              <SelectValue placeholder={t("leadSheetSelectPlaceholder")}>
                {segments.find((s) => s.id === draft.segment)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {segments.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      )
    }
    if (key === "serviceIds") {
      return (
        <div key={key} className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-medium">{label}</span>
          <div className="flex flex-wrap gap-2">
            {enabledServices.map((s) => {
              const checked = draft.serviceIds?.includes(s.id)
              return (
                <button
                  key={s.id}
                  type="button"
                  className={cn(
                    "rounded-full border px-3 py-1 text-sm transition-colors",
                    checked
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-[#d3c3b2] hover:border-primary/40"
                  )}
                  onClick={() =>
                    setDraft((d) => {
                      const ids = d.serviceIds ?? []
                      const next = checked ? ids.filter((x) => x !== s.id) : [...ids, s.id]
                      const first = next[0] ?? ""
                      return {
                        ...d,
                        serviceIds: next,
                        service: isServiceId(first) ? first : "",
                      }
                    })
                  }
                >
                  {s.label}
                </button>
              )
            })}
          </div>
        </div>
      )
    }
    if (key === "status") {
      return (
        <label key={key} className="grid gap-1 text-sm">
          <span className="font-medium">{label}</span>
          <Select
            value={draft.status}
            onValueChange={(v) =>
              setDraft((d) => ({
                ...d,
                status: typeof v === "string" && isLeadStatusId(v) ? v : d.status,
              }))
            }
          >
            <SelectTrigger className={fieldClass}>
              <SelectValue placeholder={t("leadSheetSelectPlaceholder")}>
                {statuses.find((x) => x.id === draft.status)?.label}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.id} value={s.id}>
                  {statuses.find((x) => x.id === s.id)?.label ?? s.id}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </label>
      )
    }
    if (key === "salesPrice" || key === "profit") {
      const val = key === "salesPrice" ? draft.salesPrice : draft.profit
      return (
        <label key={key} className="grid gap-1 text-sm">
          <span className="font-medium">{label}</span>
          <input
            type="number"
            className={fieldClass}
            value={val ?? ""}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                [key]: e.target.value === "" ? null : Number(e.target.value),
              }))
            }
          />
        </label>
      )
    }

    const isRequired = (REQUIRED_BUILTINS as readonly string[]).includes(key)
    const isDate = key === "date"
    const error = fieldErrors[key]
    const value = isDate ? dateText : draft[key as keyof Lead]
    const Icon = (CORE_ICONS as Record<string, LucideIcon | undefined>)[key]
    return (
      <label key={key} className="grid gap-1 text-sm">
        <span className="font-medium">
          {label}
          {isRequired ? <span className="text-primary"> *</span> : null}
        </span>
        <span className="relative block">
          {Icon ? (
            <Icon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
          ) : null}
          <input
            type={key === "email" ? "email" : "text"}
            className={cn(fieldClass, Icon && "pl-9", error && "border-red-400")}
            value={typeof value === "string" ? value : ""}
            disabled={busy}
            placeholder={isDate ? t("leadSheetDatePlaceholder") : undefined}
            aria-invalid={Boolean(error)}
            onChange={(e) => {
              clearFieldError(key)
              if (isDate) setDateText(e.target.value)
              else setDraft((d) => ({ ...d, [key]: e.target.value }))
            }}
          />
        </span>
        {error ? (
          <span role="alert" className="text-xs text-red-700">
            {error}
          </span>
        ) : null}
      </label>
    )
  }

  function renderCustom(col: Extract<LeadSheetTemplateColumn, { kind: "custom" }>) {
    const cf = col.customField
    const val = draft.customFields?.[cf.fieldKey]
    const error = fieldErrors[cf.fieldKey]

    if (cf.fieldType === "image") {
      const link = (val && typeof val === "object" ? val : {}) as {
        text?: unknown
        url?: unknown
      }
      const linkText = typeof link.text === "string" ? link.text : ""
      const linkUrl = typeof link.url === "string" ? link.url : ""
      const setLink = (nextText: string, nextUrl: string) =>
        setCustomValue(cf.fieldKey, { text: nextText, url: nextUrl })
      return (
        <div key={col.id} className="grid gap-1 text-sm sm:col-span-2">
          <span className="font-medium">{cf.label}</span>
          <div className="grid gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
            <input
              className={fieldClass}
              value={linkText}
              maxLength={IMAGE_LINK_TEXT_MAX}
              aria-label={t("leadSheetImageLinkText")}
              placeholder={t("leadSheetImageLinkTextPlaceholder")}
              onChange={(e) => setLink(e.target.value, linkUrl)}
            />
            <input
              className={cn(fieldClass, error && "border-red-400")}
              value={linkUrl}
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              aria-label={t("leadSheetImageLinkUrl")}
              aria-invalid={Boolean(error)}
              placeholder={t("leadSheetImageLinkUrlPlaceholder")}
              onChange={(e) => setLink(linkText, e.target.value)}
            />
          </div>
          {error ? (
            <p role="alert" className="text-xs text-red-700">
              {error}
            </p>
          ) : null}
        </div>
      )
    }

    return (
      <label key={col.id} className="grid gap-1 text-sm">
        <span className="font-medium">{cf.label}</span>
        {cf.fieldType === "textarea" ? (
          <textarea
            className={cn(fieldClass, "min-h-[4rem] py-2", error && "border-red-400")}
            rows={3}
            value={typeof val === "string" ? val : ""}
            onChange={(e) => setCustomValue(cf.fieldKey, e.target.value)}
          />
        ) : cf.fieldType === "select" ? (
          <Select
            value={typeof val === "string" && val ? val : null}
            onValueChange={(v) => setCustomValue(cf.fieldKey, typeof v === "string" ? v : "")}
          >
            <SelectTrigger className={cn(fieldClass, error && "border-red-400")}>
              <SelectValue placeholder={t("leadSheetSelectPlaceholder")}>
                {typeof val === "string" && val ? val : undefined}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {(cf.config.options ?? []).map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        ) : (
          <input
            type={
              cf.fieldType === "number"
                ? "number"
                : cf.fieldType === "date"
                  ? "date"
                  : cf.fieldType === "time"
                    ? "time"
                    : "text"
            }
            className={cn(fieldClass, error && "border-red-400")}
            value={typeof val === "string" || typeof val === "number" ? String(val) : ""}
            onChange={(e) =>
              setCustomValue(
                cf.fieldKey,
                cf.fieldType === "number"
                  ? e.target.value === ""
                    ? null
                    : Number(e.target.value)
                  : e.target.value
              )
            }
          />
        )}
        {error ? (
          <span role="alert" className="text-xs text-red-700">
            {error}
          </span>
        ) : null}
      </label>
    )
  }

  return (
    <>
      <span className="inline-flex" onClick={openDialog} role="presentation">
        {trigger}
      </span>
      {open ? (
        <ModalShell
          size="md"
          title={t("leadSheetAddLeadTitle")}
          busy={busy}
          dismissible={!busy}
          onClose={() => setOpen(false)}
          footer={
            <>
              <Button type="button" variant="ghost" disabled={busy} onClick={() => setOpen(false)}>
                {t("leadSheetCancel")}
              </Button>
              <Button type="submit" form="add-lead-form" disabled={busy}>
                {busy ? <Loader2Icon className="size-4 animate-spin" /> : null}
                {t("leadSheetAddLeadSave")}
              </Button>
            </>
          }
        >
          <form
            id="add-lead-form"
            className="grid gap-4"
            onSubmit={(e) => void submit(e)}
            noValidate
          >
            <div className="grid gap-3 sm:grid-cols-2">
              {hasBuiltin("fullName") ? (
                <div className="sm:col-span-2">{renderBuiltin("fullName")}</div>
              ) : null}
              {hasBuiltin("email") ? renderBuiltin("email") : null}
              {hasBuiltin("phone") ? renderBuiltin("phone") : null}
              {hasBuiltin("date") ? (
                <div className="sm:col-span-2">{renderBuiltin("date")}</div>
              ) : null}
              {moreBuiltins.map((key) => renderBuiltin(key))}
              {customColumns.map((col) => renderCustom(col))}
            </div>
          </form>
        </ModalShell>
      ) : null}
    </>
  )
}
