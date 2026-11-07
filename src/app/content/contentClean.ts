#!/usr/bin/env bun

// Guard: the pipeline's contentClean rewrites frontmatter to its own schema and strips the
// extended keys this project relies on (category, keywords, translationKey, seoTitle).
console.error(
  "[contentClean] Disabled: content:clean would strip the extended frontmatter (category, keywords, " +
    "translationKey, seoTitle) from content/ratgeber and content/guides. Edit the Markdown sources by hand " +
    "and run `bun run content:check` or `bun run content:lint -- <files>` instead.",
)
process.exit(1)
