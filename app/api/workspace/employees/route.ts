import type { EmployeeRole } from "@/lib/account-settings"
import { appUrl, jsonError, requireWorkspaceAdmin } from "@/lib/onboarding/auth"
import { inviteEmployee } from "@/lib/onboarding/provision"
import { settingsFromWorkspace, toPublicWorkspace } from "@/lib/onboarding/public"
import { DEMO_WORKSPACE_ID, getStore } from "@/lib/onboarding/store"

export async function POST(request: Request) {
  try {
    const user = await (await import("@/lib/onboarding/auth")).readSessionUser()
    const workspaceId = user?.workspaceId || DEMO_WORKSPACE_ID
    await requireWorkspaceAdmin(workspaceId)
    const body = (await request.json()) as {
      name?: string
      email?: string
      role?: EmployeeRole
    }
    const delivery = await inviteEmployee(
      getStore(),
      workspaceId,
      {
        name: body.name ?? "",
        email: body.email ?? "",
        role: body.role === "admin" ? "admin" : "medarbejder",
      },
      appUrl(request)
    )
    const data = await getStore().read()
    const workspace = data.workspaces.find((item) => item.id === workspaceId)
    const publicWorkspace = workspace
      ? toPublicWorkspace(workspace, data.memberships, data.users)
      : null
    return Response.json({
      delivery,
      workspace: publicWorkspace,
      settings: publicWorkspace ? settingsFromWorkspace(publicWorkspace) : null,
    })
  } catch (error) {
    return jsonError(error)
  }
}
