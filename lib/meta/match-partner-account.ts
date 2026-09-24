export function normalizePartnerAccountName(value: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, "")
}

export function matchPartnerAdAccountId(
  organizationName: string,
  accounts: Array<{ metaAdAccountId: string; accountName: string }>
): string | null {
  const needle = normalizePartnerAccountName(organizationName)
  if (!needle) return null

  const exact = accounts.find(
    (account) => normalizePartnerAccountName(account.accountName) === needle
  )
  if (exact) return exact.metaAdAccountId

  const partial = accounts.find((account) => {
    const name = normalizePartnerAccountName(account.accountName)
    return name.includes(needle) || needle.includes(name)
  })
  return partial?.metaAdAccountId ?? null
}

export function isSuggestedPartnerAccount(
  organizationName: string,
  account: { metaAdAccountId: string; accountName: string }
): boolean {
  const matchedId = matchPartnerAdAccountId(organizationName, [account])
  return matchedId === account.metaAdAccountId
}
