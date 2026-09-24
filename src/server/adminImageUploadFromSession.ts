import { getRequestHeader } from "@tanstack/solid-start/server"
import { createResult, createResultError, type PromiseResult, type Result } from "#result"
import type { EventImageVariants } from "#src/events/EventImageVariants.ts"
import { catalogImageValidate } from "#src/catalog/convex/catalogImageValidate.ts"
import { eventorenAdminAccessRead } from "#src/auth/server/eventorenAdminAccessRead.ts"
import { adminSessionTokenRead } from "./adminSessionTokenRead.ts"

/** SolidStart boundary: only the image and final variants cross the browser boundary. */
export async function adminImageUploadFromSession(data: FormData): PromiseResult<EventImageVariants> {
  const op = "adminImageUploadFromSession"
  const access = await eventorenAdminAccessRead()
  if (!access.success) return createResultError(op, access.errorMessage)
  const token = adminSessionTokenRead(getRequestHeader("cookie"))
  if (!token.success) return createResultError(op, token.errorMessage)
  const file = data.get("file")
  if (!(file instanceof File)) return createResultError(op, "Select an image to upload")
  const valid = catalogImageValidate(file.name, file.type, file.size)
  if (!valid.success) return valid
  // Pages Workers do not inherit the build host's process.env. Use the build-time
  // public HTTP origin when a runtime binding has not been configured.
  const processEnv = typeof process === "undefined" ? undefined : process.env
  const siteUrl =
    processEnv?.CONVEX_SITE_URL ??
    processEnv?.VITE_CONVEX_SITE_URL ??
    processEnv?.PUBLIC_BASE_URL_API ??
    import.meta.env.VITE_CONVEX_SITE_URL ??
    import.meta.env.PUBLIC_BASE_URL_API ??
    "http://127.0.0.1:3211"
  try {
    const response = await fetch(`${siteUrl.replace(/\/$/, "")}/api/catalog/image-upload`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token.data}`,
        "Content-Type": file.type,
        "X-Image-Size": String(file.size),
        "X-Image-Filename": file.name,
      },
      body: file,
    })
    if (!response.headers.get("content-type")?.includes("application/json")) {
      console.error("Event image HTTP endpoint returned a non-JSON response", { status: response.status })
      return createResultError(op, "Image upload failed; please try again")
    }
    const result = (await response.json()) as Result<EventImageVariants>
    if (!result.success) return createResultError(op, result.errorMessage)
    if (!response.ok) return createResultError(op, "Image upload failed; please try again")
    return createResult(result.data)
  } catch (error) {
    console.error("Event image HTTP request failed", { reason: error instanceof Error ? error.name : "unknown" })
    return createResultError(op, "Image upload failed; please try again")
  }
}
