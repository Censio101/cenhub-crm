import { readSessionUser } from "@/lib/onboarding/auth"

export async function GET() {
  const user = await readSessionUser()
  return Response.json({ user })
}
