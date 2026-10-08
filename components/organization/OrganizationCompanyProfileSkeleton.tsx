"use client"

import { Card, CardContent } from "@/components/ui/card"
import { useLanguage } from "@/components/i18n/LanguageProvider"
import { cn } from "cn"

function FieldSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("grid gap-1.5", className)}>
      <div className="h-3 w-24 max-w-[70%] animate-pulse rounded-md bg-muted/70" />
      <div className="h-11 w-full animate-pulse rounded-[15px] bg-muted/60" />
    </div>
  )
}

function FormSectionSkeleton({
  fieldLayout,
  withBorder = true,
}: {
  fieldLayout: React.ReactNode
  withBorder?: boolean
}) {
  return (
    <div
      className={cn(
        "grid gap-4 pb-8",
        withBorder && "border-b border-border"
      )}
      aria-hidden="true"
    >
      <div className="grid gap-2">
        <div className="h-5 w-32 animate-pulse rounded-md bg-muted/70" />
        <div className="h-3.5 w-full max-w-sm animate-pulse rounded-md bg-muted/50" />
      </div>
      {fieldLayout}
    </div>
  )
}

function WorkspacePageFormSkeleton() {
  return (
    <Card className="dashboard-card overflow-hidden" aria-hidden="true">
      <div className="grid gap-8 px-6 py-6 sm:px-8 sm:py-8">
        <FormSectionSkeleton
          fieldLayout={
            <div className="flex min-h-[9.5rem] flex-col gap-4 rounded-[15px] border border-dashed border-border bg-muted/20 p-5 sm:flex-row sm:items-center">
                <div className="h-24 w-full max-w-[280px] animate-pulse rounded-xl bg-muted/60 sm:h-28 sm:w-56" />
                <div className="flex flex-1 flex-col gap-2">
                  <div className="h-4 w-40 animate-pulse rounded-md bg-muted/70" />
                  <div className="h-3 w-full max-w-xs animate-pulse rounded-md bg-muted/50" />
                  <div className="mt-2 flex gap-2">
                    <div className="h-10 w-28 animate-pulse rounded-[5px] bg-muted/60" />
                  </div>
                </div>
              </div>
          }
        />
        <FormSectionSkeleton
          fieldLayout={
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldSkeleton className="sm:col-span-2" />
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
          }
        />
        <FormSectionSkeleton
          fieldLayout={
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldSkeleton className="sm:col-span-2" />
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
          }
        />
        <FormSectionSkeleton
          withBorder={false}
          fieldLayout={
            <div className="grid gap-3 sm:grid-cols-2">
              <FieldSkeleton className="sm:col-span-2" />
              <FieldSkeleton />
              <FieldSkeleton />
            </div>
          }
        />
      </div>
      <div className="border-t border-border bg-[#faf8f6] px-6 py-5 sm:px-8">
        <div className="h-11 w-full max-w-[10rem] animate-pulse rounded-[5px] bg-muted/60" />
      </div>
    </Card>
  )
}

export function OrganizationCompanyProfileSkeleton({
  omitCardHeader = false,
}: {
  omitCardHeader?: boolean
}) {
  const { t } = useLanguage()

  if (omitCardHeader) {
    return (
      <div aria-busy="true" aria-live="polite">
        <p className="sr-only">{t("loadingClient")}</p>
        <WorkspacePageFormSkeleton />
      </div>
    )
  }

  return (
    <Card className="dashboard-card w-full" aria-busy="true" aria-live="polite">
      <p className="sr-only">{t("loadingClient")}</p>
      <CardContent className="grid gap-6 pt-6">
        <div className="border-b border-border pb-6">
          <div className="h-4 w-28 animate-pulse rounded-md bg-muted/70" />
          <div className="mt-1 h-3.5 w-56 max-w-full animate-pulse rounded-md bg-muted/50" />
          <div className="mt-4 flex flex-wrap items-center gap-4">
            <div className="size-16 animate-pulse rounded-xl bg-muted/60" />
            <div className="h-10 w-32 animate-pulse rounded-[15px] bg-muted/60" />
          </div>
        </div>

        <div className="grid gap-3">
          <div className="h-5 w-36 animate-pulse rounded-md bg-muted/70" />
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldSkeleton className="sm:col-span-2" />
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
        </div>

        <div className="grid gap-3">
          <div className="h-5 w-32 animate-pulse rounded-md bg-muted/70" />
          <div className="grid gap-3 sm:grid-cols-2">
            <FieldSkeleton />
            <FieldSkeleton />
            <FieldSkeleton className="sm:col-span-2" />
            <FieldSkeleton />
            <FieldSkeleton />
          </div>
        </div>

        <div className="h-10 w-36 animate-pulse rounded-[15px] bg-muted/60" />
      </CardContent>
    </Card>
  )
}

export function CompanyDetailsPageSkeleton() {
  const { t } = useLanguage()
  const block = "animate-pulse rounded-xl bg-[#efe8e0]"

  return (
    <div className="mx-auto w-full max-w-5xl" aria-busy="true" aria-live="polite">
      <p className="sr-only">{t("loadingClient")}</p>
      <div className="overflow-hidden rounded-3xl border border-[#e8e0d8] bg-white">
        <div className="bg-[#efe8e0] px-5 py-5 sm:px-8 sm:py-6">
          <div className="flex min-h-[5.5rem] items-center sm:min-h-24">
            <div className="h-16 w-48 animate-pulse rounded-2xl bg-[#e3d9ce] sm:h-[5.25rem] sm:w-60" />
          </div>
        </div>
        <div className="space-y-2.5 px-5 py-5 sm:px-8 sm:py-6">
          <div className={cn(block, "h-7 w-56")} />
          <div className="flex gap-2">
            <div className={cn(block, "h-6 w-24 rounded-full")} />
            <div className={cn(block, "h-6 w-32 rounded-full")} />
          </div>
        </div>
      </div>
      <div className="mt-6 overflow-hidden rounded-3xl border border-[#e8e0d8] bg-white md:grid md:grid-cols-[14.5rem_minmax(0,1fr)]">
        <div className="flex gap-1.5 border-b border-[#e8e0d8] bg-[#faf8f6] p-2.5 md:flex-col md:border-r md:border-b-0 md:p-4">
          <div className={cn(block, "h-10 w-full")} />
          <div className={cn(block, "h-10 w-full")} />
          <div className={cn(block, "h-10 w-full")} />
        </div>
        <div className="p-5 sm:p-8">
          <div className="border-b border-[#efe6dd] pb-5">
            <div className={cn(block, "h-6 w-32")} />
            <div className={cn(block, "mt-2 h-4 w-72 max-w-full")} />
          </div>
          <div className="mt-7 grid gap-5 sm:grid-cols-2">
            <div className={cn(block, "h-11 w-full sm:col-span-2")} />
            <div className={cn(block, "h-11 w-full")} />
            <div className={cn(block, "h-11 w-full")} />
          </div>
        </div>
      </div>
    </div>
  )
}
