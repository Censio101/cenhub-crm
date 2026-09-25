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
    <div className="mx-auto flex w-full max-w-xl flex-1 flex-col justify-center py-10 sm:py-14">
      <Card className="dashboard-card w-full">
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
          <Button
            nativeButton={false}
            render={<Link href={usesSupabase ? "/login" : "/"} />}
            className="h-11 w-full rounded-[5px]"
          >
            Log ind igen
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
