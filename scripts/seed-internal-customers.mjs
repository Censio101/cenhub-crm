import { readFileSync, writeFileSync } from "node:fs"

const storePath = new URL("../.data/cenhub-store.json", import.meta.url)
const data = JSON.parse(readFileSync(storePath, "utf8"))

const names = [
  "Aarhus Tag & Facade",
  "Bakken VVS",
  "Bredgade El",
  "Ceres Gulve",
  "Dalby Murer",
  "Egelund Tømrer",
  "Fjordens Maler",
  "Grønnegade Køkken",
  "Havnens Smedie",
  "Iris Badeværelser",
  "Jyllands Tagdækning",
  "Klinten Nybyg",
  "Lundtofte Renovering",
  "Møllevej Gulv",
  "Nørrebro El-Service",
  "Odder VVS",
  "Pilegården Tømrer",
  "Qvist Facader",
  "Ribe Mur & Flise",
  "Skovlund Maler",
  "Thyholm Tag",
  "Ulfborg Smed",
  "Vesterbro Køkken",
  "Aaby El",
  "Balle Badeværelse",
  "Christiansfeld Gulve",
  "Djursland Tømrer",
  "Esbjerg Facade",
  "Fredericia VVS",
  "Grenaa Maler",
  "Horsens Nybyg",
  "Ikast Tag",
  "Juelsminde Smedie",
  "Kalundborg Fliser",
  "Lemvig Renovering",
  "Middelfart El",
  "Næstved Gulv",
  "Odense Køkken",
  "Padborg Mur",
  "Ringkøbing Tag",
  "Silkeborg VVS",
  "Thisted Maler",
  "Varde Tømrer",
  "Aalborg Smed",
  "Billund Badeværelse",
  "Faaborg Facade",
  "Haderslev El",
  "Kolding Gulve",
  "Nyborg Tag",
  "Randers VVS",
  "Skagen Tømrer",
  "Svendborg Maler",
  "Vejle Mur",
  "Holstebro Køkken",
  "Herning Nybyg",
  "Roskilde Fliser",
  "Helsingør Smedie",
  "Køge Renovering",
]

const products = [
  { category: "marketing", name: "Marketing Meta ads", amount: 6900 },
  { category: "marketing", name: "Google ads", amount: 4900 },
  { category: "marketing", name: "Video marketing pakke", amount: 3900 },
  { category: "seo", name: "SEO", amount: 3500 },
  { category: "geo", name: "GEO", amount: 2500 },
  { category: "website", name: "Hjemmeside hosting", amount: 499 },
  { category: "hosting", name: "Webshop hosting", amount: 899 },
  { category: "support", name: "Support pakke", amount: 1990 },
]

data.workspaces = data.workspaces.filter((workspace) => !workspace.id.startsWith("ws-intern-"))
data.commercialLines = (data.commercialLines ?? []).filter(
  (line) => !line.workspaceId.startsWith("ws-intern-")
)
data.customerContacts = (data.customerContacts ?? []).filter(
  (contact) => !contact.workspaceId.startsWith("ws-intern-")
)

function demoPhone(index) {
  const suffix = String(10000000 + ((index * 7919) % 90000000)).slice(0, 8)
  return `${suffix.slice(0, 2)} ${suffix.slice(2, 4)} ${suffix.slice(4, 6)} ${suffix.slice(6, 8)}`
}

names.forEach((name, index) => {
  const id = `ws-intern-${String(index + 1).padStart(2, "0")}`
  const monthIndex = index % 21
  const year = 2025 + Math.floor(monthIndex / 12)
  const month = (monthIndex % 12) + 1
  const startsOn = `${year}-${String(month).padStart(2, "0")}-01`
  const slug = name
    .toLowerCase()
    .replaceAll("æ", "ae")
    .replaceAll("ø", "oe")
    .replaceAll("å", "aa")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")

  data.customerContacts.push({
    workspaceId: id,
    phone: demoPhone(index + 1),
    subEmail: "",
    contactName: name,
    cvr: String(10000000 + index).slice(0, 8),
  })

  data.workspaces.push({
    id,
    name,
    email: `kontakt@${slug}.example`,
    logo: "",
    profileImage: "",
    enabledServiceIds: [],
    customServices: [],
    hvidbjergPartner: index % 4 === 0,
    status: "active",
    useDemoData: false,
    createdAt: `${startsOn}T08:00:00.000Z`,
    provisionedAt: `${startsOn}T08:00:00.000Z`,
  })

  const bundles = [
    ["Marketing Meta ads", "Google ads", "Hjemmeside hosting"],
    ["Marketing Meta ads", "Video marketing pakke", "Support pakke"],
    ["Google ads", "Hjemmeside hosting", "Hosting", "Support pakke"],
    ["Marketing Meta ads", "Google ads", "Video marketing pakke"],
    ["Video marketing pakke", "Hjemmeside hosting", "Support pakke"],
    ["Marketing Meta ads", "Hosting", "Support pakke"],
    ["Google ads", "Video marketing pakke", "Hjemmeside hosting"],
    ["Marketing Meta ads", "Google ads", "Video marketing pakke", "Hosting", "Support pakke"],
  ]
  const bought = new Set(bundles[index % bundles.length])
  products.forEach((product, productIndex) => {
    const name = product.name === "Webshop hosting" ? "Hosting" : product.name
    if (!bought.has(name) && !(product.name === "Webshop hosting" && bought.has("Hosting"))) return
    const amount = product.amount + (index % 5) * 200 + productIndex * 50
    data.commercialLines.push({
      id: `line-intern-${String(index + 1).padStart(2, "0")}-${productIndex + 1}`,
      workspaceId: id,
      category: name === "Hosting" ? "hosting" : product.category,
      name,
      amount,
      cadence: "monthly",
      startsOn,
      endsOn: null,
    })
  })
})

writeFileSync(storePath, JSON.stringify(data, null, 2))
console.log(`workspaces ${data.workspaces.length}, lines ${data.commercialLines.length}`)
