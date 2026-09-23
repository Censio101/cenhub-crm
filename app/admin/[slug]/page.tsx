import { redirect } from "next/navigation"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function AdminClientIndexPage({ params }: PageProps) {
  const { slug } = await params
  redirect(`/admin/${slug}/meta`)
}
