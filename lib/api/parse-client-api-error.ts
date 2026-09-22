import { NO_ACTIVE_ORGANIZATION_ERROR } from "@/lib/auth/active-organization"

export type ClientApiError = {
  code: string | null
  message: string
}

export async function parseClientApiError(response: Response): Promise<ClientApiError> {
  try {
    const data = (await response.json()) as { error?: string; message?: string }
    return {
      code: data.error ?? null,
      message:
        data.message ??
        (data.error === NO_ACTIVE_ORGANIZATION_ERROR
          ? "Vælg en klient for at se deres dashboard."
          : "Kunne ikke hente data"),
    }
  } catch {
    return { code: null, message: "Kunne ikke hente data" }
  }
}

export function isNoActiveOrganizationError(error: ClientApiError) {
  return error.code === NO_ACTIVE_ORGANIZATION_ERROR
}
