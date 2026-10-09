"use client"

import { FormEvent, useEffect, useId, useMemo, useRef, useState, type ReactNode } from "react"
import { format } from "date-fns"
import { da, enUS } from "date-fns/locale"
import {
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  ClipboardListIcon,
  LockIcon,
  Loader2Icon,
  MailIcon,
  PencilIcon,
  PhoneIcon,
  SlidersHorizontalIcon,
  TriangleAlertIcon,
  UserIcon,
  UserRoundPlusIcon,
  type LucideIcon,
} from "lucide-react"

import { useCompanyServices } from "@/hooks/useCompanyServices"
import { ModalShell } from "@/components/admin/ModalShell"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { useLeadSelectOptions } from "@/components/leads/useLeadSelectOptions"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { LeadPatch } from "@/lib/db/lead-mapper"
import { isLeadFieldEditableInCrm } from "@/lib/leads/field-editability"
import { IMAGE_LINK_TEXT_MAX } from "@/lib/lead-sheet/image-link"
import {
  builtinColumnLabelKey,
  leadSourceLabelKey,
  leadStatusLabelKey,
} from "@/lib/lead-sheet/lead-labels"
import { buildLeadPatch, isEmptyLeadPatch } from "@/lib/lead-sheet/lead-patch-diff"
import {
  groupNewLeadColumns,
  REQUIRED_NEW_LEAD_BUILTINS,
  validateNewLead,
} from "@/lib/lead-sheet/new-lead-form"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import {
  LEAD_STATUSES,
  emptyLead,
  getLeadStatusClass,
  isLeadStatusId,
  type Lead,
} from "@/lib/leads"
import { findLeadByEmail, findLeadByPhone } from "@/lib/leads/duplicates"
import {
  formatLeadDateTime,
  nowLeadDateTime,
  parseLeadDateTime,
} from "@/lib/leads/lead-datetime"
import { lookupDanishCity } from "@/lib/leads/zip-city"
import { isOnboardingContactEmailValid } from "@/lib/onboarding/application-input"
import { isServiceId } from "@/lib/performance/services"
import { cn } from "cn"

function currentDateText(): string {
  const now = nowLeadDateTime()
  return formatLeadDateTime(now.date, now.time)
}

/** The database may return `HH:mm:ss`; the form works in `HH:mm`. */
function withShortTime(lead: Lead): Lead {
  return lead.time ? { ...lead, time: lead.time.slice(0, 5) } : lead
}

function leadSnapshot(draft: Lead, dateText: string): string {
  return JSON.stringify({ draft, dateText })
}

function dateFromIsoDay(value: string): Date | undefined {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) return undefined
  return new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
}

const fieldClass =
  "h-10 w-full min-w-0 rounded-lg border border-[#e6ded4] bg-white px-3 text-[14px] shadow-[0_1px_2px_rgba(26,18,8,0.04)] outline-none transition-colors placeholder:text-muted-foreground/50 hover:border-[#d8cabb] focus:border-primary/50 focus:ring-2 focus:ring-primary/10 disabled:bg-white disabled:opacity-100"

const errorFieldClass = "border-red-400 hover:border-red-400 focus:border-red-500 focus:ring-red-200"

const FIELD_ICONS: Record<string, LucideIcon | undefined> = {
  fullName: UserIcon,
  email: MailIcon,
  phone: PhoneIcon,
  date: CalendarIcon,
}

type CustomColumn = Extract<LeadSheetTemplateColumn, { kind: "custom" }>

type SharedProps = {
  /** Leads already on the sheet; used to warn about a repeated phone number or email. */
  existingLeads?: readonly Lead[]
}

type CreateProps = SharedProps & {
  mode: "create"
  columns: LeadSheetTemplateColumn[]
  trigger: ReactNode
  /** Resolves when the lead was saved; throws (with a readable message) when it was not. */
  onCreate: (lead: Lead) => void | Promise<unknown>
}

type EditProps = SharedProps & {
  mode: "edit"
  columns: LeadSheetTemplateColumn[]
  /** The lead being edited. Mount the dialog while editing; it opens immediately. */
  lead: Lead
  /** Receives only the changed fields. Throws (with a readable message) when saving fails. */
  onSave: (patch: LeadPatch) => void | Promise<unknown>
  onClose: () => void
}

