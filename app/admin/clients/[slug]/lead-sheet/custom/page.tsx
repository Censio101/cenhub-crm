import { redirect } from "next/navigation"

type Props = { params: Promise<{ slug: string }> }

export default async function LegacyClientLeadSheetCustomRedirect({ params }: Props) {
  const { slug } = await params
  redirect(`/admin/clients/${slug}/lead-sheet`)
}
