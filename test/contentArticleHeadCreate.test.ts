import { expect, test } from "bun:test"
import type { ContentEntry } from "@adaptive-ds/website-content-pipeline"
import type { ContentFaqItem } from "../src/app/content/ContentFaqItem.ts"
import type { ContentListItem } from "../src/app/content/ContentListItem.ts"
import type { ContentMeta } from "../src/app/content/ContentMeta.ts"
import { contentArticleHeadCreate } from "../src/seo/contentArticleHeadCreate.ts"
import type { SeoHead } from "../src/seo/SeoHead.ts"

const today = "2026-11-07"

function entryCreate(overrides: Partial<ContentEntry> = {}): ContentEntry {
  return {
    id: "2026-11-06-fake-tickets-erkennen",
    slug: "fake-tickets-erkennen",
    path: "/ratgeber/fake-tickets-erkennen",
    contentPath: "/ratgeber/2026-11-06-fake-tickets-erkennen.md",
    // Existing catalog image (1920x1080) so dimensions come from the real assets catalog.
    image: "concert-crowd",
    imagePath: null,
    title: "Fake-Tickets erkennen: So kaufst du Tickets sicher",
    description: "Woran du gefälschte Tickets erkennst und wo du sicher kaufst.",
    publishedAt: "2026-11-06",
    updatedAt: null,
    author: null,
    imageAlt: "Menschenmenge vor einer Konzertbühne",
    ...overrides,
  }
}

function metaCreate(overrides: Partial<ContentMeta> = {}): ContentMeta {
  return {
    collection: "ratgeber",
    lang: "de",
    category: "ticketkaeufer",
    keywords: ["fake tickets erkennen", "tickets sicher kaufen"],
    translationKey: "fake-tickets",
    seoTitle: null,
    readingMinutes: 9,
    wordCount: 1900,
    ...overrides,
  }
}

const englishCounterpart: ContentListItem = {
  entry: entryCreate({
    id: "2026-11-06-fake-tickets",
    slug: "fake-tickets",
    path: "/en/guides/fake-tickets",
    title: "Fake Tickets: How to Spot Them and Buy Safely",
  }),
  meta: metaCreate({ collection: "guides", lang: "en", category: "for-ticket-buyers" }),
}

const germanCounterpart: ContentListItem = { entry: entryCreate(), meta: metaCreate() }

const faq: ContentFaqItem[] = [
  {
    question: "Ist ein Screenshot vom Ticket gültig?",
    answerHtml: "<p>Ja, wenn der <strong>QR-Code</strong> lesbar ist.</p>",
    answerText: "Ja, wenn der QR-Code lesbar ist.",
  },
]

const noTranslation = () => undefined

function metaRead(head: SeoHead, key: string): string | undefined {
  const tag = head.meta.find(
    (candidate) =>
      ("property" in candidate && candidate.property === key) || ("name" in candidate && candidate.name === key),
  )
  return tag !== undefined && "content" in tag ? tag.content : undefined
}

function titleRead(head: SeoHead): string | undefined {
  const tag = head.meta.find((candidate) => "title" in candidate)
  return tag !== undefined && "title" in tag ? tag.title : undefined
}

function crumbNamesRead(breadcrumb: Record<string, unknown> | undefined): string[] {
  const items = (breadcrumb?.["itemListElement"] ?? []) as { name: string }[]
  return items.map((crumb) => crumb.name)
}

function graphRead(head: SeoHead): Record<string, unknown>[] {
  expect(head.scripts).toHaveLength(1)
  const root = JSON.parse(head.scripts[0]?.children ?? "") as {
    "@context": string
    "@graph": Record<string, unknown>[]
  }
  expect(root["@context"]).toBe("https://schema.org")
  return root["@graph"]
}

function hreflangRead(head: SeoHead): Record<string, string> {
  return Object.fromEntries(
    head.links.filter((link) => link.hreflang !== undefined).map((link) => [link.hreflang, link.href]),
  )
}

