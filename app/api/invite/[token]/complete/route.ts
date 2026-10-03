import {
  applySessionCookie,
  appUrl,
  createSession,
  jsonError,
} from "@/lib/onboarding/auth"
import { completeInvite } from "@/lib/onboarding/provision"
import type { EmployeeRole } from "@/lib/account-settings"

export async function POST(
  request: Request,
  context: { params: Promise<{ token: string }> }
) {
  try {
    const { token } = await context.params
    const body = (await request.json()) as {
      password?: string
      name?: string
      companyName?: string
      enabledServiceIds?: string[]
      customServiceLabels?: string[]
      logo?: string
      hvidbjergPartner?: boolean
      employees?: { name: string; email: string; role: EmployeeRole }[]
    }
    const result = await completeInvite(
      (await import("@/lib/onboarding/store")).getStore(),
      token,
      {
        password: body.password ?? "",
        name: body.name,
        companyName: body.companyName,
        enabledServiceIds: body.enabledServiceIds,
        customServiceLabels: body.customServiceLabels,
        logo: body.logo,
        hvidbjergPartner: body.hvidbjergPartner,
        employees: body.employees,
      },
      appUrl(request)
    )
    const session = await createSession(result.userId, result.workspaceId)
    await applySessionCookie(session.id)
    return Response.json({
      workspaceId: result.workspaceId,
      deliveries: result.deliveries,
    })
  } catch (error) {
    return jsonError(error)
  }
}
