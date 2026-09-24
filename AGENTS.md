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
