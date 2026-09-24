import { upsertMonthlyAdMetrics } from "@/lib/db/ad-metrics-repository"
import {
  getMetaConfigRow,
  listMetaSyncableOrganizations,
  setMetaSyncState,
  type MetaConfigRow,
} from "@/lib/db/meta-config-repository"
import { logMetaSyncRun } from "@/lib/db/meta-sync-runs-repository"
import { decryptSecret } from "@/lib/meta/crypto"
import {
  fetchMonthlyInsights,
  type MetricsInsightsRange,
} from "@/lib/meta/insights"
import { resolveMetaAccessToken, verifyMetaAccessToken } from "@/lib/meta/token"
import type { SupabaseClient } from "@supabase/supabase-js"

export type SyncOrganizationAdMetricsResult = {
  success: boolean
  skipped: boolean
  organizationId: string
  reason?: string
  monthCount?: number
}

export type SyncOrganizationAdMetricsOptions = {
  source?: string
  batchId?: string | null
  metricsRange?: MetricsInsightsRange
}

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

async function logSkippedRun(
  supabase: SupabaseClient,
  input: {
    organizationId: string
    message: string
    source: string
    batchId?: string | null
    startedAt: string
    details?: Record<string, unknown>
  }
) {
  await logMetaSyncRun(supabase, {
    organizationId: input.organizationId,
    status: "skipped",
    message: input.message,
    details: { source: input.source, ...input.details },
    startedAt: input.startedAt,
    finishedAt: new Date().toISOString(),
    batchId: input.batchId ?? null,
  })
}

export async function syncOrganizationAdMetrics(
  supabase: SupabaseClient,
  organizationId: string,
  options: SyncOrganizationAdMetricsOptions = {}
): Promise<SyncOrganizationAdMetricsResult> {
  const source = options.source ?? "manual"
  const batchId = options.batchId ?? null
  const metricsRange = options.metricsRange ?? "maximum"
  const startedAt = new Date().toISOString()
  const row = await getMetaConfigRow(supabase, organizationId)

  if (!row?.enabled) {
    const reason = "Meta not enabled."
    await logSkippedRun(supabase, {
      organizationId,
      message: reason,
      source,
      batchId,
      startedAt,
    })
    return { success: false, skipped: true, organizationId, reason }
  }

  if (!row.meta_ad_account_id) {
    const reason = "Missing Meta ad account ID."
    await setMetaSyncState(supabase, organizationId, {
      metaSyncStatus: "error",
      metaSyncError: reason,
    })
    await logSkippedRun(supabase, {
      organizationId,
      message: reason,
      source,
      batchId,
      startedAt,
    })
    return {
      success: false,
      skipped: true,
      organizationId,
      reason,
    }
  }

  const resolved = tokenFromConfig(row)
  if (!resolved.token) {
    const reason = resolved.reason ?? "Missing Meta token."
    await setMetaSyncState(supabase, organizationId, {
      metaSyncStatus: "error",
      metaSyncError: reason,
    })
    await logSkippedRun(supabase, {
      organizationId,
      message: reason,
      source,
      batchId,
      startedAt,
      details: { tokenSource: resolved.source },
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
      details: { source, tokenSource: resolved.source, metricsRange },
      startedAt,
      finishedAt: new Date().toISOString(),
      batchId,
    })
    return { success: false, skipped: false, organizationId, reason }
  }

  try {
    const monthly = await fetchMonthlyInsights(
      row.meta_ad_account_id,
      verified.token!,
      { range: metricsRange }
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
      details: {
        source,
        tokenSource: resolved.source,
        monthCount: monthly.length,
        metricsRange,
      },
      startedAt,
      finishedAt,
      batchId,
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
      details: { source, metricsRange },
      startedAt,
      finishedAt: new Date().toISOString(),
      batchId,
    })
    return { success: false, skipped: false, organizationId, reason: message }
  }
}

export async function syncAllOrganizationAdMetrics(
  supabase: SupabaseClient,
  options: SyncOrganizationAdMetricsOptions = {}
) {
  const organizations = await listMetaSyncableOrganizations(supabase)
  const results: SyncOrganizationAdMetricsResult[] = []

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
