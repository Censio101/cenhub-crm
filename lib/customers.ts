import {
  LEAD_SEGMENTS,
  MOCK_LEADS,
  type LeadPlatformId,
  type LeadSegmentId,
} from "./leads"
import { resolveServiceLabel, type NamedService } from "./performance/services"

export type CustomerSourceId =
  | Exclude<LeadPlatformId, "meta">
  | "facebook"
  | "instagram"
  | "referral"
  | "repeat"

export const CUSTOMER_SOURCES: { id: CustomerSourceId; label: string }[] = [
  { id: "facebook", label: "Facebook" },
  { id: "instagram", label: "Instagram" },
  { id: "website", label: "Hjemmeside" },
  { id: "landing", label: "Landing page" },
  { id: "referral", label: "Anbefaling" },
  { id: "repeat", label: "Genganger" },
]

export type Customer = {
  id: string
  closedDate: string
  fullName: string
  email: string
  phone: string
  segment: LeadSegmentId
  companyName: string
  address: string
  zipCode: string
  city: string
  serviceIds: string[]
  salesPrice: number
  profit: number
  source: CustomerSourceId
}

const EXTRA_CUSTOMERS: Customer[] = [
  {
    id: "customer-1",
    closedDate: "2025-09-16",
    fullName: "Birgitte Aagaard",
    email: "birgitte.aagaard@gmail.com",
    phone: "20 33 71 48",
    segment: "b2c",
    companyName: "",
    address: "Strandpromenaden 11",
    zipCode: "3000",
    city: "Helsingør",
    serviceIds: ["renovering"],
    salesPrice: 92000,
    profit: 71000,
    source: "referral",
  },
  {
    id: "customer-2",
    closedDate: "2025-08-21",
    fullName: "Frederik Storm",
    email: "fs@storm-bolig.dk",
    phone: "40 88 12 06",
    segment: "b2b",
    companyName: "Storm Bolig",
    address: "Kongevejen 88",
    zipCode: "3050",
    city: "Humlebæk",
    serviceIds: ["tilbygning", "tagdaekning"],
    salesPrice: 384000,
    profit: 276000,
    source: "landing",
  },
  {
    id: "customer-3",
    closedDate: "2025-07-09",
    fullName: "Pia Grønbæk",
    email: "pia.groenbaek@outlook.dk",
    phone: "28 51 09 73",
    segment: "b2c",
    companyName: "",
    address: "Møllebakken 4",
    zipCode: "3150",
    city: "Hellebæk",
    serviceIds: ["badevaerelse"],
    salesPrice: 79000,
    profit: 61000,
    source: "website",
  },
  {
    id: "customer-4",
    closedDate: "2025-06-18",
    fullName: "Niels Kofoed",
    email: "niels@kofoed-gaard.dk",
    phone: "51 20 44 87",
    segment: "b2b",
    companyName: "Kofoed Gaard",
    address: "Gadekærsvej 16",
    zipCode: "3230",
    city: "Græsted",
    serviceIds: ["nybyg"],
    salesPrice: 528000,
    profit: 397000,
    source: "facebook",
  },
  {
    id: "customer-5",
    closedDate: "2025-05-03",
    fullName: "Julie Vang",
    email: "julie.vang@icloud.com",
    phone: "61 14 28 55",
    segment: "b2c",
    companyName: "",
    address: "Parkalle 22",
    zipCode: "3480",
    city: "Fredensborg",
    serviceIds: ["renovering", "badevaerelse"],
    salesPrice: 148000,
    profit: 112000,
    source: "repeat",
  },
  {
    id: "customer-6",
    closedDate: "2025-04-14",
    fullName: "Søren Bille",
    email: "sb@bille-ejendomme.dk",
    phone: "30 66 91 20",
    segment: "b2b",
    companyName: "Bille Ejendomme",
    address: "Industrivej 27",
    zipCode: "3200",
    city: "Helsinge",
    serviceIds: ["tagdaekning"],
    salesPrice: 196000,
    profit: 143000,
    source: "landing",
  },
  {
    id: "customer-7",
    closedDate: "2025-03-27",
    fullName: "Emilie Holm",
    email: "emilie.holm@gmail.com",
    phone: "22 08 47 31",
    segment: "b2c",
    companyName: "",
    address: "Skovbrynet 8",
    zipCode: "3060",
    city: "Espergærde",
    serviceIds: ["tilbygning"],
    salesPrice: 241000,
    profit: 184000,
    source: "website",
  },
  {
    id: "customer-8",
    closedDate: "2025-02-11",
    fullName: "Carsten Munk",
    email: "carsten@munk-holding.dk",
    phone: "42 73 15 08",
    segment: "b2b",
    companyName: "Munk Holding",
    address: "Havnepladsen 2",
    zipCode: "3000",
    city: "Helsingør",
    serviceIds: ["renovering", "tilbygning"],
    salesPrice: 317000,
    profit: 229000,
    source: "referral",
  },
  {
    id: "customer-9",
    closedDate: "2025-01-23",
    fullName: "Thea Krarup",
    email: "thea.krarup@outlook.dk",
    phone: "26 41 80 19",
    segment: "b2c",
    companyName: "",
    address: "Fyrrevej 14",
    zipCode: "3070",
    city: "Snekkersten",
    serviceIds: ["tagdaekning"],
    salesPrice: 67000,
    profit: 51000,
    source: "instagram",
  },
  {
    id: "customer-10",
    closedDate: "2024-11-29",
    fullName: "Henning Lassen",
    email: "henning@lassen-byg.dk",
    phone: "40 19 62 74",
    segment: "b2b",
    companyName: "Lassen Byg",
    address: "Stationsvej 9",
    zipCode: "3490",
    city: "Kvistgård",
    serviceIds: ["nybyg", "tagdaekning"],
    salesPrice: 476000,
    profit: 352000,
    source: "landing",
  },
  {
    id: "customer-11",
    closedDate: "2024-10-08",
    fullName: "Amalie Frost",
    email: "amalie.frost@gmail.com",
    phone: "23 55 10 86",
    segment: "b2c",
    companyName: "",
    address: "Klostervej 3",
    zipCode: "3100",
    city: "Hornbæk",
    serviceIds: ["badevaerelse"],
    salesPrice: 54000,
    profit: 41000,
    source: "website",
  },
  {
    id: "customer-12",
    closedDate: "2024-08-19",
    fullName: "Torben Skov",
    email: "torben@skov-udlejning.dk",
    phone: "31 08 44 52",
    segment: "b2b",
    companyName: "Skov Udlejning",
    address: "Hovedgaden 72",
    zipCode: "2980",
    city: "Kokkedal",
    serviceIds: ["renovering"],
    salesPrice: 163000,
    profit: 119000,
    source: "repeat",
  },
]