test("German article uses the seoTitle with the brand suffix, its canonical URL and index robots when published", () => {
  const head = contentArticleHeadCreate(
    { entry: entryCreate(), meta: metaCreate({ seoTitle: "Fake-Tickets erkennen" }), faq: [] },
    { today, translationFind: noTranslation },
  )
  expect(titleRead(head)).toBe("Fake-Tickets erkennen | Eventoren")
  expect(head.links[0]).toEqual({ rel: "canonical", href: "https://eventoren.de/ratgeber/fake-tickets-erkennen" })
  expect(metaRead(head, "og:url")).toBe("https://eventoren.de/ratgeber/fake-tickets-erkennen")
  expect(metaRead(head, "robots")).toBe("index, follow")
  expect(metaRead(head, "og:locale")).toBe("de_DE")
  expect(metaRead(head, "article:section")).toBe("Für Ticketkäufer")
  expect(metaRead(head, "article:published_time")).toBe("2026-11-06T00:00:00+01:00")
})

test("article without seoTitle falls back to the article title", () => {
  const head = contentArticleHeadCreate(
    { entry: entryCreate(), meta: metaCreate(), faq: [] },
    { today, translationFind: noTranslation },
  )
  expect(titleRead(head)).toBe("Fake-Tickets erkennen: So kaufst du Tickets sicher | Eventoren")
})

test("article dated in the future is noindex", () => {
  const head = contentArticleHeadCreate(
    { entry: entryCreate({ publishedAt: "2026-12-01" }), meta: metaCreate(), faq: [] },
    { today, translationFind: noTranslation },
  )
  expect(metaRead(head, "robots")).toBe("noindex, nofollow")
})

test("og:image and the Article image carry the real catalog dimensions of the hero image", () => {
  const head = contentArticleHeadCreate(
    { entry: entryCreate(), meta: metaCreate(), faq: [] },
    { today, translationFind: noTranslation },
  )
  expect(metaRead(head, "og:image")).toStartWith("https://assets.eventoren.de/")
  expect(metaRead(head, "og:image:width")).toBe("1920")
  expect(metaRead(head, "og:image:height")).toBe("1080")
  expect(metaRead(head, "og:image:alt")).toBe("Menschenmenge vor einer Konzertbühne")
  const article = graphRead(head).find((node) => node["@type"] === "Article")
  expect(article?.["image"]).toMatchObject({ "@type": "ImageObject", width: 1920, height: 1080 })
})

test("article without a resolvable image falls back to the 1200x630 default OG image", () => {
  const head = contentArticleHeadCreate(
    { entry: entryCreate({ image: "does-not-exist" }), meta: metaCreate(), faq: [] },
    { today, translationFind: noTranslation },
  )
  expect(metaRead(head, "og:image")).toContain("eventoren-og")
  expect(metaRead(head, "og:image:width")).toBe("1200")
  expect(metaRead(head, "og:image:height")).toBe("630")
})

test("article with a translation emits reciprocal de, en and x-default hreflang links", () => {
  const germanHead = contentArticleHeadCreate(
    { entry: entryCreate(), meta: metaCreate(), faq: [] },
    { today, translationFind: () => englishCounterpart },
  )
  const englishHead = contentArticleHeadCreate(
    { entry: englishCounterpart.entry, meta: englishCounterpart.meta, faq: [] },
    { today, translationFind: () => germanCounterpart },
  )
  const expected = {
    de: "https://eventoren.de/ratgeber/fake-tickets-erkennen",
    en: "https://eventoren.de/en/guides/fake-tickets",
    "x-default": "https://eventoren.de/ratgeber/fake-tickets-erkennen",
  }
  expect(hreflangRead(germanHead)).toEqual(expected)
  expect(hreflangRead(englishHead)).toEqual(expected)
})

