import {
  loadWorkspaceIntegrations,
  type WorkspaceIntegrationsPublic,
} from "@/lib/admin/workspace-integrations"
import { createAdminClient } from "@/lib/supabase/admin"

export async function getEmailSettings(): Promise<WorkspaceIntegrationsPublic> {
  const admin = createAdminClient()
  return loadWorkspaceIntegrations(admin)
}

export function getSiteUrlFromSettings(settings: WorkspaceIntegrationsPublic): string {
  return settings.siteUrl
}

export function getInviteRedirectUrl(settings: WorkspaceIntegrationsPublic): string {
  return settings.inviteRedirectUrl
}

export function getMailFromAddress(settings: WorkspaceIntegrationsPublic): string {
  return settings.mailFrom
}
