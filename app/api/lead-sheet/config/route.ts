import { NextResponse } from "next/server"

import {
  organizationErrorResponse,
  requireOrganizationContext,
} from "@/lib/auth/require-organization-context"
import { serializeFunnelFormViews } from "@/lib/db/funnel-form-views"
import { listLeadFunnelsForOrganization } from "@/lib/db/lead-funnels-repository"
import { resolveClientDashboardSheet } from "@/lib/db/lead-sheet-repository"
import { resolveOrganizationServices } from "@/lib/db/services-repository"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"

export async function GET() {
  try {
    const ctx = await requireOrganizationContext()
    const supabase =
      ctx.isDemoFallback && !ctx.userId ? createAdminClient() : await createClient()

    // Only the columns this client should see; hidden ones stay in the backend.
    const [{ visible }, services, funnels] = await Promise.all([
      resolveClientDashboardSheet(supabase, ctx.organization.id),
      // The organization is already authorised above; the service tables are server-only.
      resolveOrganizationServices(createAdminClient(), ctx.organization.id),
      listLeadFunnelsForOrganization(createAdminClient(), ctx.organization.id),
    ])
    return NextResponse.json({
      leadSheet: visible,
      services,
      funnelFormViews: serializeFunnelFormViews(funnels),
    })
  } catch (error) {
    const orgResponse = organizationErrorResponse(error)
    if (orgResponse.status !== 500) return orgResponse
    return NextResponse.json({ error: "Failed to load lead sheet config" }, { status: 500 })
  }
}
