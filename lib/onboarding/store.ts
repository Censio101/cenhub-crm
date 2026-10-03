import { mkdirSync, readFileSync, renameSync, writeFileSync, existsSync } from "node:fs"
import path from "node:path"

import { CURRENT_COMPANY } from "@/lib/company"
import { ALL_SERVICE_IDS } from "@/lib/performance/services"
import { hashPassword } from "@/lib/onboarding/password"
import { nowIso } from "@/lib/onboarding/ids"
import { normalizeParsedStore } from "@/lib/onboarding/normalize-store"
import { createSupabaseStore } from "@/lib/onboarding/supabase-store"
import { isSupabaseStoreConfigured } from "@/lib/onboarding/supabase/client"
import {
  CENSIO_ADMIN_USER_ID,
  DEFAULT_CENSIO_ADMIN_EMAIL,
  DEFAULT_CENSIO_ADMIN_PASSWORD,
  DEFAULT_DEMO_OWNER_EMAIL,
  DEFAULT_DEMO_OWNER_PASSWORD,
  DEMO_OWNER_USER_ID,
  DEMO_WORKSPACE_ID,
} from "@/lib/onboarding/store-ids"
import type { StoreData } from "@/lib/onboarding/types"

export {
  CENSIO_ADMIN_USER_ID,
  DEFAULT_CENSIO_ADMIN_EMAIL,
  DEFAULT_CENSIO_ADMIN_PASSWORD,
  DEFAULT_DEMO_OWNER_EMAIL,
  DEFAULT_DEMO_OWNER_PASSWORD,
  DEMO_OWNER_USER_ID,
  DEMO_WORKSPACE_ID,
} from "@/lib/onboarding/store-ids"

export type StoreApi = {
  read: () => Promise<StoreData>
  update: <T>(mutator: (data: StoreData) => T) => Promise<T>
}

export function emptyStore(): StoreData {
  return {
    workspaces: [],
    users: [],
    memberships: [],
    invites: [],
    sessions: [],
    commercialLines: [],
    fixedExpenses: [],
    customerContacts: [],
    customerDocuments: [],
    auditLogs: [],
    offers: [],
    offerEngagement: [],
  }
}

export function createSeedStore(now = new Date()): StoreData {
  const createdAt = nowIso(now)
  const adminEmail =
    process.env.CENSIO_ADMIN_EMAIL?.trim().toLowerCase() ||
    DEFAULT_CENSIO_ADMIN_EMAIL
  const adminPassword =
    process.env.CENSIO_ADMIN_PASSWORD?.trim() || DEFAULT_CENSIO_ADMIN_PASSWORD

  return {
    workspaces: [
      {
        id: DEMO_WORKSPACE_ID,
        name: CURRENT_COMPANY.name,
        email: DEFAULT_DEMO_OWNER_EMAIL,
        logo: CURRENT_COMPANY.logo,
        profileImage: CURRENT_COMPANY.image,
        enabledServiceIds: [...ALL_SERVICE_IDS],
        customServices: [],
        hvidbjergPartner: true,
        status: "active",
        useDemoData: true,
        createdAt,
        provisionedAt: createdAt,
      },
    ],
    users: [
      {
        id: CENSIO_ADMIN_USER_ID,
        email: adminEmail,
        name: "Kaj Eli Joensen",
        username: "Censio",
        title: "CEO & Founder",
        profileImage: "/kaj-eli-joensen.jpg",
        headAdmin: true,
        passwordHash: hashPassword(adminPassword),
        globalRole: "censio_admin",
        createdAt,
      },
      {
        id: DEMO_OWNER_USER_ID,
        email: DEFAULT_DEMO_OWNER_EMAIL,
        name: "Ejer",
        username: "ejer",
        title: "",
        profileImage: "",
        headAdmin: false,
        passwordHash: hashPassword(DEFAULT_DEMO_OWNER_PASSWORD),
        globalRole: "customer",
        createdAt,
      },
    ],
    memberships: [
      {
        id: "mem-nordkystens-owner",
        workspaceId: DEMO_WORKSPACE_ID,
        userId: DEMO_OWNER_USER_ID,
        role: "admin",
        status: "active",
      },
    ],
    invites: [],
    sessions: [],
    commercialLines: [],
    fixedExpenses: [],
    customerContacts: [],
    customerDocuments: [],
    auditLogs: [],
    offers: [],
    offerEngagement: [],
  }
}

export function createMemoryStore(initial: StoreData = emptyStore()): StoreApi {
  let data = cloneStore(initial)
  return {
    async read() {
      return cloneStore(data)
    },
    async update(mutator) {
      const next = cloneStore(data)
      const result = mutator(next)
      data = next
      return result
    },
  }
}

let activeStore: StoreApi | null = null
let writeQueue: Promise<unknown> = Promise.resolve()

export function getStore(): StoreApi {
  if (!activeStore) {
    if (process.env.VERCEL === "1" && !isSupabaseStoreConfigured()) {
      console.error(
        "[cenhub] SUPABASE_URL og SUPABASE_SERVICE_ROLE_KEY mangler på Vercel — data persisteres ikke mellem deploys."
      )
    }
    activeStore = isSupabaseStoreConfigured() ? createSupabaseStore() : createFileStore()
  }
  return activeStore
}

export function resetStoreForTests() {
  activeStore = null
}

function createFileStore(): StoreApi {
  return {
    async read() {
      return readFileStore()
    },
    async update(mutator) {
      const run = writeQueue.then(() => {
        const data = readFileStore()
        const result = mutator(data)
        writeFileStore(data)
        return result
      })
      writeQueue = run.then(
        () => undefined,
        () => undefined
      )
      return run
    },
  }
}

function resolveStorePath(): string {
  if (process.env.CENHUB_STORE_PATH) return process.env.CENHUB_STORE_PATH
  return path.join(process.cwd(), ".data", "cenhub-store.json")
}

function readFileStore(): StoreData {
  const filePath = resolveStorePath()
  if (!existsSync(filePath)) {
    const seeded = createSeedStore()
    writeFileStore(seeded)
    return seeded
  }
  const raw = readFileSync(filePath, "utf8")
  const parsed = JSON.parse(raw) as Partial<StoreData>
  return normalizeParsedStore(parsed)
}

function writeFileStore(data: StoreData) {
  const filePath = resolveStorePath()
  mkdirSync(path.dirname(filePath), { recursive: true })
  const tempPath = `${filePath}.${process.pid}.tmp`
  writeFileSync(tempPath, JSON.stringify(data, null, 2))
  renameSync(tempPath, filePath)
}

function cloneStore(data: StoreData): StoreData {
  return structuredClone(data)
}
