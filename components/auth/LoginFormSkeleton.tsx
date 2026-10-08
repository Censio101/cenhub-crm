import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

/** Matches `LoginForm` layout so Suspense does not jump when the form loads. */
export function LoginFormSkeleton() {
  return (
      <Card className="dashboard-card w-full motion-safe:animate-in motion-safe:fade-in-0 motion-safe:duration-300">
        <CardHeader className="pb-4">
          <CardTitle className="text-xl font-medium sm:text-2xl">
            <span className="inline-block h-8 w-48 animate-pulse rounded-md bg-muted/70" />
          </CardTitle>
          <CardDescription>
            <span className="mt-1 inline-block h-4 w-full max-w-sm animate-pulse rounded-md bg-muted/60" />
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-5">
          <div className="grid gap-2">
            <span className="h-4 w-16 animate-pulse rounded bg-muted/60" />
            <div className="h-10 animate-pulse rounded-[15px] bg-muted/70" />
          </div>
          <div className="grid gap-2">
            <span className="h-4 w-20 animate-pulse rounded bg-muted/60" />
            <div className="h-10 animate-pulse rounded-[15px] bg-muted/70" />
          </div>
          <div className="h-11 animate-pulse rounded-[5px] bg-muted/70" />
        </CardContent>
      </Card>
  )
}