test("article without a translation emits no hreflang links", () => {
  const head = contentArticleHeadCreate(
    { entry: entryCreate(), meta: metaCreate({ translationKey: null }), faq: [] },
    { today, translationFind: () => englishCounterpart },
  )
  expect(head.links).toEqual([{ rel: "canonical", href: "https://eventoren.de/ratgeber/fake-tickets-erkennen" }])
})

test("German JSON-LD graph has Article, publisher Organization and Startseite → Ratgeber → title breadcrumb", () => {
  const head = contentArticleHeadCreate(
    { entry: entryCreate(), meta: metaCreate(), faq: [] },
    { today, translationFind: noTranslation },
  )
  const graph = graphRead(head)
  expect(graph.map((node) => node["@type"])).toEqual(["Article", "Organization", "BreadcrumbList"])
  expect(graph[0]).toMatchObject({
    headline: "Fake-Tickets erkennen: So kaufst du Tickets sicher",
    inLanguage: "de-DE",
    author: { "@type": "Organization", name: "Eventoren Redaktion", url: "https://eventoren.de" },
    publisher: { "@id": "https://eventoren.de/#organization" },
    isPartOf: { "@id": "https://eventoren.de/ratgeber#webpage" },
    articleSection: "Für Ticketkäufer",
    wordCount: 1900,
  })
  expect(graph[1]).toMatchObject({ "@id": "https://eventoren.de/#organization", name: "Eventoren" })
  const crumbs = crumbNamesRead(graph[2])
  expect(crumbs).toEqual(["Startseite", "Ratgeber", "Fake-Tickets erkennen: So kaufst du Tickets sicher"])
})

test("English article uses en_GB, en-GB, the editorial team author and Eventoren → Guides breadcrumb", () => {
  const head = contentArticleHeadCreate(
    { entry: englishCounterpart.entry, meta: englishCounterpart.meta, faq: [] },
    { today, translationFind: noTranslation },
  )
  expect(metaRead(head, "og:locale")).toBe("en_GB")
  expect(metaRead(head, "article:section")).toBe("For ticket buyers")
  const graph = graphRead(head)
  expect(graph[0]).toMatchObject({ inLanguage: "en-GB", author: { name: "Eventoren Editorial Team" } })
  const crumbs = crumbNamesRead(graph[2])
  expect(crumbs).toEqual(["Eventoren", "Guides", "Fake Tickets: How to Spot Them and Buy Safely"])
})

test("FAQPage is added only when the article has FAQ entries, with plain-text answers", () => {
  const withoutFaq = contentArticleHeadCreate(
    { entry: entryCreate(), meta: metaCreate(), faq: [] },
    { today, translationFind: noTranslation },
  )
  expect(graphRead(withoutFaq).some((node) => node["@type"] === "FAQPage")).toBe(false)

  const withFaq = contentArticleHeadCreate(
    { entry: entryCreate(), meta: metaCreate(), faq },
    { today, translationFind: noTranslation },
  )
  const faqPage = graphRead(withFaq).find((node) => node["@type"] === "FAQPage")
  expect(faqPage?.["mainEntity"]).toEqual([
    {
      "@type": "Question",
      name: "Ist ein Screenshot vom Ticket gültig?",
      acceptedAnswer: { "@type": "Answer", text: "Ja, wenn der QR-Code lesbar ist." },
    },
  ])
})

test("JSON-LD cannot close its script tag when content contains </script>", () => {
  const head = contentArticleHeadCreate(
    { entry: entryCreate({ title: "Evil </script><script>alert(1)</script>" }), meta: metaCreate(), faq: [] },
    { today, translationFind: noTranslation },
  )
  const json = head.scripts[0]?.children ?? ""
  expect(json).not.toContain("</script>")
  expect(json).not.toContain("<")
  expect(graphRead(head)[0]?.["headline"]).toBe("Evil </script><script>alert(1)</script>")
})
