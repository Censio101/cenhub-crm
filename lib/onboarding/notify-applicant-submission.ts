import type { SupabaseClient } from "@supabase/supabase-js"

import { loadWorkspaceIntegrations } from "@/lib/admin/workspace-integrations"
import type { OnboardingApplicationRow } from "@/lib/db/types"
import { sendOnboardingApplicationReceivedEmail } from "@/lib/email/send-onboarding-application-received-email"

/** Confirmation to the applicant after public /tilmelding submission (Danish). */
export async function notifyApplicantOfOnboardingSubmission(
  supabase: SupabaseClient,
  application: OnboardingApplicationRow
): Promise<void> {
  if (application.source !== "public_form") return
  if (application.status !== "pending") return

  const settings = await loadWorkspaceIntegrations(supabase)
  await sendOnboardingApplicationReceivedEmail(settings, application)
}
