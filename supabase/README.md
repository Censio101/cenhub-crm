# Supabase — Censio Internal

> Vercel-projekt: **censio-internal** (tidligere send-hub-internal)

Persistent database for **Censio Internal** (kunder, kontakter, omsætning/abonnementer, omkostninger, tilbud, tracking, brugere, invites, audit log).

## 1. Opret Supabase-projekt

1. Gå til [supabase.com/dashboard](https://supabase.com/dashboard) → **New project**.
2. Navn: **Censio Internal** (eller tilsvarende).
3. Vælg region (fx Frankfurt) og gem database-password.

## 2. Kør schema

1. **SQL Editor** → New query.
2. Indsæt indholdet af `supabase/migrations/20261003000000_censio_internal.sql`.
3. **Run**.

Tjek under **Table Editor** at tabeller `ci_*` findes.

## 3. API-nøgler (Vercel + lokal)

Project Settings → **API**:

| Variabel | Værdi |
|----------|--------|
| `SUPABASE_URL` | Project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | **service_role** (secret — kun server) |

Sæt begge på **Vercel** (Production + Preview) for `censio-internal`.

### Automatisk opsætning (anbefalet)

1. Opret [Personal Access Token](https://supabase.com/dashboard/account/tokens) med **Organization Projects** + **Database** (read/write).
2. Kør:

```bash
export SUPABASE_ACCESS_TOKEN="sbp_..."
node scripts/provision-censio-internal-supabase.mjs
```

Scriptet opretter projektet **Censio Internal**, kører migration, migrerer lokal `.data` hvis den findes, og sætter Vercel env.

### Synkroniser lokal data til Supabase

Når `.data/cenhub-store.json` er master (fx efter lokal udvikling):

```bash
# .env.local: SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY
node scripts/sync-local-store-to-supabase.mjs
```

Behold også:

- `CENSIO_ADMIN_EMAIL`
- `CENSIO_ADMIN_PASSWORD`

Når `SUPABASE_URL` + `SUPABASE_SERVICE_ROLE_KEY` er sat, bruger appen **ikke** `.data/cenhub-store.json` på serveren.

## 4. Migrér eksisterende lokal data

```bash
export SUPABASE_URL="https://xxxx.supabase.co"
export SUPABASE_SERVICE_ROLE_KEY="eyJ..."
node scripts/migrate-store-to-supabase.mjs
```

Kontraktfiler i `.data/contracts/` skal uploades manuelt til bucket **censio-internal-contracts** (mappe pr. `workspaceId/`), eller uploades igen via UI efter migration.

## 5. Tabeller (overblik)

| Tabel | Indhold |
|-------|---------|
| `ci_workspaces` | Kunder / workspaces |
| `ci_customer_contacts` | Kontaktpersoner, CVR, telefon |
| `ci_commercial_lines` | Omsætning / abonnementer pr. kunde |
| `ci_offers` | Tilbud (sendt, accepteret) |
| `ci_offer_engagement` | Læsning / scroll på tilbud |
| `ci_fixed_expenses` | Interne omkostninger |
| `ci_users` / `ci_memberships` / `ci_invites` / `ci_sessions` | Auth & onboarding |
| `ci_audit_logs` | Head admin log |
| `ci_customer_documents` | Metadata; filer i Storage bucket |

Skrivning sker atomisk via Postgres-funktionen `ci_replace_store` (service role).
