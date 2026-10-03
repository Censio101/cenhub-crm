import {
  createCustomService,
  parseEnabledServiceIds,
} from "@/lib/account-settings"
import { CURRENT_COMPANY } from "@/lib/company"
import { SERVICES } from "@/lib/performance/services"
import { addDaysIso, createId, createToken, INVITE_TTL_DAYS, nowIso } from "@/lib/onboarding/ids"
import { sendInviteEmail } from "@/lib/onboarding/mail"
import { isInviteOpen } from "@/lib/onboarding/public"
import type { StoreApi } from "@/lib/onboarding/store"
import type {
  Invite,
  InviteDelivery,
  Membership,
  ProvisionInput,
  ProvisionMode,
  ProvisionResult,
  StoreData,
} from "@/lib/onboarding/types"

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase()
}

export function inviteUrl(appUrl: string, token: string): string {
  return `${appUrl.replace(/\/$/, "")}/velkommen/${token}`
}

export async function provisionWorkspace(
  store: StoreApi,
  input: ProvisionInput,
  mode: ProvisionMode,
  appUrl: string
): Promise<ProvisionResult> {
  const companyName = input.companyName.trim()
  const contactName = input.contactName.trim()
  const contactEmail = normalizeEmail(input.contactEmail)
  if (!companyName) throw new Error("Virksomhedsnavn mangler.")
  if (!contactName) throw new Error("Kontaktperson mangler.")
  if (!isEmail(contactEmail)) throw new Error("Kontakt-e-mail er ugyldig.")

  const customServices = uniqueLabels(input.customServiceLabels).reduce(
    (list, label) => [...list, createCustomService(label, list)],
    [] as ReturnType<typeof createCustomService>[]
  )
  const enabledServiceIds = parseEnabledServiceIds(
    [...input.enabledServiceIds, ...customServices.map((service) => service.id)],
    customServices
  )

  const createdAt = nowIso()
  const workspaceId = createId("ws")
  const owner = upsertUserDraft(
    await store.read(),
    contactName,
    contactEmail,
    createdAt
  )

  const employees = (input.employees ?? [])
    .map((employee) => ({
      name: employee.name.trim(),
      email: normalizeEmail(employee.email),
      role: employee.role,
    }))
    .filter(
      (employee) =>
        employee.name &&
        isEmail(employee.email) &&
        employee.email !== contactEmail
    )

  return store.update((data) => {
    if (data.workspaces.some((workspace) => workspace.id === workspaceId)) {
      throw new Error("Workspace findes allerede.")
    }

    const ownerUser = upsertUser(data, owner)
    data.workspaces.push({
      id: workspaceId,
      name: companyName,
      email: contactEmail,
      logo: input.logo?.trim() || CURRENT_COMPANY.logo,
      profileImage: input.profileImage?.trim() || CURRENT_COMPANY.image,
      enabledServiceIds,
      customServices,
      hvidbjergPartner: input.hvidbjergPartner ?? true,
      status: mode === "immediate" ? "active" : "pending",
      useDemoData: false,
      createdAt,
      provisionedAt: mode === "immediate" ? createdAt : null,
    })

    addMembership(data, {
      workspaceId,
      userId: ownerUser.id,
      role: "admin",
      status: mode === "immediate" ? "active" : "invited",
    })

    const ownerInvite = createInviteRecord({
      workspaceId,
      userId: ownerUser.id,
      email: contactEmail,
      name: contactName,
      role: "admin",
      kind: "owner",
      appUrl,
    })
    data.invites.push(ownerInvite)

    const employeeInvites: Invite[] = []
    for (const employee of employees) {
      const user = upsertUser(data, {
        name: employee.name,
        email: employee.email,
        createdAt,
      })
      addMembership(data, {
        workspaceId,
        userId: user.id,
        role: employee.role,
        status: "invited",
      })
      const invite = createInviteRecord({
        workspaceId,
        userId: user.id,
        email: employee.email,
        name: employee.name,
        role: employee.role,
        kind: "employee",
        appUrl,
      })
      data.invites.push(invite)
      employeeInvites.push(invite)
    }

    return {
      workspaceId,
      ownerUserId: ownerUser.id,
      invites: [ownerInvite, ...employeeInvites],
    }
  }).then(async (created) => {
    const sendOwner = true
    const sendEmployees = mode === "immediate"
    const deliveries: InviteDelivery[] = []

    for (const invite of created.invites) {
      const shouldSend =
        (invite.kind === "owner" && sendOwner) ||
        (invite.kind === "employee" && sendEmployees)
      if (!shouldSend) {
        deliveries.push({
          inviteId: invite.id,
          email: invite.email,
          name: invite.name,
          kind: invite.kind,
          url: invite.lastInviteUrl,
          sent: false,
        })
        continue
      }

      const mail = await sendInviteEmail({
        to: invite.email,
        name: invite.name,
        companyName,
        url: invite.lastInviteUrl,
        kind: invite.kind,
      })
      await store.update((data) => {
        const stored = data.invites.find((item) => item.id === invite.id)
        if (!stored) return
        stored.mailSent = mail.sent
        stored.lastSentAt = nowIso()
        stored.lastInviteUrl = mail.url
      })
      deliveries.push({
        inviteId: invite.id,
        email: invite.email,
        name: invite.name,
        kind: invite.kind,
        url: mail.url,
        sent: mail.sent,
      })
    }

    const workspace = (await store.read()).workspaces.find(
      (item) => item.id === created.workspaceId
    )
    if (!workspace) throw new Error("Workspace blev ikke oprettet.")

    return {
      workspace,
      ownerUserId: created.ownerUserId,
      deliveries,
    }
  })
}

