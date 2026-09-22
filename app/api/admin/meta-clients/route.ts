import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import {
  listMetaClients,
  mergePartnerAccounts,
} from "@/lib/db/meta-clients-repository"
import { fetchPartnerAdAccounts } from "@/lib/meta/ad-accounts"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    await requireCensioAdmin()
    const admin = createAdminClient()
    const clients = await listMetaClients(admin)
    const partner = await fetchPartnerAdAccounts()
    const unlinkedPartnerAccounts = mergePartnerAccounts(clients, partner.accounts)

    const summary = {
      total: clients.length + unlinkedPartnerAccounts.length,
      enabledCount: clients.filter((client) => client.enabled && !client.needsSetup).length,
      needsSetupCount:
        clients.filter((client) => client.needsSetup).length +
        unlinkedPartnerAccounts.length,
      errorCount: clients.filter((client) => client.status === "error").length,
      liveCount: clients.filter((client) => client.status === "live").length,
    }

    return NextResponse.json({
      clients,
      unlinkedPartnerAccounts,
      summary,
      meta: {
        businessId: partner.businessId,
        partnerFetchError: partner.error,
        partnerAccountCount: partner.accounts.length,
      },
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
