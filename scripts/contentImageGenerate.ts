import { createHash } from "node:crypto"
import { existsSync } from "node:fs"
import { mkdir, mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises"
import { basename, join } from "node:path"
import { codexImageGenerate } from "@adaptive-ds/codex-imagen"
import sharp from "sharp"
import * as a from "valibot"
import { createResult, createResultError, type Result } from "#result"
import { imageList } from "../src/app/assets/imageList.ts"
import { contentSourceParse } from "../src/app/content/contentSourceParse.ts"

/*
 * Generates the Ratgeber/Guides hero images from `src/app/content/image-prompts/*.md`.
 * Style and generation settings: `src/app/content/image-prompts/_style.md`.
 * Usage: bun run content:images [--only=<key,...>] [--limit=N] [--concurrency=N] [--force]
 */

const rootDirectory = process.cwd()
const promptDirectory = join(rootDirectory, "src", "app", "content", "image-prompts")
const stylePath = join(promptDirectory, "_style.md")
const generatedLogPath = join(promptDirectory, "_generated.json")
const imageFolder = "1920x1080_webp"
const imageDirectory = join(rootDirectory, "images", imageFolder)

const generation = {
  model: "gpt-image-2",
  size: "2048x1152",
  quality: "medium",
  outputFormat: "png",
  requestTimeoutMs: 300_000,
} as const
const output = { width: 1920, height: 1080, minSourceWidth: 1000 } as const
const attemptsMax = 3
const concurrencyDefault = 4
const concurrencyMax = 6
const baseUrlDefault = "https://codex.leonardomora.de/v1"

const imageKeySchema = a.pipe(a.string(), a.regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/u, "imageKey must be kebab-case"))

const promptFrontmatterSchema = a.object({
  imageKey: imageKeySchema,
  articles: a.pipe(a.array(a.pipe(a.string(), a.startsWith("/"))), a.minLength(1, "articles must not be empty")),
  alt: a.pipe(a.string(), a.trim(), a.minLength(1, "alt is required"), a.regex(/^[^\r\n]+$/u, "alt must be one line")),
})

const generatedEntrySchema = a.object({
  model: a.string(),
  size: a.string(),
  quality: a.string(),
  promptSha256: a.string(),
  generatedAt: a.string(),
})
const generatedLogSchema = a.record(a.string(), generatedEntrySchema)
type GeneratedEntry = a.InferOutput<typeof generatedEntrySchema>
type GeneratedLog = a.InferOutput<typeof generatedLogSchema>

type ImagePrompt = {
  readonly file: string
  readonly imageKey: string
  readonly alt: string
  readonly prompt: string
}

type CliOptions = {
  readonly only: ReadonlySet<string> | undefined
  readonly limit: number | undefined
  readonly concurrency: number
  readonly force: boolean
}

type ImageOutcome = {
  readonly imageKey: string
  readonly status: "generated" | "skipped" | "failed"
  readonly note: string
}

function cliOptionsParse(argv: readonly string[]): Result<CliOptions> {
  const op = "cliOptionsParse"
  let only: Set<string> | undefined
  let limit: number | undefined
  let concurrency = concurrencyDefault
  let force = false
  for (const arg of argv) {
    if (arg === "--") continue
    if (arg === "--force") {
      force = true
      continue
    }
    const [name, value] = arg.split("=", 2)
    if (name === "--only" && value) {
      only = new Set(
        value
          .split(",")
          .map((key) => key.trim())
          .filter((key) => key.length > 0),
      )
      continue
    }
    if (name === "--limit" && value) {
      const parsed = Number(value)
      if (!Number.isInteger(parsed) || parsed < 1) return createResultError(op, `invalid --limit: ${value}`)
      limit = parsed
      continue
    }
    if (name === "--concurrency" && value) {
      const parsed = Number(value)
      if (!Number.isInteger(parsed) || parsed < 1) return createResultError(op, `invalid --concurrency: ${value}`)
      concurrency = Math.min(parsed, concurrencyMax)
      continue
    }
    return createResultError(op, `unknown argument: ${arg}`)
  }
  return createResult({ only, limit, concurrency, force })
}

