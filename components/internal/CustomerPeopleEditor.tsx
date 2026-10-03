"use client"

import { PlusIcon, Trash2Icon } from "lucide-react"

import { Button } from "@/components/ui/button"
import { onboardingFieldClass } from "@/components/onboarding/field"
import {
  contactEntryId,
  emptyPerson,
  patchPerson,
  patchPersonEmails,
  patchPersonPhones,
} from "@/lib/internal/customer-contact"
import type { CustomerPerson } from "@/lib/onboarding/types"

export function CustomerPeopleEditor({
  people,
  onChange,
}: {
  people: CustomerPerson[]
  onChange: (people: CustomerPerson[]) => void
}) {
  return (
    <div className="grid gap-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-[var(--text-primary)]">Kontaktpersoner</p>
        <Button type="button" variant="outline" size="sm" onClick={() => onChange([...people, emptyPerson()])}>
          <PlusIcon className="size-4" aria-hidden />
          Tilføj person
        </Button>
      </div>
      {people.map((person, personIndex) => (
        <div key={person.id} className="grid gap-3 rounded-[12px] border border-border bg-white p-3 sm:p-4">
          <div className="flex items-start justify-between gap-2">
            <p className="text-sm font-medium text-[var(--text-primary)]">Person {personIndex + 1}</p>
            {people.length > 1 ? (
              <button
                type="button"
                className="inline-flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                onClick={() => onChange(people.filter((item) => item.id !== person.id))}
              >
                <Trash2Icon className="size-3.5" aria-hidden />
                Fjern
              </button>
            ) : null}
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
              Navn
              <input
                className={onboardingFieldClass}
                value={person.name}
                placeholder="Kontaktperson"
                onChange={(event) => onChange(patchPerson(people, person.id, { name: event.target.value }))}
              />
            </label>
            <label className="grid gap-1.5 text-sm text-[var(--text-secondary)]">
              Stilling
              <input
                className={onboardingFieldClass}
                value={person.title}
                placeholder="Ejer, marketing m.m."
                onChange={(event) => onChange(patchPerson(people, person.id, { title: event.target.value }))}
              />
            </label>
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-[var(--text-secondary)]">Telefonnumre</p>
              <button
                type="button"
                className="text-xs font-medium text-[var(--text-primary)] underline-offset-4 hover:underline"
                onClick={() =>
                  onChange(
                    patchPersonPhones(people, person.id, [
                      ...person.phones,
                      { id: contactEntryId(), label: "Mobil", number: "" },
                    ])
                  )
                }
              >
                Tilføj nummer
              </button>
            </div>
            {person.phones.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">Ingen numre endnu.</p>
            ) : (
              person.phones.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-end gap-2">
                  <label className="grid min-w-[6rem] flex-1 gap-1 text-xs text-[var(--text-secondary)]">
                    Type
                    <input
                      className={onboardingFieldClass}
                      value={entry.label}
                      onChange={(event) =>
                        onChange(
                          patchPersonPhones(
                            people,
                            person.id,
                            person.phones.map((phone) =>
                              phone.id === entry.id ? { ...phone, label: event.target.value } : phone
                            )
                          )
                        )
                      }
                    />
                  </label>
                  <label className="grid min-w-[10rem] flex-[2] gap-1 text-xs text-[var(--text-secondary)]">
                    Nummer
                    <input
                      className={onboardingFieldClass}
                      value={entry.number}
                      onChange={(event) =>
                        onChange(
                          patchPersonPhones(
                            people,
                            person.id,
                            person.phones.map((phone) =>
                              phone.id === entry.id ? { ...phone, number: event.target.value } : phone
                            )
                          )
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="mb-2 inline-flex size-8 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                    aria-label="Fjern telefonnummer"
                    onClick={() =>
                      onChange(
                        patchPersonPhones(
                          people,
                          person.id,
                          person.phones.filter((phone) => phone.id !== entry.id)
                        )
                      )
                    }
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>
          <div className="grid gap-2">
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs font-medium text-[var(--text-secondary)]">E-mailadresser</p>
              <button
                type="button"
                className="text-xs font-medium text-[var(--text-primary)] underline-offset-4 hover:underline"
                onClick={() =>
                  onChange(
                    patchPersonEmails(people, person.id, [
                      ...person.emails,
                      { id: contactEntryId(), label: "Direkte", email: "" },
                    ])
                  )
                }
              >
                Tilføj e-mail
              </button>
            </div>
            {person.emails.length === 0 ? (
              <p className="text-xs text-[var(--text-secondary)]">Ingen ekstra e-mails.</p>
            ) : (
              person.emails.map((entry) => (
                <div key={entry.id} className="flex flex-wrap items-end gap-2">
                  <label className="grid min-w-[6rem] flex-1 gap-1 text-xs text-[var(--text-secondary)]">
                    Type
                    <input
                      className={onboardingFieldClass}
                      value={entry.label}
                      onChange={(event) =>
                        onChange(
                          patchPersonEmails(
                            people,
                            person.id,
                            person.emails.map((mail) =>
                              mail.id === entry.id ? { ...mail, label: event.target.value } : mail
                            )
                          )
                        )
                      }
                    />
                  </label>
                  <label className="grid min-w-[10rem] flex-[2] gap-1 text-xs text-[var(--text-secondary)]">
                    E-mail
                    <input
                      className={onboardingFieldClass}
                      type="email"
                      value={entry.email}
                      onChange={(event) =>
                        onChange(
                          patchPersonEmails(
                            people,
                            person.id,
                            person.emails.map((mail) =>
                              mail.id === entry.id ? { ...mail, email: event.target.value } : mail
                            )
                          )
                        )
                      }
                    />
                  </label>
                  <button
                    type="button"
                    className="mb-2 inline-flex size-8 items-center justify-center rounded-md text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                    aria-label="Fjern e-mail"
                    onClick={() =>
                      onChange(
                        patchPersonEmails(
                          people,
                          person.id,
                          person.emails.filter((mail) => mail.id !== entry.id)
                        )
                      )
                    }
                  >
                    <Trash2Icon className="size-4" />
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
