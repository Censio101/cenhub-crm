<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

## Admin shell UX

- The admin area uses a persistent sidebar (`AdminSidebar`). Do **not** add “back to …” links or breadcrumb back navigation on admin pages — use sidebar navigation only.

## Supabase migrations

- Add SQL under `supabase/migrations/` (sequential numbering).
- Apply to the linked remote project: `npm run db:migrate` (`supabase db push --linked`).
- After adding migrations, run this command in the agent session unless the user says not to.

## Admin API performance

- Every route under `app/api/admin/**` must call `requireCensioAdmin()`. Middleware does **not** gate `/api/*` (auth once per handler via `getCachedSessionContext`).
- **Full hub** (Meta Graph + org stats): `GET /api/admin/organizations` only — used by `/admin` hub UI (`AdminClientList`).
- **Picker / directory / scope bar**: `GET /api/admin/organizations/picker` — no Meta partner fetch, no lead/user counts.
- **Client-manage shell**: `GET /api/admin/organizations/[slug]/manage-bootstrap` — one request for org stats + users + meta.
- Prefer `getOrganizationBySlug` on slug routes; use `getOrganizationWithStatsBySlug` only when the UI needs counts.
- Never use `listAuthUsersById` for a single org — use `getAuthUsersByIds` for the profile IDs you return.
- Meta `fetchPartnerAdAccounts`: hub/onboarding only; client Meta settings load partner list when the user opens the picker (edit/link). Optional 90s server cache; call `clearPartnerAdAccountsCache()` after link/unlink.
- Before adding client `fetch("/api/admin/…")`, choose **picker**, **bootstrap**, or **full hub** — do not pull the hub list from client-manage pages.

### Manual perf smoke (Network tab)

- `/admin/clients/{slug}`: one `manage-bootstrap`, picker for scope bar — no `partner-ad-accounts`, no full `organizations`.
- `/admin/clients/{slug}/funnels`: funnels API only (no integrations on mount).
- `/admin`: full `organizations` still loads (Meta OK here).
- Unauthenticated `GET /api/admin/organizations` → 401.
