import { NextResponse } from "next/server"

import { adminErrorResponse, requireCensioAdmin } from "@/lib/auth/require-censio-admin"
import { sanitizeStoredProfileImage } from "@/lib/auth/profile-image-sanitize"
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

    const avatarOwnerByUrl = new Map<string, string>()
    for (const profile of [...admins].sort((a, b) => a.created_at.localeCompare(b.created_at))) {
      const sanitized = sanitizeStoredProfileImage(profile.avatar_url)
      if (!sanitized || avatarOwnerByUrl.has(sanitized)) continue
      avatarOwnerByUrl.set(sanitized, profile.id)
    }

    const payload = admins.map((profile) => {
      const rawAvatar = profile.avatar_url ?? null
      let avatarUrl = sanitizeStoredProfileImage(rawAvatar) || null
      if (avatarUrl && avatarOwnerByUrl.get(avatarUrl) !== profile.id) {
        avatarUrl = null
      }
      return {
        id: profile.id,
        email: profile.email,
        fullName: profile.full_name,
        avatarUrl,
        createdAt: profile.created_at,
        accessStatus: getAdminAccessStatus(authUsersById.get(profile.id)),
      }
    })

    return NextResponse.json({ admins: payload })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
