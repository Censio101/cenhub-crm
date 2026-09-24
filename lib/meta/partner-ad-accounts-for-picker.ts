import { listMetaClients } from "@/lib/db/meta-clients-repository"
import { getOrganizationBySlug } from "@/lib/db/organizations-repository"
import { fetchPartnerAdAccounts } from "@/lib/meta/ad-accounts"
import { isSuggestedPartnerAccount, normalizePartnerAccountName } from "@/lib/meta/match-partner-account"
import type { SupabaseClient } from "@supabase/supabase-js"

export type PartnerAdAccountLinkStatus = "unlinked" | "linked_here" | "linked_other"

export type PartnerAdAccountPickerRow = {
  metaAdAccountId: string
  accountName: string
  currency: string
  linkStatus: PartnerAdAccountLinkStatus
  linkedSlug?: string
  linkedOrgName?: string
  suggested?: boolean
}

function normalizeAdAccountId(value: string): string {
  return String(value || "").trim().replace(/^act_/i, "")
}

function sortKey(row: PartnerAdAccountPickerRow): number {
  const linkOrder =
    row.suggested && row.linkStatus === "unlinked"
      ? 0
      : row.linkStatus === "unlinked"
        ? 1
        : row.linkStatus === "linked_here"
          ? 2
          : 3
  return linkOrder
}

export async function listPartnerAdAccountsForPicker(
  supabase: SupabaseClient,
  options: {
    q?: string
    forSlug?: string
    suggestName?: string
  } = {}
): Promise<{
  accounts: PartnerAdAccountPickerRow[]
  meta: { businessId: string | null; partnerFetchError: string | null }
}> {
  const forSlug = options.forSlug?.trim() || undefined
  const suggestName = options.suggestName?.trim() || undefined
  const q = options.q?.trim().toLowerCase() || ""

  const [clients, partner] = await Promise.all([
    listMetaClients(supabase),
    fetchPartnerAdAccounts(),
  ])

  const slugByAdAccount = new Map<string, { slug: string; name: string }>()
  for (const client of clients) {
    const id = normalizeAdAccountId(client.metaAdAccountId)
    if (id) {
      slugByAdAccount.set(id, { slug: client.slug, name: client.name })
    }
  }

  let forSlugNormalized: string | undefined
  if (forSlug) {
    const org = await getOrganizationBySlug(supabase, forSlug)
    forSlugNormalized = org?.slug
  }

  const rows: PartnerAdAccountPickerRow[] = partner.accounts.map((account) => {
    const id = normalizeAdAccountId(account.metaAdAccountId)
    const linked = slugByAdAccount.get(id)
    let linkStatus: PartnerAdAccountLinkStatus = "unlinked"
    if (linked) {
      linkStatus =
        forSlugNormalized && linked.slug === forSlugNormalized
          ? "linked_here"
          : "linked_other"
    }
    const suggested =
      suggestName && linkStatus === "unlinked"
        ? isSuggestedPartnerAccount(suggestName, account)
        : false

    return {
      metaAdAccountId: account.metaAdAccountId,
      accountName: account.accountName,
      currency: account.currency,
      linkStatus,
      linkedSlug: linked?.slug,
      linkedOrgName: linked?.name,
      suggested: suggested || undefined,
    }
  })

  let filtered = rows
  if (q) {
    filtered = rows.filter((row) => {
      const haystack = `${row.accountName} ${row.metaAdAccountId} act_${row.metaAdAccountId}`.toLowerCase()
      const qNorm = normalizePartnerAccountName(q) || q
      return haystack.includes(q) || normalizePartnerAccountName(row.accountName).includes(qNorm)
    })
  }

  filtered.sort((a, b) => {
    const order = sortKey(a) - sortKey(b)
    if (order !== 0) return order
    if (a.suggested && !b.suggested) return -1
    if (!a.suggested && b.suggested) return 1
    return a.accountName.localeCompare(b.accountName, "da")
  })

  return {
    accounts: filtered,
    meta: {
      businessId: partner.businessId,
      partnerFetchError: partner.error,
    },
  }
}
