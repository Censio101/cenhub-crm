import type { ReactNode } from "react"

import type { StructuredBlock } from "@/lib/leads/structured-text"

type RowBlock = Extract<StructuredBlock, { kind: "row" }>

type Group =
  | { kind: "heading"; text: string }
  | { kind: "rows"; rows: RowBlock[] }
  | { kind: "text"; text: string }

/** Consecutive rows share one two-column list so the labels line up. */
function groupBlocks(blocks: readonly StructuredBlock[]): Group[] {
  const groups: Group[] = []
  for (const block of blocks) {
    if (block.kind === "row") {
      const last = groups.at(-1)
      if (last?.kind === "rows") last.rows.push(block)
      else groups.push({ kind: "rows", rows: [block] })
    } else {
      groups.push(block)
    }
  }
  return groups
}

/**
 * Details as a tidy list: section titles, a bold label on the left and the value on the right.
 * Renders text only (React escapes it), so nothing typed into a form can inject markup.
 */
export function StructuredTextView({ blocks }: { blocks: readonly StructuredBlock[] }): ReactNode {
  return (
    <div className="space-y-3 rounded-xl border border-[#e0d7cc] bg-white px-4 py-3.5 text-[15px] leading-relaxed text-[var(--text-primary)]">
      {groupBlocks(blocks).map((group, index) => {
        if (group.kind === "heading") {
          return (
            <h3
              key={index}
              className="border-b border-[#efe6dd] pb-1 pt-1 text-[11px] font-semibold tracking-wide text-muted-foreground uppercase first:pt-0"
            >
              {group.text}
            </h3>
          )
        }
        if (group.kind === "text") {
          return (
            <p key={index} className="break-words whitespace-pre-wrap">
              {group.text}
            </p>
          )
        }
        return (
          <dl
            key={index}
            className="grid grid-cols-[minmax(6rem,10rem)_minmax(0,1fr)] gap-x-4 gap-y-1.5"
          >
            {group.rows.map((row, rowIndex) => (
              <div key={rowIndex} className="contents">
                <dt className="font-semibold">{row.label}</dt>
                <dd className="break-words whitespace-pre-wrap">
                  {row.value || <span className="text-muted-foreground/60">—</span>}
                </dd>
              </div>
            ))}
          </dl>
        )
      })}
    </div>
  )
}
