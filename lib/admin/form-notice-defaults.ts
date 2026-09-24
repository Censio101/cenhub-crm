/** Shared dismiss timing and sizing for admin FormNotice stacks. */
export const adminFormNoticeDefaults = {
  size: "sm" as const,
  errorAutoDismissMs: 6000,
  /** Short confirmations (e.g. saved email list). */
  quickSuccessAutoDismissMs: 2200,
  successAutoDismissMs: 5000,
  /** Longer success on queue after create client / approve. */
  queueSuccessAutoDismissMs: 8000,
} as const
