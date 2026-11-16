# GitHub Actions — use staging Supabase

Settings → Secrets and variables → Actions:

| Secret | Value |
|--------|--------|
| `NEXT_PUBLIC_SUPABASE_URL` | Staging project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Staging anon |
| `SUPABASE_SERVICE_ROLE_KEY` | Staging service role |

Settings → Variables:

| Variable | Value |
|----------|--------|
| `ENABLE_TENANT_ISOLATION_CI` | `true` when secrets are staging |

**Do not** use production service role in CI once staging exists.

The `tenant-isolation` job runs on `main` push only when the variable is set ([`.github/workflows/ci.yml`](../.github/workflows/ci.yml)).