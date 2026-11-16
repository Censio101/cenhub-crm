# One-time copy: production Supabase → staging

Staging must **start as a copy** of production, then stay **independent** (no live sync).

**Production project ref:** `jrywehprthtydlpohuef` (do not use for day-to-day `db push`).

**Staging:** **Cenhub CRM Staging** — project ref `jyqujippulfaixfawuuc` (do not use Censio Internal).

## Step 1 — Empty staging project ready

1. Supabase dashboard → new project or open staging project.
2. Note **project ref**, URL, anon key, service role key.

## Step 2 — Clone data (pick one)

### A — Dashboard backup restore (Pro)

1. Production → **Database → Backups**.
2. Restore / duplicate into the **staging** project (never overwrite production).

### B — pg_dump / pg_restore

1. Production → Settings → Database → connection string (pooler or direct).
2. Dump:

```bash
pg_dump "$PROD_DATABASE_URL" \
  --format=custom \
  --file=cenhub-prod.dump \
  --no-owner --no-acl
```

3. Restore into staging empty database:

```bash
pg_restore --dbname="$STAGING_DATABASE_URL" \
  --no-owner --no-acl --clean --if-exists \
  cenhub-prod.dump
```

4. Align migration history if needed: `npm run db:migrate:staging`.

### C — Schema only (no PII)

```bash
npm run db:migrate:staging
npm run db:seed   # optional demo org
```

## Step 3 — After clone

- Staging does **not** auto-update when production changes.
- Refresh staging manually by repeating this guide (quarterly or before big releases).
- Point [`.env.local`](.env.local) and Vercel **Preview** env at **staging** keys only.

See [THREE-ENVIRONMENTS.md](./THREE-ENVIRONMENTS.md).