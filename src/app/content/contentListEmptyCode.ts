/**
 * Source of an empty generated content list. The pipeline skips writing the list when a
 * collection has no `.md` files, so the process script writes this instead to drop stale entries.
 */
export function contentListEmptyCode(): string {
  return `// Auto-generated, manual changes will be replaced by content:process:local.
// This empty catalog keeps the content-enabled project type-safe before its first article is added.

import type { ContentEntry } from "@adaptive-ds/website-content-pipeline"

export type { ContentEntry } from "@adaptive-ds/website-content-pipeline"

export const contentList: Record<string, ContentEntry> = {}

export const allContent = Object.values(contentList)

// Publication cutoff in Europe/Berlin, matching contentTodayRead.
function today(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date())
}

export function contentBySlug(_slug: string): ContentEntry | undefined {
  return undefined
}

export function isPublishedAtBuild(entry: ContentEntry, now: string = today()): boolean {
  return entry.publishedAt <= now
}

export function publishedContent(now: string = today()): ContentEntry[] {
  return allContent.filter((entry) => entry.publishedAt <= now)
}
`
}
