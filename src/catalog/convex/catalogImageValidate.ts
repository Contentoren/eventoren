import { createResult, createResultError } from "#result"
import { catalogImageMaxBytes } from "./catalogImageMaxBytes.js"

const types: Record<string, string[]> = {
  "image/jpeg": [".jpg", ".jpeg"],
  "image/png": [".png"],
  "image/webp": [".webp"],
  "image/avif": [".avif"],
}

export function catalogImageValidate(filename: string, mediaType: string, byteSize: number) {
  const op = "catalogImageValidate"
  if (!Number.isSafeInteger(byteSize) || byteSize < 1 || byteSize > catalogImageMaxBytes)
    return createResultError(op, "Image must be between 1 byte and 10 MiB")
  if (!types[mediaType]?.some((extension) => filename.toLowerCase().endsWith(extension)))
    return createResultError(op, "Use a JPEG, PNG, WebP or AVIF image with a matching file extension")
  if (filename.length > 200 || /[/\\\x00-\x1f]/u.test(filename)) return createResultError(op, "Invalid image filename")
  return createResult(true)
}
