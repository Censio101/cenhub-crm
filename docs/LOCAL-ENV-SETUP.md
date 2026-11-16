# Local `.env.local` (staging only)

1. Supabase dashboard → **Cenhub CRM Staging** (`jyqujippulfaixfawuuc`) → Settings → API.
2. Copy keys into `.env.local` from [staging.env.example](./staging.env.example).
3. Verify:

```bash
npm run env:verify-dev
```

Must **not** show production ref `jrywehprthtydlpohuef`.

4. CLI should be linked to staging:

```bash
supabase link --project-ref jyqujippulfaixfawuuc
```

5. Copy production **data** once: [CLONE-PROD-TO-STAGING.md](./CLONE-PROD-TO-STAGING.md) (schema-only staging has empty orgs until you clone).

Optional `.env.production.local` with prod keys — **read-only smoke only**, not for `npm run dev`.