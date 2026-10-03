import { jsonError, requireHeadAdmin } from "@/lib/onboarding/auth"
import { filterAuditLogs } from "@/lib/onboarding/audit"
import { getStore } from "@/lib/onboarding/store"

export async function GET(request: Request) {
  try {
    await requireHeadAdmin()
    const url = new URL(request.url)
    const data = await getStore().read()
    const logs = filterAuditLogs(data.auditLogs ?? [], {
      q: url.searchParams.get("q") ?? "",
      userId: url.searchParams.get("userId") ?? "",
      from: url.searchParams.get("from") ?? "",
      to: url.searchParams.get("to") ?? "",
    })
    const users = data.users
      .filter((user) => user.globalRole === "censio_admin")
      .map((user) => ({ id: user.id, name: user.name }))
      .sort((a, b) => a.name.localeCompare(b.name, "da"))
    return Response.json({ logs, users })
  } catch (error) {
    return jsonError(error)
  }
}