type Props = CreateProps | EditProps

/** Meta-ingested fields that may be read-only when empty; filled values stay editable in CRM. */
const META_PATCH_KEYS = [
  "date",
  "time",
  "fullName",
  "email",
  "phone",
  "segment",
  "companyName",
  "address",
  "zipCode",
  "city",
  "metaAdId",
] as const

function Field({
  id,
  label,
  required,
  error,
  hint,
  className,
  children,
}: {
  id: string
  label: string
  required?: boolean
  error?: string
  /** A soft, non-blocking note shown under the field (hidden while there is an error). */
  hint?: string | null
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-1", className)}>
      <label htmlFor={id} className="text-[11px] font-semibold tracking-[0.04em] text-muted-foreground uppercase">
        {label}
        {required ? <span className="ml-0.5 text-primary">*</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      ) : hint ? (
        <p className="flex items-start gap-1.5 text-xs text-[#9a5b0a]">
          <TriangleAlertIcon className="mt-px size-3 shrink-0" aria-hidden="true" />
          <span>{hint}</span>
        </p>
      ) : null}
    </div>
  )
}

/** Day picker plus a time input, stored as the sheet's `YYYY-MM-DD HH:mm` text. */
function DateTimeInput({
  id,
  value,
  onChange,
  disabled,
  invalid,
  lockedTitle,
}: {
  id: string
  value: string
  onChange: (next: string) => void
  disabled?: boolean
  invalid?: boolean
  lockedTitle?: string
}) {
  const { locale, t } = useLanguage()
  const [open, setOpen] = useState(false)
  const parsed = parseLeadDateTime(value)
  const day = parsed ? dateFromIsoDay(parsed.date) : undefined
  const calendarLocale = locale === "da" ? da : enUS

  return (
    <div className="grid grid-cols-[minmax(0,1fr)_7rem] gap-2" title={lockedTitle}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger
          id={id}
          disabled={disabled}
          aria-invalid={invalid}
          className={cn(
            fieldClass,
            "flex cursor-pointer items-center gap-2 text-left disabled:cursor-not-allowed",
            !day && "text-muted-foreground/60",
            invalid && errorFieldClass
          )}
        >
          <CalendarIcon className="size-4 shrink-0 text-muted-foreground" aria-hidden="true" />
          <span className="truncate">
            {day ? format(day, "d MMM yyyy", { locale: calendarLocale }) : t("leadSheetPickDate")}
          </span>
        </PopoverTrigger>
        <PopoverContent className="w-auto p-2" align="start">
          <Calendar
            mode="single"
            locale={calendarLocale}
            selected={day}
            defaultMonth={day}
            onSelect={(next) => {
              if (!next) return
              onChange(formatLeadDateTime(format(next, "yyyy-MM-dd"), parsed?.time ?? null))
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
      <input
        type="time"
        className={fieldClass}
        value={parsed?.time ?? ""}
        disabled={disabled}
        aria-label={t("leadSheetTimeAria")}
        onChange={(e) =>
          onChange(formatLeadDateTime(parsed?.date ?? nowLeadDateTime().date, e.target.value || null))
        }
      />
    </div>
  )
}

/** One soft warm surface on the white dialog body; the fields inside stay white. */
function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: LucideIcon
  title: string
  children: ReactNode
}) {
  return (
    <section className="min-w-0 rounded-2xl border border-[#e8dccb] bg-[#f9f5ef] p-4 sm:p-5">
      <h3 className="mb-4 flex items-center gap-2.5 text-[14px] font-semibold tracking-tight text-foreground">
        <span className="flex size-7 items-center justify-center rounded-lg border border-[#eadfd0] bg-white text-foreground/70">
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        {title}
      </h3>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-x-4 gap-y-3.5 sm:grid-cols-2">{children}</div>
    </section>
  )
}

function cloneLead(lead: Lead): Lead {
  return {
    ...lead,
    serviceIds: [...(lead.serviceIds ?? [])],
    customFields: { ...(lead.customFields ?? {}) },
  }
}

