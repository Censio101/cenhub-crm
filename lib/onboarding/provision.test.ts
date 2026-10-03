import { afterEach, describe, expect, it, vi } from "vitest"

import { completeInvite, provisionWorkspace, resendInvite } from "@/lib/onboarding/provision"
import { createMemoryStore, emptyStore } from "@/lib/onboarding/store"
import { isInviteOpen } from "@/lib/onboarding/public"

const appUrl = "http://localhost:3000"

afterEach(() => {
  vi.unstubAllEnvs()
})

describe("provisionWorkspace", () => {
  it("creates a pending workspace and owner invite without sending employee mail", async () => {
    const store = createMemoryStore(emptyStore())
    const result = await provisionWorkspace(
      store,
      {
        companyName: "Kystens Murer",
        contactName: "Anna",
        contactEmail: "anna@kystens.dk",
        enabledServiceIds: ["renovering"],
        customServiceLabels: ["Køkken"],
        employees: [
          { name: "Bo", email: "bo@kystens.dk", role: "medarbejder" },
        ],
      },
      "invite",
      appUrl
    )

    expect(result.workspace.status).toBe("pending")
    expect(result.workspace.useDemoData).toBe(false)
    expect(result.workspace.enabledServiceIds).toEqual(["renovering", "koekken"])
    expect(result.workspace.customServices).toEqual([
      { id: "koekken", label: "Køkken" },
    ])
    expect(result.deliveries).toHaveLength(2)
    expect(result.deliveries[0]?.kind).toBe("owner")
    expect(result.deliveries[0]?.url).toContain("/velkommen/")
    expect(result.deliveries[0]?.sent).toBe(false)
    expect(result.deliveries[1]?.kind).toBe("employee")
    expect(result.deliveries[1]?.sent).toBe(false)

    const data = await store.read()
    const ownerMembership = data.memberships.find(
      (item) => item.userId === result.ownerUserId
    )
    expect(ownerMembership?.status).toBe("invited")
    expect(data.workspaces[0]?.provisionedAt).toBeNull()
  })

  it("activates the workspace immediately and keeps an empty CRM", async () => {
    const store = createMemoryStore(emptyStore())
    const result = await provisionWorkspace(
      store,
      {
        companyName: "Vestjyden",
        contactName: "Carl",
        contactEmail: "carl@vestjyden.dk",
        enabledServiceIds: ["nybyg", "tilbygning"],
        customServiceLabels: [],
      },
      "immediate",
      appUrl
    )

    expect(result.workspace.status).toBe("active")
    expect(result.workspace.useDemoData).toBe(false)
    expect(result.workspace.provisionedAt).toBeTruthy()
    const data = await store.read()
    const ownerMembership = data.memberships.find(
      (item) => item.userId === result.ownerUserId
    )
    expect(ownerMembership?.status).toBe("active")
  })
})

describe("completeInvite", () => {
  it("lets the owner set a password, confirm the business and invite teammates", async () => {
    const store = createMemoryStore(emptyStore())
    const created = await provisionWorkspace(
      store,
      {
        companyName: "Kystens Murer",
        contactName: "Anna",
        contactEmail: "anna@kystens.dk",
        enabledServiceIds: ["renovering"],
        customServiceLabels: [],
      },
      "invite",
      appUrl
    )
    const ownerInvite = created.deliveries.find((item) => item.kind === "owner")
    const token = ownerInvite?.url.split("/").pop()
    expect(token).toBeTruthy()

    const completed = await completeInvite(
      store,
      token!,
      {
        password: "Hemmelig12",
        companyName: "Kystens Murer ApS",
        enabledServiceIds: ["renovering", "tagdaekning"],
        customServiceLabels: ["Gulv"],
        employees: [{ name: "Bo", email: "bo@kystens.dk", role: "medarbejder" }],
      },
      appUrl
    )

    const data = await store.read()
    const workspace = data.workspaces.find((item) => item.id === completed.workspaceId)
    const owner = data.users.find((item) => item.id === completed.userId)
    expect(workspace?.status).toBe("active")
    expect(workspace?.name).toBe("Kystens Murer ApS")
    expect(workspace?.customServices).toEqual([
      { id: "gulv", label: "Gulv" },
    ])
    expect(workspace?.enabledServiceIds).toContain("gulv")
    expect(owner?.passwordHash).toBeTruthy()
    expect(completed.deliveries).toHaveLength(1)
    expect(completed.deliveries[0]?.email).toBe("bo@kystens.dk")
  })

  it("rejects expired invites", async () => {
    const store = createMemoryStore(emptyStore())
    const created = await provisionWorkspace(
      store,
      {
        companyName: "Kystens Murer",
        contactName: "Anna",
        contactEmail: "anna@kystens.dk",
        enabledServiceIds: ["renovering"],
        customServiceLabels: [],
      },
      "invite",
      appUrl
    )
    await store.update((data) => {
      data.invites[0]!.expiresAt = new Date(Date.now() - 1000).toISOString()
    })
    const token = created.deliveries[0]!.url.split("/").pop()!
    await expect(
      completeInvite(store, token, { password: "Hemmelig12" }, appUrl)
    ).rejects.toThrow(/udløbet/)
  })
})

describe("resendInvite", () => {
  it("rotates the token so the previous link no longer works", async () => {
    const store = createMemoryStore(emptyStore())
    const created = await provisionWorkspace(
      store,
      {
        companyName: "Kystens Murer",
        contactName: "Anna",
        contactEmail: "anna@kystens.dk",
        enabledServiceIds: ["renovering"],
        customServiceLabels: [],
      },
      "invite",
      appUrl
    )
    const first = created.deliveries[0]!
    const resent = await resendInvite(store, first.inviteId, appUrl)
    expect(resent.url).not.toBe(first.url)
    const data = await store.read()
    expect(data.invites[0]?.token).toBe(resent.url.split("/").pop())
    expect(isInviteOpen(data.invites[0]!)).toBe(true)
  })
})
