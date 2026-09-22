import { upsertMonthlyAdMetrics } from "@/lib/db/ad-metrics-repository"
import {
  getMetaConfigRow,
  listMetaSyncableOrganizations,
  setMetaSyncState,
  type MetaConfigRow,
} from "@/lib/db/meta-config-repository"
import { logMetaSyncRun } from "@/lib/db/meta-sync-runs-repository"
import { decryptSecret } from "@/lib/meta/crypto"
import { fetchMonthlyInsights } from "@/lib/meta/insights"
import { resolveMetaAccessToken, verifyMetaAccessToken } from "@/lib/meta/token"
import type { SupabaseClient } from "@supabase/supabase-js"

function tokenFromConfig(row: MetaConfigRow) {
  return resolveMetaAccessToken({
    metaSystemUserToken: row.meta_system_user_token_encrypted
      ? decryptSecret(row.meta_system_user_token_encrypted)
      : "",
    metaPageAccessToken: row.meta_page_access_token_encrypted
      ? decryptSecret(row.meta_page_access_token_encrypted)
      : "",
  })
}

export async function syncOrganizationAdMetrics(
  supabase: SupabaseClient,
  organizationId: string,
  options: { source?: string } = {}
): Promise<{
  success: boolean
  skipped: boolean
  organizationId: string
  reason?: string
  monthCount?: number
}> {
  const source = options.source ?? "manual"
  const startedAt = new Date().toISOString()
  const row = await getMetaConfigRow(supabase, organizationId)

  if (!row?.enabled) {
    return { success: false, skipped: true, organizationId, reason: "Meta not enabled." }
  }

  if (!row.meta_ad_account_id) {
    await setMetaSyncState(supabase, organizationId, {
      metaSyncStatus: "error",
      metaSyncError: "Missing Meta ad account ID.",
    })
    return {
      success: false,
      skipped: true,
      organizationId,
      reason: "Missing Meta ad account ID.",
    }
  }

  const resolved = tokenFromConfig(row)
  if (!resolved.token) {
    const reason = resolved.reason ?? "Missing Meta token."
    await setMetaSyncState(supabase, organizationId, {
      metaSyncStatus: "error",
      metaSyncError: reason,
    })
    return { success: false, skipped: true, organizationId, reason }
  }

  const verified = await verifyMetaAccessToken(resolved.token, {
    adAccountId: row.meta_ad_account_id,
  })
  if (!verified.ok) {
    const reason = verified.reason ?? "Meta token verification failed."
    await setMetaSyncState(supabase, organizationId, {
      metaSyncStatus: "error",
      metaSyncError: reason,
    })
    await logMetaSyncRun(supabase, {
      organizationId,
      status: "error",
      message: reason,
      details: { source, tokenSource: resolved.source },
      startedAt,
      finishedAt: new Date().toISOString(),
    })
    return { success: false, skipped: false, organizationId, reason }
  }

  try {
    const monthly = await fetchMonthlyInsights(
      row.meta_ad_account_id,
      verified.token!
    )
    await upsertMonthlyAdMetrics(supabase, organizationId, monthly)

    const finishedAt = new Date().toISOString()
    await setMetaSyncState(supabase, organizationId, {
      metaSyncStatus: "ok",
      metaSyncError: null,
      metaLastSyncedAt: finishedAt,
    })
    await logMetaSyncRun(supabase, {
      organizationId,
      status: "success",
      message: `Synced ${monthly.length} months of ad spend.`,
      details: { source, tokenSource: resolved.source, monthCount: monthly.length },
      startedAt,
      finishedAt,
    })

    return {
      success: true,
      skipped: false,
      organizationId,
      monthCount: monthly.length,
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "Meta sync failed."
    await setMetaSyncState(supabase, organizationId, {
      metaSyncStatus: "error",
      metaSyncError: message,
    })
    await logMetaSyncRun(supabase, {
      organizationId,
      status: "error",
      message,
      details: { source },
      startedAt,
      finishedAt: new Date().toISOString(),
    })
    return { success: false, skipped: false, organizationId, reason: message }
  }
}

export async function syncAllOrganizationAdMetrics(
  supabase: SupabaseClient,
  options: { source?: string } = {}
) {
  const organizations = await listMetaSyncableOrganizations(supabase)
  const results = []

  for (const organization of organizations) {
    results.push(
      await syncOrganizationAdMetrics(supabase, organization.organizationId, options)
    )
  }

  return results
}

export async function testMetaConnection(
  supabase: SupabaseClient,
  organizationId: string
) {
  const row = await getMetaConfigRow(supabase, organizationId)
  if (!row) {
    return { ok: false, message: "Meta config not found." }
  }
  if (!row.meta_ad_account_id) {
    return { ok: false, message: "Missing Meta ad account ID." }
  }

  const resolved = tokenFromConfig(row)
  if (!resolved.token) {
    return { ok: false, message: resolved.reason ?? "Missing Meta token." }
  }

  const verified = await verifyMetaAccessToken(resolved.token, {
    adAccountId: row.meta_ad_account_id,
  })

  return {
    ok: verified.ok,
    message: verified.ok
      ? `Forbindelse OK (${resolved.source} token).`
      : verified.reason ?? "Meta token verification failed.",
    tokenSource: resolved.source,
    tokenHint: resolved.hint,
  }
}
