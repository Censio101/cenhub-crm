import { jsonError, requireCensioAdmin } from "@/lib/onboarding/auth"
import { buildInternalOverview } from "@/lib/internal/metrics"
import { getStore } from "@/lib/onboarding/store"

export async function GET(request: Request) {
  try {
    await requireCensioAdmin()
    const data = await getStore().read()
    const url = new URL(request.url)
    const requested = Number(url.searchParams.get("year"))
    const year =
      Number.isInteger(requested) && requested >= 2000
        ? requested
        : new Date().getFullYear()
    return Response.json(
      buildInternalOverview({
        workspaces: data.workspaces,
        lines: data.commercialLines,
        contacts: data.customerContacts,
        documents: data.customerDocuments,
        users: data.users,
        memberships: data.memberships,
        year,
      })
    )
  } catch (error) {
    return jsonError(error)
  }
}
