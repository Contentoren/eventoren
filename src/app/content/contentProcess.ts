#!/usr/bin/env bun

import { readFile, writeFile } from "node:fs/promises"
import { type ContentProcessOptions, contentProcess } from "@adaptive-ds/website-content-pipeline"
import { contentListEmptyCode } from "./contentListEmptyCode.ts"
import { contentOptions } from "./contentOptions.ts"
import { guidesContentOptions } from "./guidesContentOptions.ts"

// One run processes both collections: German `ratgeber` and English `guides`.
for (const options of [contentOptions, guidesContentOptions] satisfies ContentProcessOptions[]) {
  try {
    const result = await contentProcess(options)
    if (result.entries.length === 0) await contentListEmptyWrite(options.contentListOutputPath)
  } catch (error) {
    console.error(`[contentProcess] Fatal error in ${options.contentSection}:`, error)
    process.exitCode = 1
  }
}

async function contentListEmptyWrite(path: string): Promise<void> {
  const code = contentListEmptyCode()
  const current = await readFile(path, "utf8").catch(() => undefined)
  if (current !== code) await writeFile(path, code, "utf8")
}