export async function completeInvite(
  store: StoreApi,
  token: string,
  input: {
    password: string
    name?: string
    companyName?: string
    enabledServiceIds?: string[]
    customServiceLabels?: string[]
    logo?: string
    hvidbjergPartner?: boolean
    employees?: ProvisionInput["employees"]
  },
  appUrl: string
) {
  if (!input.password || input.password.length < 8) {
    throw new Error("Adgangskoden skal være mindst 8 tegn.")
  }

  const { hashPassword } = await import("@/lib/onboarding/password")
  const passwordHash = hashPassword(input.password)
  const createdAt = nowIso()

  const pendingEmployees = (input.employees ?? [])
    .map((employee) => ({
      name: employee.name.trim(),
      email: normalizeEmail(employee.email),
      role: employee.role,
    }))
    .filter((employee) => employee.name && isEmail(employee.email))

  const prepared = await store.update((data) => {
    const invite = data.invites.find((item) => item.token === token)
    if (!invite || !isInviteOpen(invite)) {
      throw new Error("Invitationen er ugyldig eller udløbet.")
    }
    const workspace = data.workspaces.find((item) => item.id === invite.workspaceId)
    const user = data.users.find((item) => item.id === invite.userId)
    if (!workspace || !user) {
      throw new Error("Invitationen peger på et ukendt workspace.")
    }

    user.passwordHash = passwordHash
    if (input.name?.trim()) user.name = input.name.trim()
    invite.usedAt = createdAt

    const membership = data.memberships.find(
      (item) => item.workspaceId === workspace.id && item.userId === user.id
    )
    if (membership) membership.status = "active"

    const newInvites: Invite[] = []
    if (invite.kind === "owner") {
      if (input.companyName?.trim()) workspace.name = input.companyName.trim()
      if (input.logo?.trim()) workspace.logo = input.logo.trim()
      if (typeof input.hvidbjergPartner === "boolean") {
        workspace.hvidbjergPartner = input.hvidbjergPartner
      }
      if (input.customServiceLabels || input.enabledServiceIds) {
        const customServices = mergeCustomServices(
          workspace.customServices,
          input.customServiceLabels ?? []
        )
        workspace.customServices = customServices
        workspace.enabledServiceIds = parseEnabledServiceIds(
          [
            ...(input.enabledServiceIds ?? workspace.enabledServiceIds),
            ...customServices.map((service) => service.id),
          ],
          customServices
        )
      }

      const pendingInvites = data.invites.filter(
        (item) =>
          item.workspaceId === workspace.id &&
          item.kind === "employee" &&
          !item.usedAt &&
          !item.mailSent
      )
      newInvites.push(...pendingInvites)

      for (const employee of pendingEmployees) {
        if (employee.email === user.email) continue
        const existingMember = data.memberships.find((item) => {
          const memberUser = data.users.find((entry) => entry.id === item.userId)
          return (
            item.workspaceId === workspace.id &&
            memberUser?.email === employee.email
          )
        })
        if (existingMember) continue

        const employeeUser = upsertUser(data, {
          name: employee.name,
          email: employee.email,
          createdAt,
        })
        addMembership(data, {
          workspaceId: workspace.id,
          userId: employeeUser.id,
          role: employee.role,
          status: "invited",
        })
        const employeeInvite = createInviteRecord({
          workspaceId: workspace.id,
          userId: employeeUser.id,
          email: employee.email,
          name: employee.name,
          role: employee.role,
          kind: "employee",
          appUrl,
        })
        data.invites.push(employeeInvite)
        newInvites.push(employeeInvite)
      }

      workspace.status = "active"
      workspace.provisionedAt = workspace.provisionedAt ?? createdAt
    }

    return {
      userId: user.id,
      workspaceId: workspace.id,
      companyName: workspace.name,
      newInvites,
    }
  })

  const deliveries: InviteDelivery[] = []
  for (const invite of prepared.newInvites) {
    const mail = await sendInviteEmail({
      to: invite.email,
      name: invite.name,
      companyName: prepared.companyName,
      url: invite.lastInviteUrl,
      kind: "employee",
    })
    await store.update((data) => {
      const stored = data.invites.find((item) => item.id === invite.id)
      if (!stored) return
      stored.mailSent = mail.sent
      stored.lastSentAt = nowIso()
      stored.lastInviteUrl = mail.url
    })
    deliveries.push({
      inviteId: invite.id,
      email: invite.email,
      name: invite.name,
      kind: "employee",
      url: mail.url,
      sent: mail.sent,
    })
  }

  return {
    userId: prepared.userId,
    workspaceId: prepared.workspaceId,
    deliveries,
  }
}

