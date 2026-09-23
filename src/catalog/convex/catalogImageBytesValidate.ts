import { createResult, createResultError } from "#result"

export function catalogImageBytesValidate(bytes: Uint8Array, mediaType: string) {
  const op = "catalogImageBytesValidate"
  const text = (start: number, end: number) => String.fromCharCode(...bytes.subarray(start, end))
  const valid =
    mediaType === "image/jpeg"
      ? bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff
      : mediaType === "image/png"
        ? text(0, 8) === "\x89PNG\r\n\x1a\n"
        : mediaType === "image/webp"
          ? text(0, 4) === "RIFF" && text(8, 12) === "WEBP"
          : mediaType === "image/avif"
            ? text(4, 8) === "ftyp" && ["avif", "avis"].includes(text(8, 12))
            : false
  if (!valid) return createResultError(op, "Uploaded bytes do not match the image type")
  return createResult(true)
}
