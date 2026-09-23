import { createHash } from "node:crypto"
import * as v from "valibot"
import { createResult, createResultError } from "#result"
import { catalogImageServiceRequest } from "./catalogImageServiceRequest.js"

const outputs = [
  { kind: "image", key: "detail", width: 1920, height: 820, format: "avif", quality: 80 },
  { kind: "image", key: "card", width: 1200, height: 900, format: "avif", quality: 80 },
  { kind: "image", key: "organizer", width: 1920, height: 1080, format: "avif", quality: 80 },
] as const
const intentSchema = v.object({
  uploadId: v.string(),
  intent: v.object({
    url: v.pipe(v.string(), v.url()),
    method: v.literal("PUT"),
    headers: v.record(v.string(), v.string()),
    mediaType: v.string(),
    byteSize: v.number(),
  }),
})
const completedSchema = v.object({ assetId: v.string(), workflowId: v.string() })
const workflowSchema = v.object({ status: v.picklist(["queued", "running", "succeeded", "failed", "cancelled"]) })
const definedSchema = v.object({ workflowId: v.string() })
const catalogSchema = v.object({
  catalog: v.object({
    outputs: v.array(
      v.object({
        assetId: v.string(),
        key: v.string(),
        class: v.string(),
        path: v.string(),
      }),
    ),
  }),
})
const projectSchema = v.object({ defaultEnvironment: v.picklist(["development", "production"]) })
const targetEnvironmentSchema = v.object({ id: v.string(), publicBaseUrl: v.pipe(v.string(), v.url()) })

export async function catalogImageForward(input: {
  bytes: Uint8Array
  filename: string
  mediaType: string
  stageId: string
}) {
  const op = "catalogImageForward"
  const apiUrl = process.env.ASSETS_SERVICE_API_URL
  const projectId = process.env.ASSETS_SERVICE_PROJECT_ID
  const environment = process.env.ASSETS_SERVICE_ENVIRONMENT
  const accessToken = process.env.ASSETS_SERVICE_ACCESS_TOKEN
  if (!apiUrl || !projectId || !accessToken || (environment !== "development" && environment !== "production"))
    return createResultError(op, "Event image service is not configured")
  const request = <T extends v.GenericSchema>(path: string, schema: T, method?: "POST" | "PUT", body?: unknown) =>
    catalogImageServiceRequest({ apiUrl, accessToken, path, schema, method, body })
  const fail = (step: string) => {
    console.warn("Event image service step failed", { step, stageId: input.stageId })
    return createResultError(op, `Event image ${step} failed; retry with a new upload`)
  }
  const projectPath = `/projects/${encodeURIComponent(projectId)}`
  const project = await request(projectPath, projectSchema)
  const target = await request(`${projectPath}/environments/${environment}`, targetEnvironmentSchema)
  if (!project.success || !target.success) return fail("project environment lookup")
  const sha256 = createHash("sha256").update(input.bytes).digest("hex")
  // The service matches new uploads by folder + basename; never replace another event's same-named image.
  const extension = input.filename.slice(input.filename.lastIndexOf("."))
  const originalFilename = `${input.filename.slice(0, -extension.length)}-${input.stageId}${extension}`
  const intent = await request(`${projectPath}/uploads/intent`, intentSchema, "POST", {
    originalFilename,
    folders: ["events"],
    integrationNote: "Event administrator image upload",
    byteSize: input.bytes.byteLength,
    mediaType: input.mediaType,
    environment,
    sha256,
  })
  if (!intent.success) return fail("intent")
  if (intent.data.intent.byteSize !== input.bytes.byteLength || intent.data.intent.mediaType !== input.mediaType)
    return fail("intent validation")
  try {
    const headers = Object.fromEntries(
      Object.entries(intent.data.intent.headers).filter(
        ([name]) => !["authorization", "host", "content-length", "cookie"].includes(name.toLowerCase()),
      ),
    )
    const upload = await fetch(intent.data.intent.url, {
      method: "PUT",
      headers: { ...headers, "content-type": input.mediaType },
      body: input.bytes as unknown as ArrayBuffer,
    })
    if (!upload.ok) return fail("transfer")
  } catch {
    return fail("transfer")
  }
  const completed = await request(
    `${projectPath}/uploads/${encodeURIComponent(intent.data.uploadId)}/complete`,
    completedSchema,
    "POST",
    { sha256 },
  )
  if (!completed.success) return fail("completion")

  const workflowWait = async (workflowId: string) => {
    for (let attempt = 0; attempt < 100; attempt++) {
      const status = await request(`${projectPath}/workflows/${encodeURIComponent(workflowId)}/status`, workflowSchema)
      if (!status.success) return false
      if (status.data.status === "succeeded") return true
      if (status.data.status === "failed" || status.data.status === "cancelled") return false
      await new Promise((resolve) => setTimeout(resolve, 2000))
    }
    return false
  }
  if (!(await workflowWait(completed.data.workflowId))) return fail("ingestion")
  // The second workflow also runs publish_asset; output-set acceptance alone is insufficient.
  const assetPath = `${projectPath}/assets/${encodeURIComponent(completed.data.assetId)}`
  const defined = await request(`${assetPath}/outputs`, definedSchema, "PUT", { outputs })
  if (!defined.success) return fail("output definition")
  if (!(await workflowWait(defined.data.workflowId))) return fail("publication")
  if (project.data.defaultEnvironment !== environment) {
    // output-set always enqueues against the project's default environment in service 0.6.5.
    const reprocessed = await request(`${assetPath}/reprocess`, definedSchema, "POST", {
      environmentId: target.data.id,
    })
    if (!reprocessed.success || !(await workflowWait(reprocessed.data.workflowId))) return fail("target publication")
  }

  const catalog = await request(`${projectPath}/catalogs/${environment}/current`, catalogSchema)
  if (!catalog.success) return fail("catalog lookup")
  const urls = outputs.map(({ key }) => {
    const match = catalog.data.catalog.outputs.find(
      (entry) => entry.assetId === completed.data.assetId && entry.key === key && entry.class === "image",
    )
    if (!match || match.path.startsWith("/") || match.path.split("/").some((segment) => segment === ".." || !segment))
      return null
    return new URL(`/${match.path}`, target.data.publicBaseUrl).toString()
  })
  if (urls.some((url) => !url)) return fail("published variant lookup")
  return createResult({ assetId: completed.data.assetId, detail: urls[0]!, card: urls[1]!, organizer: urls[2]! })
}
