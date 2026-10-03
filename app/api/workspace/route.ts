import {
  jsonError,
  readSessionUser,
  requireWorkspaceAdmin,
} from "@/lib/onboarding/auth"
import { settingsFromWorkspace, toPublicWorkspace } from "@/lib/onboarding/public"
import { DEMO_WORKSPACE_ID, getStore } from "@/lib/onboarding/store"
import {
  parseCustomServices,
  parseEnabledServiceIds,
  parseHvidbjergPartner,
} from "@/lib/account-settings"

export async function GET() {
  const data = await getStore().read()
  const user = await readSessionUser()
  const workspaceId =
    user?.workspaceId ||
    (user?.globalRole === "censio_admin" ? DEMO_WORKSPACE_ID : null) ||
    DEMO_WORKSPACE_ID
  const workspace = data.workspaces.find((item) => item.id === workspaceId)
  if (!workspace) {
    return Response.json({ error: "Workspace findes ikke." }, { status: 404 })
  }
  const publicWorkspace = toPublicWorkspace(
    workspace,
    data.memberships,
    data.users
  )
  return Response.json({
    workspace: publicWorkspace,
    settings: settingsFromWorkspace(publicWorkspace),
    user,
  })
}

export async function PATCH(request: Request) {
  try {
    const user = await readSessionUser()
    const workspaceId = user?.workspaceId || DEMO_WORKSPACE_ID
    await requireWorkspaceAdmin(workspaceId)
    const body = (await request.json()) as {
      companyName?: string
      email?: string
      logo?: string
      profileImage?: string
      enabledServiceIds?: string[]
      customServices?: unknown
      hvidbjergPartner?: boolean
    }

    const workspace = await getStore().update((data) => {
      const target = data.workspaces.find((item) => item.id === workspaceId)
      if (!target) throw new Error("Workspace findes ikke.")
      if (body.companyName?.trim()) target.name = body.companyName.trim()
      if (body.email?.trim()) target.email = body.email.trim().toLowerCase()
      if (body.logo) target.logo = body.logo
      if (body.profileImage) target.profileImage = body.profileImage
      if (typeof body.hvidbjergPartner === "boolean") {
        target.hvidbjergPartner = parseHvidbjergPartner(body.hvidbjergPartner)
      }
      if (body.customServices) {
        target.customServices = parseCustomServices(body.customServices)
      }
      if (body.enabledServiceIds) {
        target.enabledServiceIds = parseEnabledServiceIds(
          body.enabledServiceIds,
          target.customServices
        )
      }
      return target
    })

    const next = await getStore().read()
    const publicWorkspace = toPublicWorkspace(
      workspace,
      next.memberships,
      next.users
    )
    return Response.json({
      workspace: publicWorkspace,
      settings: settingsFromWorkspace(publicWorkspace),
    })
  } catch (error) {
    return jsonError(error)
  }
}
