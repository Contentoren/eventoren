#!/usr/bin/env bun

import { contentClean } from "@adaptive-ds/website-content-pipeline"
import { contentOptions } from "./contentOptions.js"

try {
  const result = contentClean(contentOptions)
  console.log(
    `[contentClean] scanned=${result.scanned}, changed=${result.changed.length}, unchanged=${result.unchanged}`,
  )
} catch (error) {
  console.error("[contentClean] Fatal error:", error)
  process.exitCode = 1
}
