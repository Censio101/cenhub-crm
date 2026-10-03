import { enrichOfferCvr } from "@/lib/internal/offer-admin"
import { resolveOfferModules } from "@/lib/internal/offer-modules"
import { packageById, visiblePackages } from "@/lib/internal/offer-packages"
import { jsonError } from "@/lib/onboarding/auth"
import { getStore } from "@/lib/onboarding/store"

export async function GET(
  _request: Request,
  context: { params: Promise<{ slug: string }> }
) {
  try {
    const { slug } = await context.params
    const data = await getStore().read()
    const raw = (data.offers ?? []).find((item) => item.slug === slug)
    if (!raw) {
      return Response.json({ error: "Tilbuddet findes ikke." }, { status: 404 })
    }
    const offer = enrichOfferCvr(raw, data.customerContacts ?? [])
    const packageIds = visiblePackages(offer.packages, offer.publicPackageView)
    const packages = packageIds.map((id) => packageById(id))
    const services = offer.services ?? []
    const modules = resolveOfferModules({
      packages: offer.packages,
      services,
    })
    return Response.json({
      offer: {
        slug: offer.slug,
        companyName: offer.companyName,
        cvr: offer.cvr,
        contactName: offer.contactName,
        status: offer.status,
        acceptedAt: offer.acceptedAt,
        signatureName: offer.signatureName,
        publicPackageView: offer.publicPackageView,
        services,
        modules,
        createdAt: offer.createdAt,
        packages,
      },
    })
  } catch (error) {
    return jsonError(error)
  }
}
