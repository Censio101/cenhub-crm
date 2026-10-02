import { redirect } from "next/navigation"

type Props = { params: Promise<{ slug: string }> }

/**
 * The dedicated edit route was folded into the main lead-sheet page: the
 * column editor now renders inline once "Unique to this client" mode is
 * active. This redirect keeps old bookmarks/links working.
 */
export default async function LegacyClientLeadSheetEditRedirect({ params }: Props) {
  const { slug } = await params
  redirect(`/admin/clients/${slug}/lead-sheet`)
}
