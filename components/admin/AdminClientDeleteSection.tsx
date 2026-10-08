"use client"

import { useRouter } from "next/navigation"
import { useState } from "react"
import { Loader2Icon, Trash2Icon } from "lucide-react"

import { useAdminClient } from "@/components/admin/AdminClientContext"
import {
  adminFieldClass,
  adminIconBoxClass,
  adminSectionCardClass,
} from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { formatClientDisplayName } from "@/lib/admin/format-client-display-name"
import { Button } from "@/components/ui/button"
import { cn } from "cn"

export function AdminClientDeleteSection() {
  const router = useRouter()
  const { t } = useLanguage()
  const { slug, organization } = useAdminClient()
  const [confirmSlug, setConfirmSlug] = useState("")
  const [deleting, setDeleting] = useState(false)
  const [error, setError] = useState<string | null>(null)

  if (!organization) return null

  const displayName = formatClientDisplayName(organization.name)
  const trimmedConfirm = confirmSlug.trim()
  const slugMatches = trimmedConfirm === organization.slug
  const slugTouched = trimmedConfirm.length > 0
  const canDelete = slugMatches && !deleting

  async function handleDelete() {
    if (!canDelete) return
    if (!window.confirm(t("clientDeleteConfirmDialog", { name: displayName }))) return

    setDeleting(true)
    setError(null)

    try {
      const response = await fetch(`/api/admin/organizations/${slug}`, { method: "DELETE" })
      const data = (await response.json()) as { error?: string }
      if (!response.ok) throw new Error(data.error ?? t("clientDeleteError"))

      router.push("/admin/clients")
      router.refresh()
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : t("clientDeleteError"))
    } finally {
      setDeleting(false)
    }
  }

  return (
    <section className={cn(adminSectionCardClass, "overflow-hidden border-red-200")}>
      <div className="flex items-start gap-3 border-b border-red-100 bg-red-50/90 px-5 py-3.5">
        <span className={adminIconBoxClass("danger")} aria-hidden="true">
          <Trash2Icon className="size-[18px]" />
        </span>
        <div className="min-w-0 flex-1 pt-0.5">
          <h2 className="text-base font-semibold text-red-950">{t("clientDeleteTitle")}</h2>
          <p className="mt-0.5 text-[13px] leading-relaxed text-red-900/75">{t("clientDeleteLead")}</p>
        </div>
      </div>

      <div className="px-5 py-4">
        <p className="text-[13px] leading-relaxed text-muted-foreground">
          {t("clientDeleteHint", { slug: organization.slug })}
        </p>

        <div className="mt-3 rounded-xl border border-[#e8e0d8] bg-white px-3.5 pt-4 pb-3.5">
          <label
            className="mb-2 block text-[13px] leading-5 font-semibold text-foreground"
            htmlFor="client-delete-slug"
          >
            {t("clientDeleteConfirmLabel")}
          </label>
          <input
            id="client-delete-slug"
            className={cn(
              adminFieldClass,
              "font-mono text-[14px]",
              slugTouched &&
                !slugMatches &&
                "border-red-300 focus:border-red-400 focus:ring-red-200/80"
            )}
            value={confirmSlug}
            onChange={(event) => setConfirmSlug(event.target.value)}
            placeholder={organization.slug}
            autoComplete="off"
            spellCheck={false}
            disabled={deleting}
            aria-invalid={slugTouched && !slugMatches}
          />
          {slugTouched && !slugMatches ? (
            <p className="mt-2 text-[12px] text-red-700" role="status">
              {t("clientDeleteSlugMismatch")}
            </p>
          ) : null}
        </div>

        {error ? (
          <p
            className="mt-3 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-[13px] text-red-800"
            role="alert"
          >
            {error}
          </p>
        ) : null}

        <div className="mt-4 flex flex-col gap-3 border-t border-[#e8e0d8] pt-4 sm:flex-row sm:items-center sm:justify-end">
          <Button
            type="button"
            variant="destructive"
            className="h-10 w-full gap-2 sm:w-auto"
            disabled={!canDelete}
            aria-busy={deleting}
            onClick={() => void handleDelete()}
          >
            {deleting ? (
              <Loader2Icon className="size-4 animate-spin" aria-hidden="true" />
            ) : (
              <Trash2Icon className="size-4" aria-hidden="true" />
            )}
            {deleting ? t("clientDeleteWorking") : t("clientDeleteButton")}
          </Button>
        </div>
      </div>
    </section>
  )
}
