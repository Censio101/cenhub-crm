"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { AppTopbarShell } from "@/components/layout/AppTopbarShell"
import { isGuestShellPath, isPublicSignupPath } from "@/lib/layout/app-paths"

/** Original file is 1024×251. Width follows that ratio so the header cannot squash it. */
const censioLogoClass =
  "h-8 w-[calc(2rem*1024/251)] max-w-none shrink-0 object-contain aspect-[1024/251] sm:h-9 sm:w-[calc(2.25rem*1024/251)]"

const topbarShellClass =
  "relative sticky top-0 z-40 grid min-h-[4.5rem] w-full max-w-full min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 overflow-x-clip bg-[#0a0a0a] bg-[linear-gradient(90deg,#8f3608_0%,#5c2206_42%,#140c08_76%,#0a0a0a_100%)] px-4 py-2 font-sans sm:gap-x-3 sm:px-6 lg:px-8 xl:min-h-[4.5rem] xl:grid-cols-[minmax(0,1fr)_auto] xl:py-2"

function GuestAppTopbar() {
  const pathname = usePathname()
  const homeHref = isPublicSignupPath(pathname) ? "/tilmelding" : "/login"

  return (
    <header className={topbarShellClass}>
      <div className="z-10 col-start-1 row-start-1 flex min-w-0 items-center justify-self-start max-w-none">
        <Link
          href={homeHref}
          className="flex min-w-0 items-center gap-3.5 sm:gap-4"
          aria-label="Censio"
        >
          <Image
            src="/censio-logo-white.png"
            alt="Censio"
            width={1024}
            height={251}
            className={censioLogoClass}
            priority
          />
        </Link>
      </div>
    </header>
  )
}

export function AppTopbar() {
  const pathname = usePathname()
  if (isGuestShellPath(pathname)) {
    return <GuestAppTopbar />
  }

  return <AppTopbarShell />
}
