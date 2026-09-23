import type { SupabaseClient } from "@supabase/supabase-js"

import { loadWorkspaceIntegrations } from "@/lib/admin/workspace-integrations"
import { sendMagicLinkEmail, sendPasswordResetEmail } from "@/lib/email/auth-email"

async function findUserByEmail(admin: SupabaseClient, email: string) {
  let page = 1
  while (page <= 10) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage: 200 })
    if (error) throw error
    const match = data.users.find(
      (user) => user.email?.toLowerCase() === email.toLowerCase()
    )
    if (match) return match
    if (data.users.length < 200) break
    page += 1
  }
  return null
}

export async function sendMagicLinkLoginEmail(
  admin: SupabaseClient,
  emailInput: string
): Promise<void> {
  const email = emailInput.trim().toLowerCase()
  if (!email) throw new Error("Email is required")

  const settings = await loadWorkspaceIntegrations(admin)
  if (!settings.mailConfigured) {
    throw new Error("E-mail er ikke konfigureret.")
  }

  const user = await findUserByEmail(admin, email)
  if (!user) {
    throw new Error("Der findes ingen bruger med den e-mail.")
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email,
    options: { redirectTo: settings.sessionRedirectUrl },
  })

  if (error) throw error

  const actionLink = data.properties.action_link
  if (!actionLink) {
    throw new Error("Login link could not be generated")
  }

  await sendMagicLinkEmail(settings, { to: email, actionLink })
}

export async function sendPasswordResetLoginEmail(
  admin: SupabaseClient,
  emailInput: string
): Promise<void> {
  const email = emailInput.trim().toLowerCase()
  if (!email) throw new Error("Email is required")

  const settings = await loadWorkspaceIntegrations(admin)
  if (!settings.mailConfigured) {
    throw new Error("E-mail er ikke konfigureret.")
  }

  const user = await findUserByEmail(admin, email)
  if (!user) {
    throw new Error("Der findes ingen bruger med den e-mail.")
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "recovery",
    email,
    options: { redirectTo: settings.inviteRedirectUrl },
  })

  if (error) throw error

  const actionLink = data.properties.action_link
  if (!actionLink) {
    throw new Error("Reset link could not be generated")
  }

  await sendPasswordResetEmail(settings, { to: email, actionLink })
}
