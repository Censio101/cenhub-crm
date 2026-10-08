import { Suspense } from "react"

import { GuestAuthPageFrame } from "@/components/auth/GuestAuthPageFrame"
import { LoginForm } from "@/components/auth/LoginForm"
import { LoginFormSkeleton } from "@/components/auth/LoginFormSkeleton"

export default function LoginPage() {
  return (
    <GuestAuthPageFrame>
      <Suspense fallback={<LoginFormSkeleton />}>
        <LoginForm />
      </Suspense>
    </GuestAuthPageFrame>
  )
}
