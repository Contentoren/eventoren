import type { ContentIssue } from "./ContentIssue.ts"

/** Human-readable per-file report lines plus error/warning counts. */
export function contentIssueReport(
  results: ReadonlyArray<{ readonly file: string; readonly issues: readonly ContentIssue[] }>,
): {
  readonly lines: string[]
  readonly errors: number
  readonly warnings: number
} {
  const lines: string[] = []
  let errors = 0
  let warnings = 0
  for (const { file, issues } of results) {
    const fileErrors = issues.filter((issue) => issue.level === "error").length
    const fileWarnings = issues.length - fileErrors
    errors += fileErrors
    warnings += fileWarnings
    lines.push(`${fileErrors > 0 ? "✗" : "✓"} ${file} (${fileErrors} error(s), ${fileWarnings} warning(s))`)
    for (const issue of [...issues].sort((left, right) => left.level.localeCompare(right.level)))
      lines.push(`  ${issue.level === "error" ? "error  " : "warning"} ${issue.message}`)
  }
  return { lines, errors, warnings }
}