function LeadFormDialog(props: Props) {
  const { columns } = props
  const isEdit = props.mode === "edit"
  const editLead = props.mode === "edit" ? props.lead : null
  const { t } = useLanguage()
  const formId = useId()
  const { segments } = useLeadSelectOptions()
  const { enabledServices } = useCompanyServices()
  const existingLeads = props.existingLeads
  const [open, setOpen] = useState(isEdit)
  /** The lead as it was when the popup opened; edits are measured and patched against this. */
  const [initialLead] = useState<Lead | null>(() => (editLead ? withShortTime(editLead) : null))
  const [draft, setDraft] = useState<Lead>(() =>
    initialLead ? cloneLead(initialLead) : emptyLead(`lead-${Date.now()}`)
  )
  // The date is text: the day first, then the time. A new lead starts as "now"; an edit starts
  // from the lead's own date and time.
  const [dateText, setDateText] = useState(() =>
    initialLead ? formatLeadDateTime(initialLead.date, initialLead.time) : currentDateText()
  )
  /** What a new lead looked like when it was last reset, to tell whether anything was typed. */
  const [baseline, setBaseline] = useState(() => leadSnapshot(draft, dateText))
  /** Sales price and profit appear once the lead is (or becomes) won, or already has values. */
  const [dealRevealed, setDealRevealed] = useState(() =>
    Boolean(
      initialLead &&
        (initialLead.status === "won" ||
          initialLead.salesPrice != null ||
          initialLead.profit != null)
    )
  )
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const zipLookupRef = useRef<AbortController | null>(null)

  const sections = useMemo(() => groupNewLeadColumns(columns), [columns])
  const fieldId = (key: string) => `${formId}-${key}`
  const hasLockedFields = Boolean(editLead && editLead.source === "meta")
  /** True when this field cannot be edited for this lead in CRM. */
  const isLocked = (key: string) =>
    Boolean(editLead && !isLeadFieldEditableInCrm(editLead, key as keyof LeadPatch))

  const dirty = useMemo(() => {
    if (initialLead) {
      const parsed = parseLeadDateTime(dateText)
      const candidate: Lead = parsed ? { ...draft, date: parsed.date, time: parsed.time } : draft
      return !isEmptyLeadPatch(buildLeadPatch(initialLead, candidate))
    }
    return leadSnapshot(draft, dateText) !== baseline
  }, [initialLead, draft, dateText, baseline])

  const showDealFields = dealRevealed || draft.status === "won"
  const detailKeys = sections.details.filter(
    (key) => (key !== "salesPrice" && key !== "profit") || showDealFields
  )

  const duplicatePhone = useMemo(
    () => (existingLeads ? findLeadByPhone(existingLeads, draft.phone, editLead?.id) : null),
    [existingLeads, draft.phone, editLead?.id]
  )
  const duplicateEmail = useMemo(
    () => (existingLeads ? findLeadByEmail(existingLeads, draft.email, editLead?.id) : null),
    [existingLeads, draft.email, editLead?.id]
  )
  /** When editing, only warn for a value the user actually changed. */
  const changedFromOriginal = (key: "phone" | "email") =>
    !initialLead || draft[key].trim() !== initialLead[key].trim()

  useEffect(() => {
    const controller = zipLookupRef
    return () => controller.current?.abort()
  }, [])

  function resetCreateForm() {
    const nextDraft = emptyLead(`lead-${Date.now()}`)
    const nextDateText = currentDateText()
    setDraft(nextDraft)
    setDateText(nextDateText)
    setBaseline(leadSnapshot(nextDraft, nextDateText))
    setDealRevealed(false)
    setFieldErrors({})
    setFormError(null)
    setConfirmDiscard(false)
  }

  function openDialog() {
    resetCreateForm()
    setOpen(true)
  }

  function closeDialog() {
    setOpen(false)
    setConfirmDiscard(false)
    if (props.mode === "edit") props.onClose()
  }

  /** Esc, the X and a backdrop click ask first when there is unsaved work. */
  function requestClose() {
    if (busy) return
    if (confirmDiscard) {
      setConfirmDiscard(false)
      return
    }
    if (dirty) {
      setConfirmDiscard(true)
      return
    }
    closeDialog()
  }

  function maybeFillCity(zip: string) {
    const digits = zip.trim()
    if (!/^\d{4}$/.test(digits) || !sections.company.includes("city") || isLocked("city")) return
    zipLookupRef.current?.abort()
    const controller = new AbortController()
    zipLookupRef.current = controller
    void lookupDanishCity(digits, controller.signal).then((city) => {
      if (!city || controller.signal.aborted) return
      setDraft((d) => (d.zipCode.trim() === digits && !d.city.trim() ? { ...d, city } : d))
    })
  }

  function clearFieldError(key: string) {
    setFormError(null)
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
    setConfirmDiscard(false)

    const result = validateNewLead({
      draft,
      dateText,
      columns,
      mode: isEdit ? "edit" : "create",
    })
    if (!result.ok) {
      setFieldErrors(
        Object.fromEntries(Object.entries(result.errors).map(([key, message]) => [key, t(message)]))
      )
      requestAnimationFrame(() => {
        document
          .querySelector<HTMLElement>(`[data-add-lead-form="${formId}"] [aria-invalid="true"]`)
          ?.focus()
      })
      return
    }

    setBusy(true)
    setFormError(null)
    try {
      if (props.mode === "edit") {
        const patch: Record<string, unknown> = {
          ...buildLeadPatch(initialLead ?? withShortTime(props.lead), result.lead),
        }
        if (hasLockedFields && editLead) {
          for (const key of META_PATCH_KEYS) {
            if (!isLeadFieldEditableInCrm(editLead, key)) delete patch[key]
          }
        }
        if (!isEmptyLeadPatch(patch as LeadPatch)) {
          await props.onSave(patch as LeadPatch)
        }
      } else {
        await props.onCreate(result.lead)
      }
      closeDialog()
    } catch (error) {
      const message = error instanceof Error ? error.message : ""
      const fallback = isEdit ? t("leadsSaveError") : t("leadsCreateError")
      setFormError(
        message && message !== "leadsCreateError" && message !== "leadsSaveError"
          ? message
          : fallback
      )
    } finally {
      setBusy(false)
    }
  }

  function renderTextInput(key: "fullName" | "email" | "phone" | "companyName" | "address" | "zipCode" | "city" | "date") {
    const label = t(builtinColumnLabelKey(key))
    const required = (REQUIRED_NEW_LEAD_BUILTINS as readonly string[]).includes(key)
    const error = fieldErrors[key]
    const Icon = FIELD_ICONS[key]
    const locked = isLocked(key)
    const lockedTitle = locked ? t("leadSheetEditLeadLockedField") : undefined

    if (key === "date") {
      return (
        <Field key={key} id={fieldId(key)} label={label} required={required} error={error}>
          <DateTimeInput
            id={fieldId(key)}
            value={dateText}
            disabled={busy || locked}
            invalid={Boolean(error)}
            lockedTitle={lockedTitle}
            onChange={(next) => {
              clearFieldError(key)
              setDateText(next)
            }}
          />
        </Field>
      )
    }

    let hint: string | null = null
    if (key === "phone" && duplicatePhone && changedFromOriginal("phone")) {
      hint = t("leadSheetDuplicatePhone", { name: duplicatePhone.fullName || "-" })
    } else if (key === "email" && duplicateEmail && changedFromOriginal("email")) {
      hint = t("leadSheetDuplicateEmail", { name: duplicateEmail.fullName || "-" })
    }

    return (
      <Field
        key={key}
        id={fieldId(key)}
        label={label}
        required={required}
        error={error}
        hint={hint}
        className={key === "fullName" || key === "address" ? "sm:col-span-2" : undefined}
      >
        <span className="relative block">
          {Icon ? (
            <Icon
              className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
          ) : null}
          <input
            id={fieldId(key)}
            type={key === "email" ? "email" : key === "phone" ? "tel" : "text"}
            inputMode={key === "zipCode" ? "numeric" : undefined}
            autoComplete="off"
            autoFocus={!isEdit && key === "fullName"}
            className={cn(fieldClass, Icon && "pl-9", locked && "pr-9", error && errorFieldClass)}
            value={draft[key]}
            disabled={busy || locked}
            title={lockedTitle}
            aria-invalid={Boolean(error)}
            onChange={(e) => {
              const next = e.target.value
              clearFieldError(key)
              setDraft((d) => ({ ...d, [key]: next }))
              if (key === "zipCode") maybeFillCity(next)
            }}
            onBlur={() => {
              if (key !== "email") return
              const next = draft.email.trim()
              if (next && !isOnboardingContactEmailValid(next)) {
                setFieldErrors((prev) => ({ ...prev, email: t("leadSheetEmailInvalid") }))
              }
            }}
          />
          {locked ? (
            <LockIcon
              className="pointer-events-none absolute top-1/2 right-3 size-3.5 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            />
          ) : null}
        </span>
      </Field>
    )
  }

  function renderBuiltin(key: string) {
    const label = t(builtinColumnLabelKey(key as Parameters<typeof builtinColumnLabelKey>[0]))

    if (key === "segment") {
      return (
        <Field key={key} id={fieldId(key)} label={label}>
          <Select
            value={draft.segment || null}
            onValueChange={(v) =>
              setDraft((d) => ({
                ...d,
                segment: typeof v === "string" ? (v as Lead["segment"]) : "",
              }))
            }
          >
            <SelectTrigger
              id={fieldId(key)}
              className={fieldClass}
              disabled={busy || isLocked("segment")}
            >
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
        </Field>
      )
    }

    if (key === "status") {
      return (
        <Field key={key} id={fieldId(key)} label={label}>
          <Select
            value={draft.status}
            onValueChange={(v) => {
              if (typeof v !== "string" || !isLeadStatusId(v)) return
              if (v === "won") setDealRevealed(true)
              setDraft((d) => ({ ...d, status: v }))
            }}
          >
            <SelectTrigger
              id={fieldId(key)}
              className={cn(
                "h-10 w-full min-w-0 rounded-lg px-3 text-[14px] font-medium",
                getLeadStatusClass(draft.status)
              )}
              disabled={busy}
            >
              <SelectValue placeholder={t("leadSheetSelectPlaceholder")}>
                {t(leadStatusLabelKey(draft.status))}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {LEAD_STATUSES.map((s) => (
                <SelectItem key={s.id} value={s.id} className={getLeadStatusClass(s.id)}>
                  {t(leadStatusLabelKey(s.id))}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </Field>
      )
    }

    if (key === "serviceIds") {
      return (
        <Field key={key} id={fieldId(key)} label={label} className="sm:col-span-2">
          {enabledServices.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t("leadSheetNoServices")}</p>
          ) : (
            <div id={fieldId(key)} className="flex flex-wrap gap-2">
              {enabledServices.map((s) => {
                const checked = Boolean(draft.serviceIds?.includes(s.id))
                return (
                  <button
                    key={s.id}
                    type="button"
                    aria-pressed={checked}
                    disabled={busy}
                    className={cn(
                      "rounded-full border px-3 py-1 text-[13px] font-medium transition-colors",
                      checked
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-[#e6ded4] bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground"
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
          )}
        </Field>
      )
    }

    if (key === "salesPrice" || key === "profit") {
      const val = key === "salesPrice" ? draft.salesPrice : draft.profit
      return (
        <Field key={key} id={fieldId(key)} label={label}>
          <span className="relative block">
            <input
              id={fieldId(key)}
              type="number"
              inputMode="decimal"
              step="any"
              className={cn(fieldClass, "pr-10")}
              value={val ?? ""}
              disabled={busy}
              onChange={(e) =>
                setDraft((d) => ({
                  ...d,
                  [key]: e.target.value === "" ? null : Number(e.target.value),
                }))
              }
            />
            <span className="pointer-events-none absolute top-1/2 right-3 -translate-y-1/2 text-xs text-muted-foreground">
              kr.
            </span>
          </span>
        </Field>
      )
    }

    if (
      key === "fullName" ||
      key === "email" ||
      key === "phone" ||
      key === "companyName" ||
      key === "address" ||
      key === "zipCode" ||
      key === "city" ||
      key === "date"
    ) {
      return renderTextInput(key)
    }
    return null
  }

  function renderCustom(col: CustomColumn) {
    const cf = col.customField
    const val = draft.customFields?.[cf.fieldKey]
    const error = fieldErrors[cf.fieldKey]
    const id = fieldId(`cf-${cf.fieldKey}`)
    const wide = cf.fieldType === "image" || cf.fieldType === "textarea"

    if (cf.fieldType === "image") {
      const link = (val && typeof val === "object" ? val : {}) as { text?: unknown; url?: unknown }
      const linkText = typeof link.text === "string" ? link.text : ""
      const linkUrl = typeof link.url === "string" ? link.url : ""
      const setLink = (nextText: string, nextUrl: string) =>
        setCustomValue(cf.fieldKey, { text: nextText, url: nextUrl })
      return (
        <Field key={col.id} id={id} label={cf.label} required={cf.required} error={error} className="sm:col-span-2">
          <div className="grid grid-cols-[minmax(0,1fr)] gap-2 sm:grid-cols-[minmax(0,11rem)_minmax(0,1fr)]">
            <input
              className={fieldClass}
              value={linkText}
              disabled={busy}
              maxLength={IMAGE_LINK_TEXT_MAX}
              aria-label={t("leadSheetImageLinkText")}
              placeholder={t("leadSheetImageLinkTextPlaceholder")}
              onChange={(e) => setLink(e.target.value, linkUrl)}
            />
            <input
              id={id}
              className={cn(fieldClass, error && errorFieldClass)}
              value={linkUrl}
              disabled={busy}
              inputMode="url"
              autoComplete="off"
              spellCheck={false}
              aria-label={t("leadSheetImageLinkUrl")}
              aria-invalid={Boolean(error)}
              placeholder={t("leadSheetImageLinkUrlPlaceholder")}
              onChange={(e) => setLink(linkText, e.target.value)}
            />
          </div>
        </Field>
      )
    }

    return (
      <Field
        key={col.id}
        id={id}
        label={cf.label}
        required={cf.required}
        error={error}
        className={wide ? "sm:col-span-2" : undefined}
      >
        {cf.fieldType === "textarea" ? (
          <textarea
            id={id}
            className={cn(fieldClass, "min-h-[5rem] py-2.5", error && errorFieldClass)}
            rows={3}
            disabled={busy}
            aria-invalid={Boolean(error)}
            value={typeof val === "string" ? val : ""}
            onChange={(e) => setCustomValue(cf.fieldKey, e.target.value)}
          />
        ) : cf.fieldType === "select" ? (
          <Select
            value={typeof val === "string" && val ? val : null}
            onValueChange={(v) => setCustomValue(cf.fieldKey, typeof v === "string" ? v : "")}
          >
            <SelectTrigger
              id={id}
              className={cn(fieldClass, error && errorFieldClass)}
              disabled={busy}
              aria-invalid={Boolean(error)}
            >
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
            id={id}
            type={
              cf.fieldType === "number"
                ? "number"
                : cf.fieldType === "date"
                  ? "date"
                  : cf.fieldType === "time"
                    ? "time"
                    : "text"
            }
            inputMode={cf.fieldType === "number" ? "decimal" : undefined}
            step={cf.fieldType === "number" ? "any" : undefined}
            className={cn(fieldClass, error && errorFieldClass)}
            disabled={busy}
            aria-invalid={Boolean(error)}
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
      </Field>
    )
  }

  return (
    <>
      {props.mode === "create" ? (
        <span className="inline-flex" onClick={openDialog} role="presentation">
          {props.trigger}
        </span>
      ) : null}
      {open ? (
        <ModalShell
          size="lg"
          fullscreenOnMobile
          bodyClassName="bg-white"
          icon={isEdit ? <PencilIcon /> : <UserRoundPlusIcon />}
          title={isEdit ? t("leadSheetEditLeadTitle") : t("leadSheetAddLeadTitle")}
          subtitle={
            isEdit
              ? [
                  draft.fullName.trim() || t("leadSheetEditLeadSubtitle"),
                  editLead?.source ? t(leadSourceLabelKey(editLead.source)) : null,
                ]
                  .filter(Boolean)
                  .join(" · ")
              : t("leadSheetAddLeadSubtitle")
          }
          busy={busy}
          dismissible={!busy}
          onClose={requestClose}
          footer={
            confirmDiscard ? (
              <>
                <span className="mr-auto text-[13px] font-medium text-foreground">
                  {t("leadSheetDiscardTitle")}
                </span>
                <Button type="button" variant="outline" onClick={() => setConfirmDiscard(false)}>
                  {t("leadSheetDiscardKeep")}
                </Button>
                <Button type="button" variant="destructive" onClick={closeDialog}>
                  {t("leadSheetDiscardConfirm")}
                </Button>
              </>
            ) : (
              <>
                <Button type="button" variant="outline" disabled={busy} onClick={requestClose}>
                  {t("leadSheetCancel")}
                </Button>
                <Button
                  type="submit"
                  form={`${formId}-form`}
                  disabled={busy || (isEdit && !dirty)}
                  className="gap-2"
                  title={t("leadSheetSaveShortcut")}
                >
                  {busy ? (
                    <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                  ) : isEdit ? (
                    <CheckIcon className="size-4" aria-hidden="true" />
                  ) : (
                    <UserRoundPlusIcon className="size-4" aria-hidden="true" />
                  )}
                  {busy
                    ? isEdit
                      ? t("leadSheetEditLeadSaving")
                      : t("leadSheetAddLeadSaving")
                    : isEdit
                      ? t("leadSheetEditLeadSave")
                      : t("leadSheetAddLeadSave")}
                </Button>
              </>
            )
          }
        >
          <form
            id={`${formId}-form`}
            data-add-lead-form={formId}
            className="grid grid-cols-[minmax(0,1fr)] gap-4"
            onSubmit={(e) => void submit(e)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault()
                if (!isEdit || dirty) void submit()
              }
            }}
            noValidate
          >
            {hasLockedFields ? (
              <p className="flex items-start gap-2 rounded-lg border border-[#f0dcc0] bg-[#fffaf2] px-3 py-2 text-[13px] text-[#7a4a12]">
                <LockIcon className="mt-0.5 size-3.5 shrink-0" aria-hidden="true" />
                {t("leadSheetEditLeadMetaNotice")}
              </p>
            ) : null}

            {sections.contact.length > 0 ? (
              <Section icon={UserIcon} title={t("leadSheetAddLeadSectionContact")}>
                {sections.contact.map((key) => renderBuiltin(key))}
              </Section>
            ) : null}

            {sections.company.length > 0 ? (
              <Section icon={BuildingIcon} title={t("leadSheetAddLeadSectionCompany")}>
                {sections.company.map((key) => renderBuiltin(key))}
              </Section>
            ) : null}

            {detailKeys.length > 0 ? (
              <Section icon={ClipboardListIcon} title={t("leadSheetAddLeadSectionDetails")}>
                {detailKeys.map((key) => renderBuiltin(key))}
              </Section>
            ) : null}

            {sections.custom.length > 0 ? (
              <Section icon={SlidersHorizontalIcon} title={t("leadSheetAddLeadMore")}>
                {sections.custom.map((col) => renderCustom(col))}
              </Section>
            ) : null}

            {formError ? (
              <p
                role="alert"
                className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-800"
              >
                {formError}
              </p>
            ) : null}
          </form>
        </ModalShell>
      ) : null}
    </>
  )
}

export function AddLeadDialog(props: Omit<CreateProps, "mode">) {
  return <LeadFormDialog mode="create" {...props} />
}

/**
 * Edits every field of one lead in a popup. Mount it while a lead is being edited
 * (for example `{editing ? <EditLeadDialog key={editing.id} … /> : null}`); it opens at once.
 */
export function EditLeadDialog(props: Omit<EditProps, "mode">) {
  return <LeadFormDialog mode="edit" {...props} />
}
