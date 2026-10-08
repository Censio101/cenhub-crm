"use client"

import { FormEvent, useId, useMemo, useState, type ReactNode } from "react"
import {
  BuildingIcon,
  CalendarIcon,
  CheckIcon,
  ClipboardListIcon,
  LockIcon,
  Loader2Icon,
  MailIcon,
  PhoneIcon,
  SlidersHorizontalIcon,
  UserIcon,
  UserRoundPlusIcon,
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
import { isLeadFieldLocked, type LeadPatch } from "@/lib/db/lead-mapper"
import { IMAGE_LINK_TEXT_MAX } from "@/lib/lead-sheet/image-link"
import { builtinColumnLabelKey } from "@/lib/lead-sheet/lead-labels"
import { buildLeadPatch, isEmptyLeadPatch } from "@/lib/lead-sheet/lead-patch-diff"
import {
  groupNewLeadColumns,
  REQUIRED_NEW_LEAD_BUILTINS,
  validateNewLead,
} from "@/lib/lead-sheet/new-lead-form"
import type { LeadSheetTemplateColumn } from "@/lib/lead-sheet/types"
import { LEAD_STATUSES, emptyLead, isLeadStatusId, type Lead } from "@/lib/leads"
import { formatLeadDateTime, nowLeadDateTime } from "@/lib/leads/lead-datetime"
import { isServiceId } from "@/lib/performance/services"
import { cn } from "cn"

function currentDateText(): string {
  const now = nowLeadDateTime()
  return formatLeadDateTime(now.date, now.time)
}

const fieldClass =
  "h-11 w-full min-w-0 rounded-xl border border-[#e0d7cc] bg-white px-3 text-[15px] outline-none transition-colors placeholder:text-muted-foreground/60 hover:border-[#d3c3b2] focus:border-primary/60 focus:ring-2 focus:ring-primary/15 disabled:opacity-60"

const errorFieldClass = "border-red-400 hover:border-red-400 focus:border-red-500 focus:ring-red-200"

const FIELD_ICONS: Record<string, LucideIcon | undefined> = {
  fullName: UserIcon,
  email: MailIcon,
  phone: PhoneIcon,
  date: CalendarIcon,
}

type CustomColumn = Extract<LeadSheetTemplateColumn, { kind: "custom" }>

type CreateProps = {
  mode: "create"
  columns: LeadSheetTemplateColumn[]
  trigger: ReactNode
  /** Resolves when the lead was saved; throws (with a readable message) when it was not. */
  onCreate: (lead: Lead) => void | Promise<unknown>
}

type EditProps = {
  mode: "edit"
  columns: LeadSheetTemplateColumn[]
  /** The lead being edited. Mount the dialog while editing; it opens immediately. */
  lead: Lead
  /** Receives only the changed fields. Throws (with a readable message) when saving fails. */
  onSave: (patch: LeadPatch) => void | Promise<unknown>
  onClose: () => void
}

type Props = CreateProps | EditProps

/** Fields a Meta lead keeps in sync with Meta; editing them here would be overwritten. */
const LOCKED_PATCH_KEYS = [
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
  className,
  children,
}: {
  id: string
  label: string
  required?: boolean
  error?: string
  className?: string
  children: ReactNode
}) {
  return (
    <div className={cn("grid min-w-0 grid-cols-[minmax(0,1fr)] content-start gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-foreground">
        {label}
        {required ? <span className="ml-0.5 text-primary">*</span> : null}
      </label>
      {children}
      {error ? (
        <p role="alert" className="text-xs text-red-700">
          {error}
        </p>
      ) : null}
    </div>
  )
}

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
    <section className="min-w-0 rounded-2xl border border-[#e8e0d8] bg-[#faf8f6]/60 p-4">
      <h3 className="mb-3.5 flex items-center gap-2 text-[13px] font-semibold tracking-wide text-foreground uppercase">
        <span className="flex size-6 items-center justify-center rounded-md bg-white text-primary ring-1 ring-[#e8e0d8]">
          <Icon className="size-3.5" aria-hidden="true" />
        </span>
        {title}
      </h3>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-3.5 sm:grid-cols-2">{children}</div>
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
  const { segments, statuses } = useLeadSelectOptions()
  const { enabledServices } = useCompanyServices()
  const [open, setOpen] = useState(isEdit)
  const [draft, setDraft] = useState<Lead>(() =>
    editLead ? cloneLead(editLead) : emptyLead(`lead-${Date.now()}`)
  )
  // The date is text: the day first, then the time. A new lead starts as "now"; an edit starts
  // from the lead's own date and time.
  const [dateText, setDateText] = useState(() =>
    editLead ? formatLeadDateTime(editLead.date, editLead.time) : currentDateText()
  )
  const [busy, setBusy] = useState(false)
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState<string | null>(null)

  const sections = useMemo(() => groupNewLeadColumns(columns), [columns])
  const fieldId = (key: string) => `${formId}-${key}`
  const hasLockedFields = Boolean(editLead && editLead.source === "meta")
  /** True when this field is controlled by Meta for this lead (shown, but not editable). */
  const isLocked = (key: string) =>
    Boolean(editLead && isLeadFieldLocked(editLead, key as keyof LeadPatch))

  function openDialog() {
    setDraft(emptyLead(`lead-${Date.now()}`))
    setDateText(currentDateText())
    setFieldErrors({})
    setFormError(null)
    setOpen(true)
  }

  function closeDialog() {
    setOpen(false)
    if (props.mode === "edit") props.onClose()
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
        const patch: Record<string, unknown> = { ...buildLeadPatch(props.lead, result.lead) }
        // Fields Meta controls are never sent (the server would ignore them anyway).
        if (hasLockedFields) {
          for (const key of LOCKED_PATCH_KEYS) delete patch[key]
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
    const isDate = key === "date"
    const value = isDate ? dateText : draft[key]
    return (
      <Field
        key={key}
        id={fieldId(key)}
        label={label}
        required={required}
        error={error}
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
            className={cn(fieldClass, Icon && "pl-9", error && errorFieldClass)}
            value={typeof value === "string" ? value : ""}
            disabled={busy || isLocked(key)}
            title={isLocked(key) ? t("leadSheetEditLeadLockedField") : undefined}
            placeholder={isDate ? t("leadSheetDatePlaceholder") : undefined}
            aria-invalid={Boolean(error)}
            onChange={(e) => {
              clearFieldError(key)
              if (isDate) setDateText(e.target.value)
              else setDraft((d) => ({ ...d, [key]: e.target.value }))
            }}
          />
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
            onValueChange={(v) =>
              setDraft((d) => ({
                ...d,
                status: typeof v === "string" && isLeadStatusId(v) ? v : d.status,
              }))
            }
          >
            <SelectTrigger id={fieldId(key)} className={fieldClass} disabled={busy}>
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
                      "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
                      checked
                        ? "border-primary bg-primary/10 text-primary"
                        : "border-[#e0d7cc] bg-white text-muted-foreground hover:border-primary/40 hover:text-foreground"
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
          title={isEdit ? t("leadSheetEditLeadTitle") : t("leadSheetAddLeadTitle")}
          subtitle={
            isEdit
              ? draft.fullName.trim() || t("leadSheetEditLeadSubtitle")
              : t("leadSheetAddLeadSubtitle")
          }
          busy={busy}
          dismissible={!busy}
          onClose={closeDialog}
          footer={
            <>
              <span className="mr-auto hidden self-center text-xs text-muted-foreground sm:inline">
                {isEdit ? t("leadSheetEditLeadHint") : t("leadSheetAddLeadRequiredHint")}
              </span>
              <Button type="button" variant="ghost" disabled={busy} onClick={closeDialog}>
                {t("leadSheetCancel")}
              </Button>
              <Button type="submit" form={`${formId}-form`} disabled={busy} className="gap-2">
                {busy ? (
                  <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
                ) : isEdit ? (
                  <CheckIcon className="size-4" aria-hidden="true" />
                ) : (
                  <UserRoundPlusIcon className="size-4" aria-hidden="true" />
                )}
                {busy
                  ? t("leadSheetAddLeadSaving")
                  : isEdit
                    ? t("leadSheetEditLeadSave")
                    : t("leadSheetAddLeadSave")}
              </Button>
            </>
          }
        >
          <form
            id={`${formId}-form`}
            data-add-lead-form={formId}
            className="grid grid-cols-[minmax(0,1fr)] gap-4"
            onSubmit={(e) => void submit(e)}
            noValidate
          >
            {hasLockedFields ? (
              <p className="flex items-start gap-2 rounded-xl border border-[#f0dcc0] bg-[#fff8ee] px-3.5 py-2.5 text-[13px] text-[#7a4a12]">
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

            {sections.details.length > 0 ? (
              <Section icon={ClipboardListIcon} title={t("leadSheetAddLeadSectionDetails")}>
                {sections.details.map((key) => renderBuiltin(key))}
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
                className="rounded-xl border border-red-200 bg-red-50 px-3.5 py-2.5 text-[13px] text-red-800"
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
