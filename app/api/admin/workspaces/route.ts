import { pushAudit } from "@/lib/onboarding/audit"
import { appUrl, jsonError, requireCensioAdmin } from "@/lib/onboarding/auth"
import { provisionWorkspace } from "@/lib/onboarding/provision"
import { toAdminWorkspaceRow } from "@/lib/onboarding/public"
import { getStore } from "@/lib/onboarding/store"
import type { ProvisionInput, ProvisionMode } from "@/lib/onboarding/types"

export async function GET() {
  try {
    await requireCensioAdmin()
    const data = await getStore().read()
    return Response.json({
      workspaces: data.workspaces
        .slice()
        .sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        .map((workspace) => toAdminWorkspaceRow(workspace, data)),
    })
  } catch (error) {
    return jsonError(error)
  }
}

export async function POST(request: Request) {
  try {
    const actor = await requireCensioAdmin()
    const body = (await request.json()) as ProvisionInput & { mode?: ProvisionMode }
    const mode = body.mode === "immediate" ? "immediate" : "invite"
    const result = await provisionWorkspace(getStore(), body, mode, appUrl(request))
    await getStore().update((data) => {
      pushAudit(data, actor, {
        action: "Kunde",
        target: result.workspace.name,
        change: `Tilføjede kunden ${result.workspace.name} (${result.workspace.email}).`,
      })
    })
    const data = await getStore().read()
    const workspace = data.workspaces.find((item) => item.id === result.workspace.id)
    return Response.json({
      workspace: workspace ? toAdminWorkspaceRow(workspace, data) : null,
      deliveries: result.deliveries,
    })
  } catch (error) {
    return jsonError(error)
  }
}
