import { cache } from "react"

import { getSessionContext, type SessionContext } from "@/lib/auth/session-context"

/** One Supabase session resolution per server request (RSC / route handler). */
export const getCachedSessionContext = cache(getSessionContext)

export type { SessionContext }
