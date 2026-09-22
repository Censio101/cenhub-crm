import { Suspense } from "react"

import { LoginForm } from "@/components/auth/LoginForm"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

function LoginFallback() {
  return (
    <div className="mx-auto flex max-w-lg justify-center py-10">
      <Card className="w-full">
        <CardHeader>
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
            Login
          </p>
          <CardTitle className="mt-1 text-lg">Log ind på Censio</CardTitle>
          <CardDescription>Henter login…</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-40 animate-pulse rounded-[15px] bg-muted/70" />
        </CardContent>
      </Card>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense fallback={<LoginFallback />}>
      <LoginForm />
    </Suspense>
  )
}
