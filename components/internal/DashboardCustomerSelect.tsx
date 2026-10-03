"use client"

import { useMemo, useState } from "react"
import { ChevronDownIcon } from "lucide-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { onboardingFieldClass } from "@/components/onboarding/field"
import type { InternalCustomer } from "@/lib/internal/metrics"

function customerSearchText(customer: InternalCustomer) {
  return [
    customer.name,
    customer.contactName,
    customer.phone,
    customer.email,
    customer.subEmail,
    customer.cvr,
    customer.website,
    ...customer.people.flatMap((person) => [
      person.name,
      person.title,
      ...person.phones.map((entry) => entry.number),
      ...person.emails.map((entry) => entry.email),
    ]),
  ]
    .join(" ")
    .toLocaleLowerCase("da")
}

function customerMatchesQuery(customer: InternalCustomer, query: string) {
  const needle = query.trim().toLocaleLowerCase("da")
  if (!needle) return true
  return customerSearchText(customer).includes(needle)
}

export function DashboardCustomerSelect({
  customers,
  value,
  onChange,
  className,
  wrapperClassName,
  label = "Kunder",
}: {
  customers: InternalCustomer[]
  value: string[]
  onChange: (value: string[]) => void
  className?: string
  wrapperClassName?: string
  label?: string
}) {
  const [query, setQuery] = useState("")
  const sorted = useMemo(
    () => customers.slice().sort((a, b) => a.name.localeCompare(b.name, "da")),
    [customers]
  )
  const filtered = useMemo(
    () => sorted.filter((customer) => customerMatchesQuery(customer, query)),
    [sorted, query]
  )
  const allIds = useMemo(() => sorted.map((customer) => customer.workspaceId), [sorted])
  const chosen = sorted.filter((customer) => value.includes(customer.workspaceId))
  const summary =
    value.length === 0
      ? "Alle kunder"
      : chosen.length === 1
        ? chosen[0]?.name ?? "1 kunde"
        : `${chosen.length} kunder`

  return (
    <div className={wrapperClassName ?? "grid min-w-0 gap-1.5 text-sm text-[var(--text-secondary)]"}>
      <span>{label}</span>
      <DropdownMenu>
        <DropdownMenuTrigger
          render={
            <Button
              type="button"
              variant="outline"
              className={className ?? "dashboard-chip w-full justify-between px-4 sm:w-52"}
              aria-label={label}
            />
          }
        >
          <span className="truncate">{summary}</span>
          <ChevronDownIcon className="size-4 shrink-0 opacity-60" />
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-[min(100vw-2rem,20rem)] p-2">
          <input
            className={`${onboardingFieldClass} mb-2 w-full`}
            placeholder="Søg navn, e-mail, telefon, CVR…"
            value={query}
            aria-label="Søg kunder"
            onChange={(event) => setQuery(event.target.value)}
            onKeyDown={(event) => event.stopPropagation()}
            onClick={(event) => event.stopPropagation()}
          />
          <DropdownMenuCheckboxItem
            checked={value.length === 0}
            onCheckedChange={() => {
              onChange([])
              setQuery("")
            }}
          >
            Alle kunder
          </DropdownMenuCheckboxItem>
          {filtered.length === 0 ? (
            <p className="px-2 py-2 text-xs text-[var(--text-secondary)]">Ingen kunder matcher søgningen.</p>
          ) : (
            filtered.map((customer) => (
              <DropdownMenuCheckboxItem
                key={customer.workspaceId}
                checked={value.length === 0 || value.includes(customer.workspaceId)}
                onCheckedChange={() =>
                  onChange(
                    (() => {
                      const active = value.length === 0 ? allIds : value
                      const next = active.includes(customer.workspaceId)
                        ? active.filter((id) => id !== customer.workspaceId)
                        : [...active, customer.workspaceId]
                      return next.length === 0 || next.length === allIds.length ? [] : next
                    })()
                  )
                }
              >
                <span className="truncate">{customer.name}</span>
              </DropdownMenuCheckboxItem>
            ))
          )}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
