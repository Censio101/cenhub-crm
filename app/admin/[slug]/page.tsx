import { AdminClientDetail } from "@/components/admin/AdminClientDetail"

type PageProps = {
  params: Promise<{ slug: string }>
}

export default async function AdminClientPage({ params }: PageProps) {
  const { slug } = await params
  return <AdminClientDetail slug={slug} />
}
