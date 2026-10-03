import type { Metadata } from "next"

import { AdminInviteAccept } from "@/components/account/AdminInviteAccept"

export const metadata: Metadata = {
  title: "Invitation – Censio Internal",
}

export default async function AdminInvitationPage({
  params,
}: {
  params: Promise<{ token: string }>
}) {
  const { token } = await params
  return <AdminInviteAccept token={token} />
}
