import { redirect } from "next/navigation"

type Props = { params: Promise<{ id: string }> }

export default async function LegacyTemplateEditorRedirect({ params }: Props) {
  const { id } = await params
  redirect(`/admin/lead-sheets/templates/${id}`)
}
