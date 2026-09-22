"use client"

import Link from "next/link"

import { isBrowserSupabaseConfigured } from "@/lib/supabase/client"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

export default function LoggetUdPage() {
  const usesSupabase = isBrowserSupabaseConfigured()

  return (
    <div className="mx-auto flex max-w-lg justify-center py-10">
      <Card className="w-full">
        <CardHeader>
          <p className="text-xs font-medium tracking-[0.16em] text-primary uppercase">
            Konto
          </p>
          <CardTitle className="mt-1 text-lg">Du er logget ud</CardTitle>
          <CardDescription>
            {usesSupabase
              ? "Du er logget ud. Log ind igen for at se jeres dashboard."
              : "Din session er ryddet i denne browser. Log ind igen for at fortsætte."}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button render={<Link href={usesSupabase ? "/login" : "/"} />} className="h-10">
            Log ind igen
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
