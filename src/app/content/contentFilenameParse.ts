const contentFilenamePattern = /^(\d{4}-\d{2}-\d{2})-([a-z0-9]+(?:-[a-z0-9]+)*)\.md$/u

/** Parse `YYYY-MM-DD-<slug>.md`; undefined when the name does not match. */
export function contentFilenameParse(fileName: string): { readonly date: string; readonly slug: string } | undefined {
  const match = contentFilenamePattern.exec(fileName)
  if (match?.[1] === undefined || match[2] === undefined) return undefined
  return { date: match[1], slug: match[2] }
}