export async function inviteEmployee(
  store: StoreApi,
  workspaceId: string,
  input: { name: string; email: string; role: Membership["role"] },
  appUrl: string
): Promise<InviteDelivery> {
  const name = input.name.trim()
  const email = normalizeEmail(input.email)
  if (!name || !isEmail(email)) {
    throw new Error("Udfyld navn og en gyldig e-mail.")
  }

  const created = await store.update((data) => {
    const workspace = data.workspaces.find((item) => item.id === workspaceId)
    if (!workspace) throw new Error("Workspace findes ikke.")
    const existing = data.memberships.find((item) => {
      const user = data.users.find((entry) => entry.id === item.userId)
      return item.workspaceId === workspaceId && user?.email === email
    })
    if (existing) throw new Error("Den e-mail har allerede adgang.")

    const user = upsertUser(data, {
      name,
      email,
      createdAt: nowIso(),
    })
    addMembership(data, {
      workspaceId,
      userId: user.id,
      role: input.role,
      status: "invited",
    })
    const invite = createInviteRecord({
      workspaceId,
      userId: user.id,
      email,
      name,
      role: input.role,
      kind: "employee",
      appUrl,
    })
    data.invites.push(invite)
    return { invite, companyName: workspace.name }
  })

  const mail = await sendInviteEmail({
    to: email,
    name,
    companyName: created.companyName,
    url: created.invite.lastInviteUrl,
    kind: "employee",
  })
  await store.update((data) => {
    const stored = data.invites.find((item) => item.id === created.invite.id)
    if (!stored) return
    stored.mailSent = mail.sent
    stored.lastSentAt = nowIso()
    stored.lastInviteUrl = mail.url
  })

  return {
    inviteId: created.invite.id,
    email,
    name,
    kind: "employee",
    url: mail.url,
    sent: mail.sent,
  }
}

