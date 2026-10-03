import { pushAudit } from "@/lib/onboarding/audit"
import { jsonError, requireCensioAdmin } from "@/lib/onboarding/auth"
import { readContractFile, removeContractFile } from "@/lib/onboarding/contract-files"
import { getStore } from "@/lib/onboarding/store"

function contentType(storedName: string) {
  if (storedName.endsWith(".pdf")) return "application/pdf"
  if (storedName.endsWith(".png")) return "image/png"
  if (storedName.endsWith(".jpg") || storedName.endsWith(".jpeg")) return "image/jpeg"
  if (storedName.endsWith(".webp")) return "image/webp"
  return "application/octet-stream"
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ workspaceId: string; documentId: string }> }
) {
  try {
    await requireCensioAdmin()
    const { workspaceId, documentId } = await context.params
    const data = await getStore().read()
    const document = data.customerDocuments.find(
      (item) => item.id === documentId && item.workspaceId === workspaceId
    )
    if (!document) throw new Error("Dokumentet findes ikke.")
    const bytes = await readContractFile(workspaceId, document.storedName)
    const filename = document.fileName.replace(/["\r\n]/g, "")
    return new Response(new Uint8Array(bytes), {
      headers: {
        "Content-Type": contentType(document.storedName),
        "Content-Disposition": `inline; filename="${filename}"`,
        "X-Content-Type-Options": "nosniff",
      },
    })
  } catch (error) {
    return jsonError(error)
  }
}

export async function PATCH(
  request: Request,
  context: { params: Promise<{ workspaceId: string; documentId: string }> }
) {
  try {
    const actor = await requireCensioAdmin()
    const { workspaceId, documentId } = await context.params
    const body = (await request.json()) as { name?: unknown; note?: unknown }
    const name = String(body.name ?? "").trim().slice(0, 120)
    const note = String(body.note ?? "").trim().slice(0, 500)
    const saved = await getStore().update((data) => {
      const document = data.customerDocuments.find(
        (item) => item.id === documentId && item.workspaceId === workspaceId
      )
      if (!document) throw new Error("Dokumentet findes ikke.")
      const workspace = data.workspaces.find((item) => item.id === workspaceId)
      document.name = name
      document.note = note
      pushAudit(data, actor, {
        action: "Dokument",
        target: workspace?.name ?? document.fileName,
        change: `Note på ${document.fileName}: ${note || "ingen note"}.`,
      })
      return document
    })
    return Response.json({ document: saved })
  } catch (error) {
    return jsonError(error)
  }
}

export async function DELETE(
  _request: Request,
  context: { params: Promise<{ workspaceId: string; documentId: string }> }
) {
  try {
    const actor = await requireCensioAdmin()
    const { workspaceId, documentId } = await context.params
    const store = getStore()
    const removed = await store.update((data) => {
      const document = data.customerDocuments.find(
        (item) => item.id === documentId && item.workspaceId === workspaceId
      )
      if (!document) throw new Error("Dokumentet findes ikke.")
      const workspace = data.workspaces.find((item) => item.id === workspaceId)
      data.customerDocuments = data.customerDocuments.filter((item) => item.id !== documentId)
      pushAudit(data, actor, {
        action: "Dokument",
        target: workspace?.name ?? document.fileName,
        change: `Fjernede ${document.fileName}.`,
      })
      return document
    })
    await removeContractFile(workspaceId, removed.storedName)
    return Response.json({ ok: true })
  } catch (error) {
    return jsonError(error)
  }
}
