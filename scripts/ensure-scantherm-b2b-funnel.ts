/**
 * Ensures ScanTherm ApS has a B2B webhook funnel (Quick-Heat Trailer preset).
 * Run: npx tsx scripts/ensure-scantherm-b2b-funnel.ts
 */
import { readFileSync } from "node:fs";
import { resolve } from "node:path";

function loadEnvLocal() {
  try {
    const content = readFileSync(resolve(process.cwd(), ".env.local"), "utf8");
    for (const line of content.split("\n")) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) continue;
      const separator = trimmed.indexOf("=");
      if (separator === -1) continue;
      const key = trimmed.slice(0, separator);
      const value = trimmed.slice(separator + 1);
      if (!process.env[key]) process.env[key] = value;
    }
  } catch {
    // optional
  }
}

loadEnvLocal();

import { createLeadFunnel, listLeadFunnelsForOrganization } from "@/lib/db/lead-funnels-repository";
import { getOrganizationBySlug } from "@/lib/db/organizations-repository";
import { leadFunnelCreateOptionsForAudience } from "@/lib/funnels/b2b-lead-funnel-preset";
import { createAdminClient } from "@/lib/supabase/admin";

const ORG_SLUG = "scantherm-aps";
const FUNNEL_SLUG = "quick-heat-trailer-b2b";

async function main() {
  const admin = createAdminClient();
  const org = await getOrganizationBySlug(admin, ORG_SLUG);
  if (!org) {
    console.error(`Organization not found: ${ORG_SLUG}`);
    process.exit(1);
  }

  const existing = (await listLeadFunnelsForOrganization(admin, org.id)).find(
    (f) => f.slug === FUNNEL_SLUG
  );

  const funnel =
    existing ??
    (await createLeadFunnel(admin, {
      organizationId: org.id,
      name: "Quick-Heat Trailer (B2B)",
      slug: FUNNEL_SLUG,
      platform: "website",
      enabled: true,
      ...leadFunnelCreateOptionsForAudience("b2b"),
    }));

  const base = process.env.CRM_PUBLIC_URL?.replace(/\/$/, "") ?? "https://www.cenhub.dk";
  console.log(
    JSON.stringify(
      {
        organizationSlug: ORG_SLUG,
        funnelId: funnel.id,
        funnelName: funnel.name,
        webhookUrl: `${base}/api/webhooks/funnels/${funnel.id}`,
        webhookSecret: funnel.webhook_secret,
        vercelEnv: {
          CRM_WEBHOOK_URL: `${base}/api/webhooks/funnels/${funnel.id}`,
          CRM_WEBHOOK_TOKEN: funnel.webhook_secret,
        },
      },
      null,
      2
    )
  );
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