function styleSectionRead(markdown: string, heading: string): Result<string> {
  const op = "styleSectionRead"
  const sectionStart = markdown.indexOf(`## ${heading}\n`)
  if (sectionStart < 0) return createResultError(op, `missing section "## ${heading}" in ${stylePath}`)
  const section = markdown.slice(sectionStart).split(/\n## /u)[0] ?? ""
  const fenced = /```text\n([\s\S]*?)\n```/u.exec(section)?.[1]?.trim()
  if (!fenced) return createResultError(op, `section "## ${heading}" needs a \`\`\`text block`)
  return createResult(fenced)
}

async function styleRead(): Promise<Result<{ prefix: string; constraints: string }>> {
  const op = "styleRead"
  let markdown: string
  try {
    markdown = await readFile(stylePath, "utf8")
  } catch (error) {
    return createResultError(op, error instanceof Error ? error.message : String(error))
  }
  const prefix = styleSectionRead(markdown, "Prompt prefix")
  if (!prefix.success) return prefix
  const constraints = styleSectionRead(markdown, "Negative / constraints")
  if (!constraints.success) return constraints
  return createResult({ prefix: prefix.data, constraints: constraints.data })
}

async function imagePromptsRead(style: { prefix: string; constraints: string }): Promise<Result<ImagePrompt[]>> {
  const op = "imagePromptsRead"
  let files: string[]
  try {
    files = (await readdir(promptDirectory)).filter((file) => file.endsWith(".md") && !file.startsWith("_")).sort()
  } catch (error) {
    return createResultError(op, error instanceof Error ? error.message : String(error))
  }
  const prompts: ImagePrompt[] = []
  const seenKeys = new Set<string>()
  for (const file of files) {
    const source = await readFile(join(promptDirectory, file), "utf8")
    const parsed = contentSourceParse(source)
    if (!parsed.success) return createResultError(op, `${file}: ${parsed.errorMessage}`)
    const frontmatter = a.safeParse(promptFrontmatterSchema, parsed.data.data)
    if (!frontmatter.success) return createResultError(op, `${file}: ${a.summarize(frontmatter.issues)}`)
    const { imageKey, alt } = frontmatter.output
    if (`${imageKey}.md` !== file)
      return createResultError(op, `${file}: imageKey "${imageKey}" must match the file name`)
    if (seenKeys.has(imageKey)) return createResultError(op, `${file}: duplicate imageKey "${imageKey}"`)
    seenKeys.add(imageKey)
    const scene = parsed.data.body.trim()
    if (scene.length === 0) return createResultError(op, `${file}: scene description (body) is empty`)
    const prompt = `${style.prefix}\n\nScene: ${scene}\n\n${style.constraints}`
    prompts.push({ file, imageKey, alt, prompt })
  }
  return createResult(prompts)
}

function catalogHasImage(imageKey: string): boolean {
  return Object.values(imageList).some(
    (image) => image.basename === imageKey && image.folders.length === 1 && image.folders[0] === imageFolder,
  )
}

async function generatedLogRead(): Promise<Result<GeneratedLog>> {
  const op = "generatedLogRead"
  if (!existsSync(generatedLogPath)) return createResult({})
  try {
    const parsed = a.safeParse(generatedLogSchema, JSON.parse(await readFile(generatedLogPath, "utf8")))
    if (!parsed.success) return createResultError(op, a.summarize(parsed.issues))
    return createResult(parsed.output)
  } catch (error) {
    return createResultError(op, error instanceof Error ? error.message : String(error))
  }
}

let generatedLogQueue: Promise<void> = Promise.resolve()

/** Serialised write so parallel workers never interleave on the same file. */
function generatedLogWrite(log: GeneratedLog): Promise<void> {
  generatedLogQueue = generatedLogQueue.then(() => {
    const sorted = Object.fromEntries(Object.entries(log).sort(([left], [right]) => left.localeCompare(right)))
    return writeFile(generatedLogPath, `${JSON.stringify(sorted, null, 2)}\n`, "utf8")
  })
  return generatedLogQueue
}

function apiConfigRead(): Result<{ baseUrl: string; apiKey: string }> {
  const op = "apiConfigRead"
  const apiKey = process.env.CODEX_IMAGE_API_KEY || process.env.CODEX_LB_API_TOKEN
  if (!apiKey) return createResultError(op, "set CODEX_IMAGE_API_KEY or CODEX_LB_API_TOKEN")
  return createResult({ baseUrl: process.env.CODEX_IMAGE_BASE_URL || baseUrlDefault, apiKey })
}

async function imageAttempt(
  prompt: ImagePrompt,
  api: { baseUrl: string; apiKey: string },
  rawPath: string,
): Promise<Result<{ width: number; height: number }>> {
  const op = "imageAttempt"
  await rm(rawPath, { force: true })
  const generated = await codexImageGenerate({
    client: { baseUrl: api.baseUrl, apiKey: api.apiKey, requestTimeoutMs: generation.requestTimeoutMs },
    prompt: prompt.prompt,
    outputPath: rawPath,
    model: generation.model,
    size: generation.size,
    quality: generation.quality,
    outputFormat: generation.outputFormat,
    writeTxt: false,
  })
  if (!generated.success) return generated
  if (!existsSync(rawPath)) return createResultError(op, "image file missing after generation")
  try {
    const metadata = await sharp(rawPath).metadata()
    if (!metadata.width || !metadata.height) return createResultError(op, "image has no dimensions")
    if (metadata.width < output.minSourceWidth) return createResultError(op, `image too small: ${metadata.width}px`)
    await sharp(rawPath)
      .resize(output.width, output.height, { fit: "cover", position: sharp.strategy.attention })
      .png()
      .toFile(join(imageDirectory, `${prompt.imageKey}.png`))
    return createResult({ width: metadata.width, height: metadata.height })
  } catch (error) {
    return createResultError(op, error instanceof Error ? error.message : String(error))
  }
}

async function imageGenerate(
  prompt: ImagePrompt,
  api: { baseUrl: string; apiKey: string },
  tempDirectory: string,
  log: GeneratedLog,
): Promise<ImageOutcome> {
  const rawPath = join(tempDirectory, `${prompt.imageKey}.png`)
  const startedAt = Date.now()
  let lastError = ""
  for (let attempt = 1; attempt <= attemptsMax; attempt++) {
    const result = await imageAttempt(prompt, api, rawPath)
    if (!result.success) {
      lastError = `${result.op}: ${result.errorMessage.slice(0, 300)}`
      console.warn(`[${prompt.imageKey}] attempt ${attempt}/${attemptsMax} failed: ${lastError}`)
      continue
    }
    await writeFile(join(imageDirectory, `${prompt.imageKey}.md`), `${prompt.alt}\n`, "utf8")
    const entry: GeneratedEntry = {
      model: generation.model,
      size: generation.size,
      quality: generation.quality,
      promptSha256: createHash("sha256").update(prompt.prompt, "utf8").digest("hex"),
      generatedAt: new Date().toISOString(),
    }
    log[prompt.imageKey] = entry
    await generatedLogWrite(log)
    const seconds = Math.round((Date.now() - startedAt) / 1000)
    const note = `source ${result.data.width}x${result.data.height}, ${seconds}s, attempt ${attempt}`
    console.log(`[${prompt.imageKey}] generated (${note})`)
    return { imageKey: prompt.imageKey, status: "generated", note }
  }
  return { imageKey: prompt.imageKey, status: "failed", note: lastError }
}

function promptSkipReason(prompt: ImagePrompt, force: boolean): string | undefined {
  if (force) return undefined
  if (existsSync(join(imageDirectory, `${prompt.imageKey}.png`))) return "local PNG exists"
  if (catalogHasImage(prompt.imageKey)) return "already in assets catalog"
  return undefined
}

async function promptsRunPooled<T>(items: readonly T[], concurrency: number, run: (item: T) => Promise<void>) {
  let nextIndex = 0
  const worker = async () => {
    while (nextIndex < items.length) {
      const item = items[nextIndex++]
      if (item !== undefined) await run(item)
    }
  }
  await Promise.all(Array.from({ length: Math.min(concurrency, items.length) }, worker))
}

async function main(): Promise<number> {
  const options = cliOptionsParse(process.argv.slice(2))
  if (!options.success) return mainFail(options)
  const style = await styleRead()
  if (!style.success) return mainFail(style)
  const prompts = await imagePromptsRead(style.data)
  if (!prompts.success) return mainFail(prompts)
  const log = await generatedLogRead()
  if (!log.success) return mainFail(log)

  const { only, limit, concurrency, force } = options.data
  const unknownKeys = [...(only ?? [])].filter((key) => !prompts.data.some((prompt) => prompt.imageKey === key))
  if (unknownKeys.length > 0)
    return mainFail(createResultError("main", `unknown --only keys: ${unknownKeys.join(", ")}`))

  const outcomes: ImageOutcome[] = []
  const queue: ImagePrompt[] = []
  for (const prompt of prompts.data) {
    if (only && !only.has(prompt.imageKey)) continue
    const skipReason = promptSkipReason(prompt, force)
    if (skipReason) {
      outcomes.push({ imageKey: prompt.imageKey, status: "skipped", note: skipReason })
      continue
    }
    if (limit !== undefined && queue.length >= limit) continue
    queue.push(prompt)
  }

  if (queue.length > 0) {
    const api = apiConfigRead()
    if (!api.success) return mainFail(api)
    await mkdir(imageDirectory, { recursive: true })
    const tempDirectory = await mkdtemp(join(process.env.TMPDIR || "/tmp", "content-images-"))
    console.log(`Generating ${queue.length} image(s) with ${generation.model} (concurrency ${concurrency})`)
    try {
      await promptsRunPooled(queue, concurrency, async (prompt) => {
        outcomes.push(await imageGenerate(prompt, api.data, tempDirectory, log.data))
      })
    } finally {
      await rm(tempDirectory, { recursive: true, force: true })
    }
  }

  const count = (status: ImageOutcome["status"]) => outcomes.filter((outcome) => outcome.status === status).length
  for (const outcome of outcomes.filter((item) => item.status === "failed")) {
    console.error(`FAILED ${outcome.imageKey}: ${outcome.note}`)
  }
  console.log(`Summary: generated ${count("generated")}, skipped ${count("skipped")}, failed ${count("failed")}`)
  return count("failed") > 0 ? 1 : 0
}

function mainFail(error: { op: string; errorMessage: string }): number {
  console.error(`${basename(import.meta.path)}: ${error.op}: ${error.errorMessage}`)
  return 1
}

process.exit(await main())
