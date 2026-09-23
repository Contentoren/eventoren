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
  const siteUrl =
    process.env.CONVEX_SITE_URL ??
    process.env.VITE_CONVEX_SITE_URL ??
    process.env.PUBLIC_BASE_URL_API ??
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
    const result = (await response.json()) as Result<EventImageVariants>
    if (!result.success) return createResultError(op, result.errorMessage)
    if (!response.ok) return createResultError(op, "Image upload failed; please try again")
    return createResult(result.data)
  } catch {
    return createResultError(op, "Image upload failed; please try again")
  }
}
