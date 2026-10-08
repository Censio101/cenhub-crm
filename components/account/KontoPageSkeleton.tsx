import { cn } from "cn"

const blockClass = "animate-pulse rounded-xl bg-[#efe8e0]"

export function KontoPageSkeleton() {
  return (
    <div className="mx-auto w-full max-w-5xl" aria-busy="true" aria-live="polite">
      <div className="overflow-hidden rounded-3xl border border-[#e8e0d8] bg-white">
        <div className="h-24 animate-pulse bg-[#efe8e0] sm:h-28" />
        <div className="flex flex-col items-center gap-4 px-5 pb-6 sm:flex-row sm:items-end sm:gap-6 sm:px-8">
          <div className="-mt-14 size-28 shrink-0 animate-pulse rounded-full bg-[#e5dcd2] ring-4 ring-white sm:-mt-16 sm:size-32" />
          <div className="w-full flex-1 space-y-2.5 pb-1">
            <div className={cn(blockClass, "mx-auto h-7 w-48 sm:mx-0")} />
            <div className={cn(blockClass, "mx-auto h-4 w-56 sm:mx-0")} />
            <div className="flex justify-center gap-2 sm:justify-start">
              <div className={cn(blockClass, "h-6 w-24 rounded-full")} />
              <div className={cn(blockClass, "h-6 w-28 rounded-full")} />
            </div>
          </div>
        </div>
      </div>
      <div className="mt-6 overflow-hidden rounded-3xl border border-[#e8e0d8] bg-white md:grid md:grid-cols-[14.5rem_minmax(0,1fr)]">
        <div className="flex gap-1.5 border-b border-[#e8e0d8] bg-[#faf8f6] p-2.5 md:flex-col md:border-r md:border-b-0 md:p-4">
          <div className={cn(blockClass, "h-10 w-full")} />
          <div className={cn(blockClass, "h-10 w-full")} />
          <div className={cn(blockClass, "h-10 w-full")} />
        </div>
        <div className="p-5 sm:p-8">
          <div className="border-b border-[#efe6dd] pb-5">
            <div className={cn(blockClass, "h-6 w-32")} />
            <div className={cn(blockClass, "mt-2 h-4 w-72 max-w-full")} />
          </div>
          <div className="mt-7 grid gap-5 lg:grid-cols-2">
            <div className={cn(blockClass, "h-11 w-full")} />
            <div className={cn(blockClass, "h-11 w-full")} />
          </div>
        </div>
      </div>
    </div>
  )
}
