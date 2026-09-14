#!/usr/bin/env bun

import { contentProcess } from "@adaptive-ds/website-content-pipeline"
import { contentOptions } from "./contentOptions.js"

await contentProcess(contentOptions).catch((error: unknown) => {
  console.error("[contentProcess] Fatal error:", error)
  process.exitCode = 1
})
