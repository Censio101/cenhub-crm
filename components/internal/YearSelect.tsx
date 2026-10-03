"use client"

export function YearSelect({
  years,
  value,
  onChange,
  className,
}: {
  years: number[]
  value: number
  onChange: (year: number) => void
  className?: string
}) {
  return (
    <label className="grid shrink-0 gap-1.5 text-sm whitespace-nowrap text-[var(--text-secondary)]">
      År
      <select
        className={className ?? "dashboard-chip w-full px-4 sm:w-32"}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        aria-label="År"
      >
        {years.map((year) => (
          <option key={year} value={year}>
            {year}
          </option>
        ))}
      </select>
    </label>
  )
}
