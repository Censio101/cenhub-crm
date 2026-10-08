/** Whether the user finished invite password setup (stored in Supabase user_metadata). */
export function isPasswordSetupComplete(user: {
  user_metadata?: Record<string, unknown> | null
} | null | undefined): boolean {
  if (!user?.user_metadata) return false
  const value = user.user_metadata.password_setup_complete
  return value === true || value === "true"
}

/** Invited users must set a password once; skip users created with a password directly. */
export function needsPasswordSetup(user: {
  invited_at?: string | null
  user_metadata?: Record<string, unknown> | null
} | null | undefined): boolean {
  if (!user?.invited_at) return false
  return !isPasswordSetupComplete(user)
}
