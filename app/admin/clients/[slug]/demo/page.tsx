import { redirect } from "next/navigation"

type Props = { params: Promise<{ slug: string }> }

/** Demo settings removed — send old bookmarks to client overview. */
export default async function AdminClientDemoRedirect({ params }: Props) {
  const { slug } = await params
  redirect(`/admin/clients/${slug}`)
}
