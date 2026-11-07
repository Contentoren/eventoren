/** Internal article paths a link may point to. */
export type ContentLinkTargets = {
  /** Paths of articles that exist as source files. */
  readonly existing: ReadonlySet<string>
  /** Paths from the editorial plan that may not be written yet (only used by content:lint). */
  readonly planned: ReadonlySet<string>
}
