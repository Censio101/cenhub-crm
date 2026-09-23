import type { SupabaseClient, User } from "@supabase/supabase-js"

import { loadWorkspaceIntegrations } from "@/lib/admin/workspace-integrations"
import { sendInviteEmail } from "@/lib/email/invite-email"
import type { UserRole } from "@/lib/db/types"

type SendUserInviteInput = {
  email: string
  role: UserRole
  fullName?: string | null
  organizationName?: string | null
}

async function findUserByEmail(
  admin: SupabaseClient,
  email: string
): Promise<User | null> {
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

function isConfirmedUser(user: User | null): boolean {
  if (!user) return false
  return Boolean(user.email_confirmed_at ?? user.confirmed_at)
}

export async function sendUserInviteEmail(
  admin: SupabaseClient,
  input: SendUserInviteInput
): Promise<{ userId: string }> {
  const settings = await loadWorkspaceIntegrations(admin)

  if (!settings.mailConfigured) {
    throw new Error(
      "E-mail er ikke konfigureret. Gå til Mail & integrationer i admin og tilføj Mailgun-oplysninger."
    )
  }

  const email = input.email.trim().toLowerCase()
  const redirectTo = settings.inviteRedirectUrl
  const existingUser = await findUserByEmail(admin, email)
  const existingConfirmed = isConfirmedUser(existingUser)

  if (existingConfirmed) {
    await sendInviteEmail(settings, {
      to: email,
      actionLink: settings.loginUrl,
      role: input.role,
      organizationName: input.organizationName,
      fullName: input.fullName,
      isExistingUser: true,
    })

    return { userId: existingUser!.id }
  }

  const { data, error } = await admin.auth.admin.generateLink({
    type: "invite",
    email,
    options: { redirectTo },
  })

  if (error) throw error

  const actionLink = data.properties.action_link
  if (!actionLink) {
    throw new Error("Invite link could not be generated")
  }

  await sendInviteEmail(settings, {
    to: email,
    actionLink,
    role: input.role,
    organizationName: input.organizationName,
    fullName: input.fullName,
  })

  return { userId: data.user.id }
}
