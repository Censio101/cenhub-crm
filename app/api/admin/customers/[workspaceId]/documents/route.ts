import { pushAudit } from "@/lib/onboarding/audit"
import { saveContractFile } from "@/lib/onboarding/contract-files"
import { createId, nowIso } from "@/lib/onboarding/ids"
import { jsonError, requireCensioAdmin } from "@/lib/onboarding/auth"
import { getStore } from "@/lib/onboarding/store"
import type { CustomerDocument } from "@/lib/onboarding/types"

const MAX_BYTES = 10 * 1024 * 1024
const ALLOWED = new Map([
  ["application/pdf", ".pdf"],
  ["image/png", ".png"],
  ["image/jpeg", ".jpg"],
  ["image/webp", ".webp"],
])

export async function POST(
  request: Request,
  context: { params: Promise<{ workspaceId: string }> }
) {
  try {
    const actor = await requireCensioAdmin()
    const { workspaceId } = await context.params
    const form = await request.formData()
    const file = form.get("file")
    if (!(file instanceof File) || file.size === 0) {
      throw new Error("Filen mangler.")
    }
    const extension = ALLOWED.get(file.type)
    if (!extension) throw new Error("Filtypen er ugyldig. Brug PDF eller billede.")
    if (file.size > MAX_BYTES) throw new Error("Filen er for stor. Maksimum er 10 MB.")
    const fileName = file.name.replace(/[^\w.\- æøåÆØÅ]/g, "").trim().slice(0, 120) || `kontrakt${extension}`
    const name = String(form.get("name") ?? "").trim().slice(0, 120)
    const note = String(form.get("note") ?? "").trim().slice(0, 500)
    const id = createId("doc")
    const storedName = `${id}${extension}`
    await saveContractFile(workspaceId, storedName, Buffer.from(await file.arrayBuffer()))
    const document: CustomerDocument = {
      id,
      workspaceId,
      fileName,
      storedName,
      uploadedAt: nowIso(),
      size: file.size,
      name,
      note,
    }
    const store = getStore()
    const saved = await store.update((data) => {
      const workspace = data.workspaces.find((item) => item.id === workspaceId)
      if (!workspace) throw new Error("Kunden findes ikke.")
      if (workspace.useDemoData) {
        throw new Error("Demo-kunden indgår ikke i Censio Internal.")
      }
      data.customerDocuments = [...data.customerDocuments, document]
      pushAudit(data, actor, {
        action: "Dokument",
        target: workspace.name,
        change: document.note
          ? `Uploadede ${document.fileName}. Note: ${document.note}`
          : `Uploadede ${document.fileName}.`,
      })
      return document
    })
    return Response.json({ document: saved })
  } catch (error) {
    return jsonError(error)
  }
}
