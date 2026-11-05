# Release regression — security + functional (B3)

Run on **staging** before every security-related production deploy. Spot-check critical paths on **prod** after deploy.

## Sign-off

| Field | Value |
|-------|--------|
| Date | |
| Environment | staging / prod |
| Tester | |
| Git ref / deploy | |
| B1 security (automated) | pass / fail |
| B3 below | pass / fail |
| Notes | |

---

## Authentication & sessions

| ID | Scenario | Pass |
|----|----------|------|
| T1 | Client password login → correct org dashboard | ☐ |
| T2 | Client magic link | ☐ |
| T3 | New invite (token in email) → setup password | ☐ |
| T4 | Censio admin → admin hub | ☐ |
| T5 | Admin “view as client” → leads load; return to admin OK | ☐ |
| T6 | Client cannot access another org’s data | ☐ |

## Lead sheet & customers

| ID | Scenario | Pass |
|----|----------|------|
| T7 | Lead list: filters, search, date, sort | ☐ |
| T8 | Inline edit on allowed columns | ☐ |
| T9 | Manual new lead (if used) | ☐ |
| T10 | CSV export | ☐ |
| T11 | Compact/full columns (Platform, form steps) | ☐ |
| T12 | Customers `/kunder` | ☐ |
| T13 | Realtime update (second tab) | ☐ |
| T14 | Delete: user no / client_admin yes / bulk Censio only | ☐ |

## Lead sheet admin

| ID | Scenario | Pass |
|----|----------|------|
| T15 | Admin sheet template / columns → client sees changes | ☐ |
| T16 | Funnel mapping + admin test payload | ☐ |
| T17 | Import batch (+ undo if used) | ☐ |

## Facebook / Meta

| ID | Scenario | Pass |
|----|----------|------|
| T18 | Meta lead webhook → row created | ☐ |
| T19 | Cron `meta-leads-reconcile` (Bearer) | ☐ |
| T20 | Meta sync / ad metrics → dashboard | ☐ |
| T21 | Cron `meta-capi-flush` | ☐ |
| T22 | Client Meta settings: no token in network responses | ☐ |
| T23 | Admin: enable form, subscribe, preview/import | ☐ |

## Funnels & automation

| ID | Scenario | Pass |
|----|----------|------|
| T24 | Make.com / funnel webhook with **Bearer** | ☐ |
| T25 | Stepped form merge | ☐ |

## Platform & email

| ID | Scenario | Pass |
|----|----------|------|
| T26 | Onboarding `/tilmelding` | ☐ |
| T27 | Invite / notify emails (Mailgun) | ☐ |
| T28 | Performance dashboard + ad spend API | ☐ |

## Integrator migration reminder

- Funnel URL: `POST …/api/webhooks/funnels/{id}` with header `Authorization: Bearer {webhook_secret}`.
- Vercel cron: `Authorization: Bearer {CRON_SECRET}`.
