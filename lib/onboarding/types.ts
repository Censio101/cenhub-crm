import type { EmployeeRole } from "@/lib/account-settings"
import type { NamedService } from "@/lib/performance/services"

export type WorkspaceStatus = "pending" | "active" | "awaiting_start"
export type GlobalRole = "censio_admin" | "customer"
export type InviteKind = "owner" | "employee" | "censio_admin"
export type ProvisionMode = "invite" | "immediate"

export type Workspace = {
  id: string
  name: string
  email: string
  logo: string
  profileImage: string
  enabledServiceIds: string[]
  customServices: NamedService[]
  hvidbjergPartner: boolean
  status: WorkspaceStatus
  useDemoData: boolean
  createdAt: string
  provisionedAt: string | null
}

export type CensioStaffRole = "admin" | "medarbejder"

export type AuthUser = {
  id: string
  email: string
  name: string
  username: string
  title: string
  profileImage: string
  headAdmin: boolean
  /** Rolle i Censio Internal (kun `censio_admin`). Ingen adgangsforskel endnu. */
  censioStaffRole?: CensioStaffRole
  passwordHash: string | null
  globalRole: GlobalRole
  createdAt: string
}

export type AuditLog = {
  id: string
  at: string
  userId: string
  userName: string
  action: string
  target: string
  change: string
}

export type Membership = {
  id: string
  workspaceId: string
  userId: string
  role: EmployeeRole
  status: "active" | "invited"
}

export type Invite = {
  id: string
  token: string
  workspaceId: string
  userId: string
  email: string
  name: string
  role: EmployeeRole
  kind: InviteKind
  expiresAt: string
  usedAt: string | null
  lastSentAt: string | null
  lastInviteUrl: string
  mailSent: boolean
}

export type AuthSession = {
  id: string
  userId: string
  workspaceId: string | null
  expiresAt: string
}

export type CommercialCategory =
  | "marketing"
  | "seo"
  | "geo"
  | "website"
  | "hosting"
  | "support"

export type CommercialCadence = "monthly" | "once"

export type CommercialBillingPeriod = {
  id: string
  amount: number
  from: string
  to?: string | null
  note?: string
}

export type CommercialLine = {
  id: string
  workspaceId: string
  category: CommercialCategory
  name: string
  /** Seneste / åben månedlig pris. */
  amount: number
  cadence: CommercialCadence
  startsOn: string
  endsOn: string | null
  note: string
  billingPeriods?: CommercialBillingPeriod[]
}

export type CustomerPhoneEntry = {
  id: string
  label: string
  number: string
}

export type CustomerEmailEntry = {
  id: string
  label: string
  email: string
}

export type CustomerPerson = {
  id: string
  name: string
  title: string
  phones: CustomerPhoneEntry[]
  emails: CustomerEmailEntry[]
}

export type CustomerContact = {
  workspaceId: string
  website: string
  cvr: string
  /** Primær kontakt — spejlet fra første person til søgning og liste. */
  phone: string
  subEmail: string
  contactName: string
  people: CustomerPerson[]
}

export type CustomerDocument = {
  id: string
  workspaceId: string
  fileName: string
  storedName: string
  uploadedAt: string
  size: number
  name: string
  note: string
}

export type OfferStatus = "draft" | "sent" | "accepted"

export type OfferAcceptedVia = "admin" | "customer"

export type OfferServiceId =
  | "meta"
  | "google"
  | "hjemmeside"
  | "hosting"
  | "webshop"
  | "seo-geo"
  | "lead-system"

export type OfferPackageId = "vaekstpakke"

export type OfferPublicPackageView = "vaekst" | "both"

export type Offer = {
  id: string
  slug: string
  status: OfferStatus
  workspaceId: string | null
  companyName: string
  contactName: string
  email: string
  phone: string
  cvr: string
  packages: OfferPackageId[]
  publicPackageView: OfferPublicPackageView
  services: OfferServiceId[]
  createdAt: string
  updatedAt: string
  sentAt: string | null
  acceptedAt: string | null
  acceptedVia: OfferAcceptedVia | null
  signatureName: string | null
}

export type OfferEngagement = {
  id: string
  offerId: string
  slug: string
  startedAt: string
  endedAt: string | null
  opened: boolean
  maxScrollPct: number
  durationSec: number
}

export type ExpensePricePeriod = {
  id: string
  amount: number
  from: string
  to?: string | null
}

export type FixedExpense = {
  id: string
  type: "ai" | "software" | "office" | "marketing" | "partner"
  name: string
  /** Aktuel månedlig pris (seneste prisperiode). */
  amount: number
  startsOn: string
  endsOn?: string | null
  pricePeriods: ExpensePricePeriod[]
  note: string
  url: string
}

export type StoreData = {
  workspaces: Workspace[]
  users: AuthUser[]
  memberships: Membership[]
  invites: Invite[]
  sessions: AuthSession[]
  commercialLines: CommercialLine[]
  fixedExpenses: FixedExpense[]
  customerContacts: CustomerContact[]
  customerDocuments: CustomerDocument[]
  auditLogs: AuditLog[]
  offers: Offer[]
  offerEngagement: OfferEngagement[]
}

export type ProvisionEmployeeInput = {
  name: string
  email: string
  role: EmployeeRole
}

export type ProvisionInput = {
  companyName: string
  contactName: string
  contactEmail: string
  enabledServiceIds: string[]
  customServiceLabels: string[]
  logo?: string
  profileImage?: string
  hvidbjergPartner?: boolean
  employees?: ProvisionEmployeeInput[]
}

export type InviteDelivery = {
  inviteId: string
  email: string
  name: string
  kind: InviteKind
  url: string
  sent: boolean
}

export type ProvisionResult = {
  workspace: Workspace
  ownerUserId: string
  deliveries: InviteDelivery[]
}

export type PublicInvite = {
  token: string
  kind: InviteKind
  email: string
  name: string
  role: EmployeeRole
  expiresAt: string
  workspace: {
    id: string
    name: string
    email: string
    logo: string
    enabledServiceIds: string[]
    customServices: NamedService[]
    hvidbjergPartner: boolean
    status: WorkspaceStatus
  }
}

export type PublicMember = {
  id: string
  name: string
  email: string
  role: EmployeeRole
  status: "active" | "invited"
}

export type PublicWorkspace = {
  id: string
  name: string
  email: string
  logo: string
  profileImage: string
  enabledServiceIds: string[]
  customServices: NamedService[]
  hvidbjergPartner: boolean
  status: WorkspaceStatus
  useDemoData: boolean
  createdAt: string
  provisionedAt: string | null
  employees: PublicMember[]
}

export type PublicSessionUser = {
  id: string
  email: string
  name: string
  username: string
  title: string
  profileImage: string
  headAdmin: boolean
  censioStaffRole: CensioStaffRole | null
  globalRole: GlobalRole
  workspaceId: string | null
  workspaceRole: EmployeeRole | null
}

export type AdminWorkspaceRow = PublicWorkspace & {
  contactName: string
  contactEmail: string
  deliveries: InviteDelivery[]
}
