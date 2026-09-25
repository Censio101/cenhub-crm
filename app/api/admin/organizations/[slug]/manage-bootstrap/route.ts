import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import {
  getAdminAccessStatus,
  getAuthUsersByIds,
  listProfilesForOrganization,
} from "@/lib/db/admin-users"
import { getMetaConfig } from "@/lib/db/meta-config-repository"
import { getOrganizationWithStatsBySlug } from "@/lib/db/organizations-repository"
import { createAdminClient } from "@/lib/supabase/admin"

type RouteContext = { params: Promise<{ slug: string }> }

/** One round trip for client-manage shell: org stats, users, meta config. */
export async function GET(_request: Request, context: RouteContext) {
  try {
    await requireCensioAdmin()
    const { slug } = await context.params
    const admin = createAdminClient()
    const organization = await getOrganizationWithStatsBySlug(admin, slug)

    if (!organization) {
      return NextResponse.json({ error: "Organization not found" }, { status: 404 })
    }

    const [profiles, metaRow] = await Promise.all([
      listProfilesForOrganization(admin, organization.id),
      getMetaConfig(admin, organization.id),
    ])

    const authUsersById = await getAuthUsersByIds(
      admin,
      profiles.map((profile) => profile.id)
    )

    const config =
      metaRow ?? {
        organizationId: organization.id,
        metaAdAccountId: "",
        metaPageId: "",
        metaPixelId: "",
        enabled: false,
        metaSyncStatus: "disabled" as const,
        metaSyncError: null,
        metaLastSyncedAt: null,
      }

    return NextResponse.json({
      organization: {
        id: organization.id,
        slug: organization.slug,
        name: organization.name,
        demo_mode: organization.demo_mode,
        leadCount: organization.leadCount,
        userCount: organization.userCount,
        metaEnabled: organization.metaEnabled,
      },
      users: profiles.map((user) => ({
        ...user,
        accessStatus: getAdminAccessStatus(authUsersById.get(user.id)),
      })),
      metaConfig: {
        metaAdAccountId: config.metaAdAccountId ?? "",
        metaPageId: config.metaPageId ?? "",
        metaPixelId: config.metaPixelId ?? "",
        enabled: Boolean(config.enabled),
        metaSyncStatus: config.metaSyncStatus ?? "disabled",
        metaSyncError: config.metaSyncError ?? null,
        metaLastSyncedAt: config.metaLastSyncedAt ?? null,
      },
    })
  } catch (error) {
    return adminErrorResponse(error)
  }
}
