import { type Token, type Tokens, walkTokens } from "marked"
import type { ContentIssue } from "./ContentIssue.ts"
import type { ContentLinkTargets } from "./ContentLinkTargets.ts"
import { contentCollectionConfig } from "./contentCollectionConfig.ts"
import type { ContentCollection } from "./contentCollectionSchema.ts"
import { contentFaqExtract } from "./contentFaqExtract.ts"
import { contentLinkCheck } from "./contentLinkCheck.ts"
import { contentMarkdownLex } from "./contentMarkdownLex.ts"
import { contentTokenTextRead } from "./contentTokenTextRead.ts"
import { contentWordCount } from "./contentWordCount.ts"

/** Validate an article body (frontmatter removed) against the plan's body rules. */
export function contentBodyCheck(
  body: string,
  options: {
    readonly collection: ContentCollection
    readonly category: string
    readonly linkTargets: ContentLinkTargets
  },
): ContentIssue[] {
  const config = contentCollectionConfig[options.collection]
  const issues: ContentIssue[] = []
  const error = (message: string) => issues.push({ level: "error", message })
  const warning = (message: string) => issues.push({ level: "warning", message })
  const tokens = contentMarkdownLex(body)
  const sections = sectionsRead(tokens)

  if (tokens.some((token) => token.type === "heading" && token.depth === 1))
    error("body: contains an H1 (# ); use ## and ###")
  if (sections.length < 5) error(`body: ${sections.length} ## sections, min 5`)
  else if (sections.length < 6 || sections.length > 12) warning(`body: ${sections.length} ## sections, target 6–12`)

  const takeaways = tokens.find(
    (token): token is Tokens.Blockquote =>
      token.type === "blockquote" && contentTokenTextRead(token.tokens).startsWith(config.takeawaysLabel),
  )
  if (takeaways === undefined) error(`body: missing the "> **${config.takeawaysLabel}**" blockquote`)
  else {
    const bullets = takeaways.tokens.find((token): token is Tokens.List => token.type === "list")?.items.length ?? 0
    if (bullets < 4 || bullets > 6) warning(`body: key-takeaways box has ${bullets} bullets, target 4–6`)
  }

  const faqSection = sections.find((section) => section.title === config.faqHeading)
  const faqCount = contentFaqExtract(tokens).length
  if (faqSection === undefined) error(`body: missing "## ${config.faqHeading}"`)
  else if (faqCount < 4) error(`body: FAQ has ${faqCount} questions with answers, min 4`)
  else if (faqCount > 6) warning(`body: FAQ has ${faqCount} questions, target 4–6`)

  const sourcesSection = sections.find((section) => section.title === config.sourcesHeading)
  const sourceLinks = new Set(linksRead(sourcesSection?.tokens ?? []).filter((href) => href.startsWith("https://")))
  if (sourcesSection === undefined) error(`body: missing "## ${config.sourcesHeading}"`)
  else if (sourceLinks.size < 3) error(`body: sources section has ${sourceLinks.size} https links, min 3`)

  const buyer = options.category === config.buyerCategory
  const eventorenHeadings = buyer ? [config.eventorenHeading, config.buyerEventorenHeading] : [config.eventorenHeading]
  const eventorenSection = sections.find((section) => eventorenHeadings.includes(section.title))
  if (eventorenSection === undefined) error(`body: missing "## ${eventorenHeadings.join('" or "## ')}"`)
  else {
    const words = contentWordCount(eventorenSection.tokens.map((token) => token.raw).join(""))
    if (!buyer && (words < 120 || words > 250)) warning(`body: Eventoren section has ${words} words, target 120–250`)
  }

  const wordCount = contentWordCount(body)
  if (wordCount < config.wordCountMin) error(`body: ${wordCount} words, min ${config.wordCountMin}`)
  else if (wordCount < config.wordCountTarget) warning(`body: ${wordCount} words, target ≥ ${config.wordCountTarget}`)
  else if (wordCount > config.wordCountMax) warning(`body: ${wordCount} words, target ≤ ${config.wordCountMax}`)

  let hasTableOrChecklist = false
  let internalLinks = 0
  walkTokens(tokens, (token) => {
    if (token.type === "html") error(`body: raw HTML is not allowed: ${token.raw.trim().slice(0, 60)}`)
    if (token.type === "image") error(`body: images are not allowed in the body: ${token.href}`)
    if (token.type === "table" || (token.type === "list" && token.items.some((item: Tokens.ListItem) => item.task)))
      hasTableOrChecklist = true
    if (token.type !== "link") return
    if (token.href.startsWith("/") || /^https?:\/\/(?:www\.)?eventoren\.de/iu.test(token.href)) internalLinks += 1
    const issue = contentLinkCheck(token.href, options.linkTargets)
    if (issue !== undefined) issues.push({ level: issue.level, message: `link: ${issue.message}` })
  })
  if (!hasTableOrChecklist) warning("body: no table or checklist (- [ ])")
  if (internalLinks < 3 || internalLinks > 8) warning(`body: ${internalLinks} internal links, target 3–8`)
  if (options.category === config.legalCategory && !body.includes(config.legalDisclaimer))
    warning(`body: legal/tax article without "${config.legalDisclaimer}"`)

  return issues
}

type Section = { readonly title: string; readonly tokens: Token[] }

function sectionsRead(tokens: readonly Token[]): Section[] {
  const sections: { title: string; tokens: Token[] }[] = []
  for (const token of tokens) {
    if (token.type === "heading" && token.depth === 2) {
      sections.push({ title: contentTokenTextRead(token.tokens), tokens: [] })
      continue
    }
    sections.at(-1)?.tokens.push(token)
  }
  return sections
}

function linksRead(tokens: Token[]): string[] {
  const hrefs: string[] = []
  walkTokens(tokens, (token) => {
    if (token.type === "link") hrefs.push(token.href)
  })
  return hrefs
}
