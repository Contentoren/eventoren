// Auto-generated, manual changes will be replaced by content:process:local.
// This empty catalog keeps the content-enabled project type-safe before its first article is added.

import type { ContentEntry } from "@adaptive-ds/website-content-pipeline"

export type { ContentEntry } from "@adaptive-ds/website-content-pipeline"

export const contentList: Record<string, ContentEntry> = {}

export const allContent = Object.values(contentList)

function today(): string {
  return new Date().toISOString().slice(0, 10)
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
