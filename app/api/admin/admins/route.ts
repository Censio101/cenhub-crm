import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import {
  getAdminAccessStatus,
  listAuthUsersById,
  listCensioAdmins,
} from "@/lib/db/admin-users"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    await requireCensioAdmin()
    const admin = createAdminClient()
    const [admins, authUsersById] = await Promise.all([
      listCensioAdmins(admin),
      listAuthUsersById(admin),
    ])

    return NextResponse.json({
      admins: admins.map((profile) => ({
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        avatarUrl: profile.avatar_url ?? null,
        createdAt: profile.created_at,
        accessStatus: getAdminAccessStatus(authUsersById.get(profile.id)),
      })),
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
