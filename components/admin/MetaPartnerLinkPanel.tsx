"use client"

import { useEffect, useState } from "react"
import { MoreHorizontalIcon } from "lucide-react"

import { MetaLinkedAccountPill } from "@/components/admin/MetaLinkedAccountPill"
import {
  MetaPartnerAccountPicker,
  type MetaPartnerAccountSelection,
} from "@/components/admin/MetaPartnerAccountPicker"
import { adminOutlineButtonClass } from "@/components/admin/admin-ui-styles"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { cn } from "cn"

export type LinkedMetaDisplay = {
  metaAdAccountId: string
  accountName: string
} | null

type Props = {
  organizationSlug?: string
  suggestName: string
  /** When set, shows linked pill until user chooses Change / Remove */
  linkedAccount: LinkedMetaDisplay
  /** Pending onboarding: selection only until approve */
  mode: "pending" | "linked"
  draftSelection: MetaPartnerAccountSelection
  onDraftSelectionChange: (value: MetaPartnerAccountSelection) => void
  onLinked?: () => void
  onLinkError?: (message: string) => void
  onLinkSuccess?: (message: string) => void
  disabled?: boolean
}

export function MetaPartnerLinkPanel({
  organizationSlug,
  suggestName,
  linkedAccount,
  mode,
  draftSelection,
  onDraftSelectionChange,
  onLinked,
  onLinkError,
  onLinkSuccess,
  disabled = false,
}: Props) {
  const { t } = useLanguage()
  const [linking, setLinking] = useState(false)
  const [unlinking, setUnlinking] = useState(false)
  const [isEditing, setIsEditing] = useState(false)

  const isLinked = Boolean(linkedAccount?.metaAdAccountId?.trim())
  const showPicker =
    mode === "pending" ? !draftSelection : !isLinked || isEditing

  useEffect(() => {
    setIsEditing(false)
  }, [linkedAccount?.metaAdAccountId])

  async function handleLink() {
    if (!organizationSlug || !draftSelection) return
    setLinking(true)
    try {
      const response = await fetch(
        `/api/admin/organizations/${organizationSlug}/meta/link-partner`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            metaAdAccountId: draftSelection.metaAdAccountId,
            accountName: draftSelection.accountName,
          }),
        }
      )
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error ?? t("onboardingMetaLinkError"))
      }
      onLinkSuccess?.(t("onboardingMetaLinkSuccess"))
      setIsEditing(false)
      onDraftSelectionChange(null)
      onLinked?.()
    } catch (linkError) {
      onLinkError?.(
        linkError instanceof Error ? linkError.message : t("onboardingMetaLinkError")
      )
    } finally {
      setLinking(false)
    }
  }

  async function handleUnlink() {
    if (!organizationSlug) return
    setUnlinking(true)
    try {
      const response = await fetch(
        `/api/admin/organizations/${organizationSlug}/meta/unlink-partner`,
        { method: "POST" }
      )
      const data = (await response.json()) as { error?: string }
      if (!response.ok) {
        throw new Error(data.error ?? t("onboardingMetaUnlinkError"))
      }
      onLinkSuccess?.(t("onboardingMetaUnlinkSuccess"))
      setIsEditing(false)
      onDraftSelectionChange(null)
      onLinked?.()
    } catch (unlinkError) {
      onLinkError?.(
        unlinkError instanceof Error ? unlinkError.message : t("onboardingMetaUnlinkError")
      )
    } finally {
      setUnlinking(false)
    }
  }

  const busy = linking || unlinking || disabled

  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="text-[13px] font-semibold text-foreground">{t("onboardingMetaLinkTitle")}</p>
          <p className="mt-1 text-[13px] leading-relaxed text-muted-foreground">
            {mode === "pending"
              ? t("onboardingMetaLinkOptional")
              : isLinked && !isEditing
                ? t("onboardingMetaLinkedHint")
                : t("onboardingMetaLaterHint")}
          </p>
        </div>
        {mode === "linked" && isLinked && !isEditing ? (
          <DropdownMenu>
            <DropdownMenuTrigger
              aria-label={t("onboardingMetaAccountActions")}
              disabled={busy}
              render={
                <Button
                  type="button"
                  variant="outline"
                  size="icon"
                  className={cn("size-9 shrink-0", adminOutlineButtonClass)}
                />
              }
            >
              <MoreHorizontalIcon className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-[11rem]">
              <DropdownMenuItem
                onClick={() => {
                  setIsEditing(true)
                  onDraftSelectionChange(null)
                }}
              >
                {t("onboardingMetaChangeAccount")}
              </DropdownMenuItem>
              <DropdownMenuItem
                variant="destructive"
                onClick={() => {
                  void handleUnlink()
                }}
              >
                {t("onboardingMetaRemoveLink")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}
      </div>

      {mode === "pending" && draftSelection && !isEditing ? (
        <div className="grid gap-2">
          <MetaLinkedAccountPill
            accountName={draftSelection.accountName}
            metaAdAccountId={draftSelection.metaAdAccountId}
            pending
          />
          <Button
            type="button"
            variant="outline"
            className={cn("h-9 w-fit px-3 text-[13px]", adminOutlineButtonClass)}
            disabled={busy}
            onClick={() => onDraftSelectionChange(null)}
          >
            {t("onboardingMetaClearSelection")}
          </Button>
        </div>
      ) : null}

      {mode === "linked" && isLinked && !isEditing && linkedAccount ? (
        <MetaLinkedAccountPill
          accountName={linkedAccount.accountName}
          metaAdAccountId={linkedAccount.metaAdAccountId}
        />
      ) : null}

      {mode === "linked" && !isLinked && !isEditing ? (
        <p className="text-[13px] text-muted-foreground">{t("onboardingMetaNotConnected")}</p>
      ) : null}

      {showPicker ? (
        <>
          <MetaPartnerAccountPicker
            organizationSlug={organizationSlug}
            suggestName={suggestName}
            value={draftSelection}
            onChange={onDraftSelectionChange}
            disabled={busy}
          />
          {mode === "linked" && organizationSlug ? (
            <div className="flex flex-wrap gap-2">
              <Button
                type="button"
                disabled={busy || !draftSelection}
                onClick={() => {
                  void handleLink()
                }}
                className="h-10 w-fit px-4"
              >
                {linking ? t("onboardingReviewWorking") : t("onboardingMetaLinkButton")}
              </Button>
              {isEditing ? (
                <Button
                  type="button"
                  variant="outline"
                  disabled={busy}
                  onClick={() => {
                    setIsEditing(false)
                    onDraftSelectionChange(null)
                  }}
                  className={cn("h-10 px-4", adminOutlineButtonClass)}
                >
                  {t("onboardingMetaCancelChange")}
                </Button>
              ) : null}
            </div>
          ) : null}
        </>
      ) : null}
    </div>
  )
}
