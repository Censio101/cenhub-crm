import type { UserRole } from "@/lib/db/types"

/**
 * Roles:
 * - censio_admin: everything.
 * - client_admin: runs the client's account; may delete leads.
 * - client_user: sees the client's leads and fills in the figures that do not come from the
 *   webhook (status, sales price, profit, ...), but cannot delete anything.
 *
 * The database enforces the same rule (migration 053); this keeps the API and the UI in step.
 */
export function canDeleteLeads(role: UserRole | null | undefined): boolean {
  return role === "censio_admin" || role === "client_admin"
}
