import type { AccountSettings, EmployeeAccess } from "@/lib/account-settings"
import type {
  AdminWorkspaceRow,
  Invite,
  Membership,
  PublicInvite,
  PublicMember,
  PublicSessionUser,
  PublicWorkspace,
  StoreData,
  Workspace,
} from "@/lib/onboarding/types"

export function toPublicWorkspace(
  workspace: Workspace,
  memberships: Membership[],
  users: StoreData["users"]
): PublicWorkspace {
  const employees = memberships
    .filter((membership) => membership.workspaceId === workspace.id)
    .map((membership) => {
      const user = users.find((item) => item.id === membership.userId)
      return {
        id: membership.id,
        name: user?.name ?? "",
        email: user?.email ?? "",
        role: membership.role,
        status: membership.status,
      } satisfies PublicMember
    })

  return {
    id: workspace.id,
    name: workspace.name,
    email: workspace.email,
    logo: workspace.logo,
    profileImage: workspace.profileImage,
    enabledServiceIds: workspace.enabledServiceIds,
    customServices: workspace.customServices,
    hvidbjergPartner: workspace.hvidbjergPartner,
    status: workspace.status,
    useDemoData: workspace.useDemoData,
    createdAt: workspace.createdAt,
    provisionedAt: workspace.provisionedAt,
    employees,
  }
}

export function toAdminWorkspaceRow(
  workspace: Workspace,
  data: StoreData
): AdminWorkspaceRow {
  const publicWorkspace = toPublicWorkspace(
    workspace,
    data.memberships,
    data.users
  )
  const ownerInvite = data.invites.find(
    (invite) => invite.workspaceId === workspace.id && invite.kind === "owner"
  )
  const ownerMembership = data.memberships.find(
    (membership) =>
      membership.workspaceId === workspace.id && membership.role === "admin"
  )
  const owner = data.users.find((user) => user.id === ownerMembership?.userId)

  return {
    ...publicWorkspace,
    contactName: owner?.name ?? ownerInvite?.name ?? "",
    contactEmail: owner?.email ?? workspace.email,
    deliveries: data.invites
      .filter((invite) => invite.workspaceId === workspace.id)
      .map((invite) => ({
        inviteId: invite.id,
        email: invite.email,
        name: invite.name,
        kind: invite.kind,
        url: invite.lastInviteUrl,
        sent: invite.mailSent,
      })),
  }
}

export function toPublicInvite(invite: Invite, workspace: Workspace): PublicInvite {
  return {
    token: invite.token,
    kind: invite.kind,
    email: invite.email,
    name: invite.name,
    role: invite.role,
    expiresAt: invite.expiresAt,
    workspace: {
      id: workspace.id,
      name: workspace.name,
      email: workspace.email,
      logo: workspace.logo,
      enabledServiceIds: workspace.enabledServiceIds,
      customServices: workspace.customServices,
      hvidbjergPartner: workspace.hvidbjergPartner,
      status: workspace.status,
    },
  }
}

export function settingsFromWorkspace(
  workspace: PublicWorkspace
): AccountSettings {
  return {
    companyName: workspace.name,
    profileImage: workspace.profileImage,
    logo: workspace.logo,
    email: workspace.email,
    employees: workspace.employees.map(
      (employee) =>
        ({
          id: employee.id,
          name: employee.name,
          email: employee.email,
          role: employee.role,
          status: employee.status,
        }) satisfies EmployeeAccess
    ),
    enabledServiceIds: workspace.enabledServiceIds,
    customServices: workspace.customServices,
    hvidbjergPartner: workspace.hvidbjergPartner,
  }
}

export function toPublicSessionUser(
  user: StoreData["users"][number],
  workspaceId: string | null,
  workspaceRole: PublicSessionUser["workspaceRole"]
): PublicSessionUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    username: user.username,
    title: user.title,
    profileImage: user.profileImage,
    headAdmin: user.headAdmin,
    censioStaffRole:
      user.globalRole === "censio_admin" ? user.censioStaffRole ?? "admin" : null,
    globalRole: user.globalRole,
    workspaceId,
    workspaceRole,
  }
}

export function isInviteOpen(invite: Invite, now = new Date()): boolean {
  return !invite.usedAt && new Date(invite.expiresAt).getTime() > now.getTime()
}

export function workspaceStatusLabel(status: Workspace["status"]): string {
  if (status === "active") return "Aktiv"
  if (status === "awaiting_start") return "Afventer opstart"
  return "Afventer kunden"
}
