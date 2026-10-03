import type { Metadata } from "next"

import { PublicOfferView } from "@/components/offers/PublicOfferView"

export const metadata: Metadata = {
  title: "Tilbud – Censio",
}

export default async function PublicOfferPage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  return <PublicOfferView slug={slug} />
}
