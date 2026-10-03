import { coerceFixedExpense, monthlyExpenseTotal, normalizeExpenses } from "@/lib/internal/expenses"
import { describeExpenseChanges, pushAudit } from "@/lib/onboarding/audit"
import { jsonError, requireCensioAdmin } from "@/lib/onboarding/auth"
import { createId } from "@/lib/onboarding/ids"
import { getStore } from "@/lib/onboarding/store"
import type { FixedExpense } from "@/lib/onboarding/types"

export async function GET() {
  try {
    await requireCensioAdmin()
    const data = await getStore().read()
    const lines = normalizeExpenses(data.fixedExpenses)
    return Response.json({
      lines,
      monthlyTotal: monthlyExpenseTotal(lines),
    })
  } catch (error) {
    return jsonError(error)
  }
}

export async function PUT(request: Request) {
  try {
    const actor = await requireCensioAdmin()
    const body = (await request.json()) as { lines?: Partial<FixedExpense>[] }
    const incoming = Array.isArray(body.lines) ? body.lines : null
    if (!incoming) throw new Error("Ugyldig liste af abonnementer.")
    const lines = incoming.map((line) => coerceFixedExpense(line, line.id?.trim() || createId("exp")))
    const saved = await getStore().update((data) => {
      const change = describeExpenseChanges(data.fixedExpenses, lines)
      data.fixedExpenses = lines
      if (change) {
        pushAudit(data, actor, { action: "Omkostninger", target: "Abonnementer", change })
      }
      return lines
    })
    return Response.json({
      lines: saved,
      monthlyTotal: monthlyExpenseTotal(saved),
    })
  } catch (error) {
    return jsonError(error)
  }
}
