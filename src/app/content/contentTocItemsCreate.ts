import type { ContentHeading } from "./ContentHeading.ts"

/** Table-of-contents entries (`##` sections only) linking to the heading ids in the article HTML. */
export function contentTocItemsCreate(
  headings: readonly ContentHeading[],
): { readonly id: string; readonly text: string; readonly href: string }[] {
  return headings
    .filter((heading) => heading.depth === 2 && heading.id !== "")
    .map((heading) => ({ id: heading.id, text: heading.text, href: `#${heading.id}` }))
}
