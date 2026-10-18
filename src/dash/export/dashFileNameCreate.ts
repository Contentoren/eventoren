import { dashSlugCreate } from "../model/dashSlugCreate.ts"

export function dashFileNameCreate(parts: string[], extension: string, now: Date): string {
  const slugs = parts.map((part) => dashSlugCreate(part)).filter((slug) => slug.length > 0)
  const date = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Berlin",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now)
  const cleanExtension = extension.replace(/^\.+/, "")
  return `${[...slugs, date].join("_")}.${cleanExtension}`
}
