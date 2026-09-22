"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { cn } from "cn"

const links = [
  { href: "/admin", label: "Klienter" },
  { href: "/admin/meta", label: "Meta klienter" },
] as const

export function AdminNav() {
  const pathname = usePathname()

  return (
    <nav className="flex flex-wrap gap-2" aria-label="Admin navigation">
      {links.map((link) => {
        const active =
          link.href === "/admin"
            ? pathname === "/admin"
            : pathname.startsWith(link.href)
        return (
          <Link
            key={link.href}
            href={link.href}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              active
                ? "bg-primary text-white"
                : "bg-muted text-muted-foreground hover:text-foreground"
            )}
          >
            {link.label}
          </Link>
        )
      })}
    </nav>
  )
}
