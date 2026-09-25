import { NextResponse } from "next/server"

import { listInAppClientsForPicker } from "@/lib/admin/hub-clients"
import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { createAdminClient } from "@/lib/supabase/admin"

/** Light client list for directory, scope bar, and pickers (no Meta Graph). */
export async function GET() {
  try {
    await requireCensioAdmin()
    const admin = createAdminClient()
    const { clients } = await listInAppClientsForPicker(admin)
    return NextResponse.json({ clients })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
