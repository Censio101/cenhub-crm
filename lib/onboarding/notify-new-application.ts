import { loadWorkspaceIntegrations } from "@/lib/admin/workspace-integrations"
import type { OnboardingApplicationRow } from "@/lib/db/types"
import { sendOnboardingApplicationNotifyEmail } from "@/lib/email/send-onboarding-application-notify"
import { parseNotifyEmailList } from "@/lib/onboarding/notify-emails"
import type { SupabaseClient } from "@supabase/supabase-js"

function recipientsFromEnv(): string[] {
  return parseNotifyEmailList(process.env.ONBOARDING_NOTIFY_EMAILS ?? null)
}

export async function notifyAdminsOfNewOnboardingApplication(
  supabase: SupabaseClient,
  application: OnboardingApplicationRow
): Promise<void> {
  if (application.source !== "public_form") return
  if (application.status !== "pending") return

  const settings = await loadWorkspaceIntegrations(supabase)
  const dbRecipients = parseNotifyEmailList(settings.onboardingNotifyEmails)
  const recipients = dbRecipients.length > 0 ? dbRecipients : recipientsFromEnv()
  if (recipients.length === 0) return

  await sendOnboardingApplicationNotifyEmail(settings, application, recipients)
}