let metaSourceToggle = 0

function sourceFromLeadPlatform(
  platform: LeadPlatformId | ""
): CustomerSourceId {
  if (platform === "website" || platform === "landing") return platform
  if (platform === "meta") {
    metaSourceToggle += 1
    return metaSourceToggle % 2 === 0 ? "instagram" : "facebook"
  }
  return "website"
}

function customerFromWonLead(
  lead: (typeof MOCK_LEADS)[number],
  index: number
): Customer | null {
  if (lead.status !== "won" || lead.salesPrice == null) return null
  return {
    id: `customer-lead-${index + 1}`,
    closedDate: lead.date,
    fullName: lead.fullName,
    email: lead.email,
    phone: lead.phone,
    segment: lead.segment === "b2b" ? "b2b" : "b2c",
    companyName: lead.companyName,
    address: lead.address,
    zipCode: lead.zipCode,
    city: lead.city,
    serviceIds: lead.serviceIds.filter((id) => typeof id === "string" && id.length > 0),
    salesPrice: lead.salesPrice,
    profit: lead.profit ?? Math.round(lead.salesPrice * 0.74),
    source: sourceFromLeadPlatform(lead.platform),
  }
}

export const MOCK_CUSTOMERS: Customer[] = [
  ...MOCK_LEADS.map(customerFromWonLead).filter(
    (customer): customer is Customer => customer != null
  ),
  ...EXTRA_CUSTOMERS,
].sort((left, right) => right.closedDate.localeCompare(left.closedDate))

export function formatCustomerServices(
  customer: Customer,
  extras: readonly NamedService[] = []
): string {
  return customer.serviceIds
    .map((id) => resolveServiceLabel(id, extras))
    .join(", ")
}

export function getCustomerSourceLabel(id: CustomerSourceId): string {
  return CUSTOMER_SOURCES.find((item) => item.id === id)?.label ?? id
}

export function getCustomerSegmentLabel(id: LeadSegmentId): string {
  return LEAD_SEGMENTS.find((item) => item.id === id)?.label ?? id
}

export function sortCustomersByDate(
  customers: readonly Customer[],
  direction: "asc" | "desc"
): Customer[] {
  return [...customers].sort((left, right) => {
    const cmp = left.closedDate.localeCompare(right.closedDate)
    return direction === "asc" ? cmp : -cmp
  })
}

export function customerMonthKey(date: string): string {
  return date.slice(0, 7)
}

export function sumCustomerValue(customers: readonly Customer[]): {
  count: number
  sales: number
  profit: number
} {
  return customers.reduce(
    (acc, customer) => ({
      count: acc.count + 1,
      sales: acc.sales + customer.salesPrice,
      profit: acc.profit + customer.profit,
    }),
    { count: 0, sales: 0, profit: 0 }
  )
}
