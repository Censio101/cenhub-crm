/** Gældende handelsbetingelser (censio.dk/handelsbetingelser), vist i fuld på tilbudssiden. */

export type HandelsSection = {
  id: string
  title: string
  blocks: string[]
  bullets?: string[]
}

export const HANDELSBETINGELSER_INTRO =
  "Forretningsbetingelserne er gældende ved enhver aftale mellem Censio og kunden. Ved modstrid mellem dette tilbud og de generelle handelsbetingelser gælder det, der står i tilbuddets kontraktvilkår ovenfor."

export const HANDELSBETINGELSER_SECTIONS: HandelsSection[] = [
  {
    id: "1",
    title: "1. Generelt",
    blocks: [
      "Censio er et web- og marketingsbureau. Censio udvikler hjemmesider, webshops og andre webløsninger, bistår kunden efterfølgende bl.a. med hosting og support af webløsningen samt online markedsføring på bl.a. Google Ads.",
    ],
  },
  {
    id: "2",
    title: "2. Aftalegrundlaget",
    blocks: [
      "Betingelserne udgør sammen med Censios tilbudsmateriale, inkl. mailkorrespondance og ordrebekræftelser, det samlede aftalegrundlag for Censios salg og levering af serviceydelser til kunden.",
      "Kundens køb af en service kan ske ved både skriftlig og mundtlig accept af Censios tilbud. Kundens angivelse af særlige vilkår i e-mails mv. anses ikke som en fravigelse af betingelserne, medmindre Censio udtrykkeligt og skriftligt har accepteret disse.",
    ],
  },
  {
    id: "3-1",
    title: "3.1 Hjemmeside og webshop",
    blocks: [
      "Censio tilbyder en webløsning udviklet i WordPress, tilpasset kundens behov. Efter implementering har kunden frihed til at redigere, vedligeholde og videreudvikle løsningen.",
      "Efter dialog modtager kunden en fast pris i tilbudsmaterialet/ordrebekræftelsen. Prisen baseres på vurdering af tid og omfang, herunder antal undersider. Der opkræves ikke yderligere uden forudgående aftale.",
      "Specifikke funktioner uden for standard eller udvidelser undervejs øger omfanget og kan tilkøbes på timebasis.",
      "Design tilpasses i dialog med designer, indtil kunden er tilfreds. Væsentlige afvigelser fra aftalt design kræver ekstra timer.",
      "Webløsningen er funktionel på almindelige enheder (ca. 2 år eller nyere) og seneste browserversioner.",
      "En webløsningsopgave forventes at tage op til 60 dage fra accept.",
      "Betaling opdeles i 2 rater: 1. rate ved opgavens start og 2. rate ved overdragelse eller efter 60 dage. Aftalte abonnementer (fx hosting) forfalder samtidig med 2. rate. Manglende betaling af 1. rate medfører, at 2. rate og abonnementer forfalder straks.",
      "Overdragelse sker når opgaven afsluttes og løsningen er online, ved test-domæne når Censios arbejde er udført, eller hvis Censio vurderer, at kunden ikke ønsker at fuldføre.",
    ],
  },
  {
    id: "3-2",
    title: "3.2 Hosting og support",
    blocks: [
      "Hosting & Support er et abonnement med hosting og løbende opdateringer, overvågning og support via telefon og mail (tekst og billeder efter rimelighed). Specifikke opgaver udført af Censio faktureres separat.",
      "Hosting har specificerede ressourcer (plads, trafik, CPU) med mulighed for opgradering.",
      "Censio kan ikke holdes ansvarlig for nedetid hos serverleverandør og garanterer ikke specifik oppetid.",
      "Censio kan pause hosting ved skadelig adfærd (spam, højt ressourceforbrug, usikker software).",
      "Supportpakke opdaterer typisk månedligt, medmindre kompatibilitetsproblemer.",
      "Det primære ansvar for webløsningen ligger hos kunden; rettelser af kundens/tredjemands fejl kan faktureres separat.",
    ],
  },
  {
    id: "3-3",
    title: "3.3 Markedsføring",
    blocks: [
      "Online markedsføring er et abonnement med løbende optimering via bl.a. Google Ads, SEO og sociale medier. Censio kan være databehandler, se pkt. 10.",
      "Fast månedlig pris baseret på estimeret timeforbrug, med løbende strategi, optimering og rapportering. Udvidet omfang kan medføre opgradering af aftalen.",
      "Succes kræver kundens input; Censio kan ikke garantere specifikke resultater.",
    ],
  },
  {
    id: "3-4",
    title: "3.4 Enkeltstående services og klippekort",
    blocks: [
      "Enkeltstående opgaver (grafik, udvikling, tekst mv.) på timebasis eller klippekort.",
      "Klippekort faktureres ved køb og er gyldigt i 2 år, medmindre andet aftales.",
    ],
  },
  {
    id: "4",
    title: "4. Priser, fakturering og betaling",
    blocks: [
      "Priser fremgår af tilbudsmaterialet. Alle priser er i DKK ekskl. moms. Censio kan justere priser med varsel, herunder årligt for abonnementer.",
      "Faktura udstedes med 8 dages betalingsfrist.",
      "Webløsning betales i to lige store rater (start og overdragelse/60 dage). Abonnementer forfalder med 2. rate. Udebleven 1. rate medfører straksforfald for 2. rate og abonnementer.",
      "Enkeltopgaver faktureres ved start eller ved klippekortkøb.",
      "Hosting & Support og domæne forudbetales efter tilbud. Online markedsføring kan forudbetales eller i rater med automatisk betaling.",
      "Arbejde igangsættes først ved modtaget betaling. Ved manglende betaling kan ydelser tilbageholdes, hosting sættes på hold, og udestående faktureres.",
      "Ved for sen betaling: rykkergebyr kr. 100, kompensationsgebyr kr. 310 pr. rykker, rente 2 % pr. påbegyndt måned, derefter inkasso.",
    ],
  },
  {
    id: "5",
    title: "5. Bindingsperiode og opsigelse (generelle betingelser)",
    blocks: [
      "For dette tilbud gælder særskilt opsigelse uden binding (løbende måned + 30 dage) som angivet i kontrakten ovenfor. Nedenfor gælder Censios generelle betingelser, hvor tilbudsmateriale kan fravige.",
      "For abonnementsydelser gælder typisk følgende bindingsperioder, medmindre andet står i tilbudsmaterialet:",
    ],
    bullets: [
      "Markedsføring: 6 måneders binding ad gangen",
      "Hosting & Support: 12 måneders binding ad gangen",
      "Internetdomæne: 12 måneders binding ad gangen",
    ],
  },
  {
    id: "5-cont",
    title: "5. Opsigelse (fortsat)",
    blocks: [
      "Abonnement kan opsiges skriftligt med løbende måned + 1 måned før ny bindingsperiodes fornyelse. Opsigelse inden udløb giver ingen tilbagebetaling af forudbetalt periode.",
      "Opgradering under bindingsperiode starter bindingsperiode forfra.",
      "Opsigelse skal ske skriftligt til kontakt@censio.dk med oplysninger, der identificerer kunden og hvilke services der opsiges.",
    ],
  },
  {
    id: "6",
    title: "6. Kundens rettigheder og forpligtelser",
    blocks: [
      "Kunden skal levere materialer og oplysninger rettidigt. Censio gennemgår ikke automatisk stavekontrol eller billedkomprimering, hjælp hertil er ekstra arbejde.",
      "Reklamationsret 30 dage efter overdragelse af webløsning. Senere reklamationer og selvforskyldte fejl faktureres særskilt.",
    ],
  },
  {
    id: "7",
    title: "7. Ophavsret",
    blocks: [
      "Ophavsret til overdraget webløsning tilfalder Censio; Censio må genbruge komponenter. Efter overdragelse får kunden brugsret til øvrige immaterielle rettigheder og elementer.",
      "Kunden garanterer, at leveret materiale ikke krænker tredjeparts rettigheder.",
    ],
  },
  {
    id: "8",
    title: "8. Fortrolighed",
    blocks: [
      "Censio bevarer fortrolighed om kundens forretningsoplysninger.",
      "Censio må bruge kundens navn, resultater og webløsning som reference i markedsføring.",
    ],
  },
  {
    id: "9",
    title: "9. Censios ansvar",
    blocks: [
      "Levering sker til aftalt tid, når kunden overholder aftalen. Force majeure m.v. forbeholdes.",
      "Ansvar efter dansk ret med aftalte begrænsninger. Intet ansvar for indirekte tab (driftstab, datatab, goodwill mv.).",
      "Erstatning kan højst svare til projektets samlede pris eller betalinger for seneste 6 måneders abonnement.",
      "Censio er bl.a. ikke ansvarlig for hosting-nedetid, SEO-placeringsfald ved ny site, generel juridisk vejledning, eller forhold uden for Censios kontrol.",
      "Kan et projekt ikke gennemføres, kan Censio annullere helt eller delvist mod tilbagebetaling.",
    ],
  },
  {
    id: "10",
    title: "10. GDPR",
    blocks: [
      "Personoplysninger behandles sikkert efter gældende ret. Kunden accepterer databehandleraftale ved relevante services.",
      "Ved WP-webløsning er kunden typisk dataansvarlig; ved hosting/marketing kan Censio være databehandler.",
      "Ansvarsbegrænsning i pkt. 9 gælder også for persondatasikkerhed.",
      "Se cookie- og privatlivspolitik på censio.dk.",
    ],
  },
  {
    id: "11",
    title: "11. Ændringer",
    blocks: [
      "Censio kan ændre betingelser ved markedsændringer. Kunden informeres og kan opsige inden 20 dage før nye betingelser træder i kraft.",
    ],
  },
  {
    id: "12",
    title: "12. Tvister og værneting",
    blocks: ["Tvister afgøres efter dansk ret med værneting i Aarhus Byret."],
  },
  {
    id: "13",
    title: "13. Andre bestemmelser",
    blocks: [
      "Censio tager forbehold for tastefejl i materiale og betingelser.",
      "Betingelserne er gældende fra 1. december 2023.",
    ],
  },
]

export const CENSIO_COMPANY_FOOTER = {
  name: "Censio Marketing ApS",
  cvr: "46481194",
  phone: "30 33 33 10",
  email: "kontakt@censio.dk",
  hours: "09:00–16:00",
  address: "Nørregade 49-51, 7500 Holstebro",
} as const
