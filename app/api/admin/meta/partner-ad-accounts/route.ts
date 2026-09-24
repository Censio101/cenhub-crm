import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { listPartnerAdAccountsForPicker } from "@/lib/meta/partner-ad-accounts-for-picker"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET(request: Request) {
  try {
    await requireCensioAdmin()
    const { searchParams } = new URL(request.url)
    const q = searchParams.get("q") ?? undefined
    const forSlug = searchParams.get("forSlug") ?? undefined
    const suggestName = searchParams.get("suggestName") ?? undefined

    const admin = createAdminClient()
    const result = await listPartnerAdAccountsForPicker(admin, {
      q,
      forSlug,
      suggestName,
    })

    return NextResponse.json(result)
  } catch (error) {
    return adminErrorResponse(error)
  }
}
