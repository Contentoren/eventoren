import type { ContentIssue } from "./ContentIssue.ts"
import { contentCollectionConfig } from "./contentCollectionConfig.ts"
import type { ContentCollection } from "./contentCollectionSchema.ts"
import { contentPlanList } from "./contentPlanList.ts"

const datePattern = /^\d{4}-\d{2}-\d{2}$/u

/** Validate the (extended) frontmatter of one source file against the plan's article format. */
export function contentFrontmatterCheck(
  data: Readonly<Record<string, unknown>>,
  collection: ContentCollection,
  fileSlug: string,
): ContentIssue[] {
  const config = contentCollectionConfig[collection]
  const issues: ContentIssue[] = []
  const error = (message: string) => issues.push({ level: "error", message })
  const warning = (message: string) => issues.push({ level: "warning", message })
  const text = (key: string): string | undefined => {
    const value = data[key]
    return typeof value === "string" && value.trim() !== "" ? value.trim() : undefined
  }

  const title = text("title")
  if (title === undefined) error("frontmatter: title is required")
  else if (title.length > 80) error(`frontmatter: title has ${title.length} chars, max 80`)
  else if (title.length > 70) warning(`frontmatter: title has ${title.length} chars, target ≤ 70`)

  const description = text("description")
  if (description === undefined) error("frontmatter: description is required")
  else if (description.length < 110 || description.length > 170)
    error(`frontmatter: description has ${description.length} chars, allowed 110–170`)
  else if (description.length < 130 || description.length > 160)
    warning(`frontmatter: description has ${description.length} chars, target 130–160`)

  const seoTitle = data.seoTitle
  if (seoTitle !== undefined && seoTitle !== null) {
    if (typeof seoTitle !== "string" || seoTitle.trim() === "")
      error("frontmatter: seoTitle must be a non-empty string")
    else if (seoTitle.trim().length > 60) error(`frontmatter: seoTitle has ${seoTitle.trim().length} chars, max 60`)
    else if (seoTitle.trim().length > 55)
      warning(`frontmatter: seoTitle has ${seoTitle.trim().length} chars, target ≤ 55`)
  }

  const publishedAt = text("publishedAt")
  if (publishedAt === undefined || !datePattern.test(publishedAt))
    error("frontmatter: publishedAt must be a quoted YYYY-MM-DD string")
  const updatedAt = data.updatedAt
  if (updatedAt !== undefined && (typeof updatedAt !== "string" || !datePattern.test(updatedAt)))
    error("frontmatter: updatedAt must be a quoted YYYY-MM-DD string")

  const slug = text("slug")
  if (slug === undefined) error("frontmatter: slug is required")
  else if (slug !== fileSlug) error(`frontmatter: slug "${slug}" does not match the filename slug "${fileSlug}"`)

  for (const key of ["image", "imageAlt", "author"])
    if (text(key) === undefined) error(`frontmatter: ${key} is required`)

  const category = text("category")
  const categoryIds = Object.keys(config.categories)
  if (category === undefined) error("frontmatter: category is required")
  else if (!categoryIds.includes(category))
    error(`frontmatter: category "${category}" is not one of ${categoryIds.join(", ")}`)

  const keywords = data.keywords
  if (!Array.isArray(keywords) || keywords.some((keyword) => typeof keyword !== "string" || keyword.trim() === ""))
    error("frontmatter: keywords must be an array of non-empty strings")
  else if (keywords.length < 4 || keywords.length > 10)
    error(`frontmatter: keywords has ${keywords.length} entries, allowed 4–10`)

  const translationKey = data.translationKey
  if (
    translationKey !== undefined &&
    translationKey !== null &&
    (typeof translationKey !== "string" || !translationKey.trim())
  )
    error("frontmatter: translationKey must be a non-empty string")

  const planned = contentPlanList.find((item) => item.collection === collection && item.slug === slug)
  if (slug !== undefined && planned === undefined)
    warning(`plan: slug "${slug}" is not in the ${collection} slug table`)
  if (planned !== undefined && category !== undefined && planned.category !== category)
    warning(`plan: category "${category}" differs from the planned "${planned.category}"`)
  if (
    planned !== undefined &&
    (planned.translationKey ?? null) !== (typeof translationKey === "string" ? translationKey : null)
  )
    warning(`plan: translationKey differs from the planned ${JSON.stringify(planned.translationKey)}`)

  return issues
}
