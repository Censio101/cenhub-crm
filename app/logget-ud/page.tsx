"use client"

import { useRouter } from "next/navigation"

import { signIn } from "@/lib/session"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function LoggetUdPage() {
  const router = useRouter()

  return (
    <div className="mx-auto flex max-w-lg justify-center py-10">
      <Card className="w-full">
        <CardHeader>
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
            Konto
          </p>
          <CardTitle className="mt-1 text-lg">Du er logget ud</CardTitle>
          <CardDescription>
            Din session er ryddet i denne browser. Der er ingen rigtig
            login-integration endnu — det her er en mock, så I kan forlade
            CRM’et og komme tilbage.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button
            className="h-10"
            onClick={() => {
              signIn()
              router.push("/")
            }}
          >
            Log ind igen
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
