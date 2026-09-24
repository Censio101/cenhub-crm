import { NextResponse } from "next/server"

import {
  adminErrorResponse,
  requireCensioAdmin,
} from "@/lib/auth/require-censio-admin"
import { listHubClients } from "@/lib/admin/hub-clients"
import { seedDemoOrganizationData } from "@/lib/db/demo-organization-seed"
import { createOrganization } from "@/lib/db/organizations-repository"
import { createAdminClient } from "@/lib/supabase/admin"

export async function GET() {
  try {
    await requireCensioAdmin()
    const admin = createAdminClient()
    const { clients, organizations, meta } = await listHubClients(admin)
    return NextResponse.json({ clients, organizations, meta })
  } catch (error) {
    return adminErrorResponse(error)
  }
}

export async function POST(request: Request) {
  try {
    await requireCensioAdmin()
    const body = (await request.json()) as {
      name?: string
      slug?: string
      demoMode?: boolean
    }

    if (!body.name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 })
    }

    const admin = createAdminClient()
    const organization = await createOrganization(admin, {
      name: body.name,
      slug: body.slug,
      demoMode: body.demoMode,
    })

    let demoSeed = null
    if (organization.demo_mode) {
      demoSeed = await seedDemoOrganizationData(admin, organization.id)
    }

    return NextResponse.json({ organization, demoSeed }, { status: 201 })
  } catch (error) {
    if (error instanceof Error && error.message.includes("slug")) {
      return NextResponse.json({ error: error.message }, { status: 400 })
    }
    return adminErrorResponse(error)
  }
}
