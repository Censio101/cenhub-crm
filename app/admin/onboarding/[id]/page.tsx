import { AdminOnboardingReview } from "@/components/admin/AdminOnboardingReview"

type PageProps = {
  params: Promise<{ id: string }>
}

export default async function AdminOnboardingReviewPage({ params }: PageProps) {
  const { id } = await params
  return <AdminOnboardingReview applicationId={id} />
}