export async function resendInvite(
  store: StoreApi,
  inviteId: string,
  appUrl: string
): Promise<InviteDelivery> {
  const rotated = await store.update((data) => {
    const invite = data.invites.find((item) => item.id === inviteId)
    if (!invite) throw new Error("Invitationen findes ikke.")
    const workspace = data.workspaces.find((item) => item.id === invite.workspaceId)
    if (!workspace) throw new Error("Workspace findes ikke.")
    invite.token = createToken()
    invite.expiresAt = addDaysIso(INVITE_TTL_DAYS)
    invite.usedAt = null
    invite.lastInviteUrl = inviteUrl(appUrl, invite.token)
    return { invite: { ...invite }, companyName: workspace.name }
  })

  const mail = await sendInviteEmail({
    to: rotated.invite.email,
    name: rotated.invite.name,
    companyName: rotated.companyName,
    url: rotated.invite.lastInviteUrl,
    kind: rotated.invite.kind,
  })
  await store.update((data) => {
    const stored = data.invites.find((item) => item.id === inviteId)
    if (!stored) return
    stored.mailSent = mail.sent
    stored.lastSentAt = nowIso()
    stored.lastInviteUrl = mail.url
  })

  return {
    inviteId,
    email: rotated.invite.email,
    name: rotated.invite.name,
    kind: rotated.invite.kind,
    url: mail.url,
    sent: mail.sent,
  }
}

function isEmail(value: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)
}

function mergeCustomServices(
  existing: { id: string; label: string }[],
  labels: string[]
) {
  return uniqueLabels(labels).reduce((list, label) => {
    const match =
      list.find((service) => service.label.toLowerCase() === label.toLowerCase()) ||
      SERVICES.find((service) => service.label.toLowerCase() === label.toLowerCase())
    if (match) return list
    return [...list, createCustomService(label, list)]
  }, [...existing])
}

function uniqueLabels(labels: string[]): string[] {
  const seen = new Set<string>()
  const next: string[] = []
  for (const label of labels) {
    const trimmed = label.trim()
    const key = trimmed.toLowerCase()
    if (!trimmed || seen.has(key)) continue
    seen.add(key)
    next.push(trimmed)
  }
  return next
}

function upsertUserDraft(
  data: StoreData,
  name: string,
  email: string,
  createdAt: string
) {
  const existing = data.users.find((user) => user.email === email)
  return {
    id: existing?.id ?? createId("user"),
    name: existing?.name || name,
    email,
    createdAt,
  }
}

function upsertUser(
  data: StoreData,
  input: { id?: string; name: string; email: string; createdAt: string }
) {
  const existing = data.users.find((user) => user.email === input.email)
  if (existing) {
    if (!existing.name) existing.name = input.name
    return existing
  }
  const user = {
    id: input.id ?? createId("user"),
    email: input.email,
    name: input.name,
    username: input.email.split("@")[0] || "bruger",
    title: "",
    profileImage: "",
    headAdmin: false,
    passwordHash: null,
    globalRole: "customer" as const,
    createdAt: input.createdAt,
  }
  data.users.push(user)
  return user
}

function addMembership(
  data: StoreData,
  input: Omit<Membership, "id">
) {
  const existing = data.memberships.find(
    (item) =>
      item.workspaceId === input.workspaceId && item.userId === input.userId
  )
  if (existing) {
    existing.role = input.role
    existing.status = input.status
    return existing
  }
  const membership: Membership = { id: createId("mem"), ...input }
  data.memberships.push(membership)
  return membership
}

function createInviteRecord(input: {
  workspaceId: string
  userId: string
  email: string
  name: string
  role: Invite["role"]
  kind: Invite["kind"]
  appUrl: string
}): Invite {
  const token = createToken()
  return {
    id: createId("inv"),
    token,
    workspaceId: input.workspaceId,
    userId: input.userId,
    email: input.email,
    name: input.name,
    role: input.role,
    kind: input.kind,
    expiresAt: addDaysIso(INVITE_TTL_DAYS),
    usedAt: null,
    lastSentAt: null,
    lastInviteUrl: inviteUrl(input.appUrl, token),
    mailSent: false,
  }
}
