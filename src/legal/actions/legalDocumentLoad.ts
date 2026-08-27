import { createServerFn } from "@tanstack/solid-start"

type LegalDocumentName = "agb" | "impressum"

const legalLoaders = import.meta.glob<string>("/src/legal/*.md", { query: "?raw", import: "default" })

export const legalDocumentLoad = createServerFn({ method: "GET" })
  .validator((data: unknown) => {
    if (!data || typeof data !== "object" || typeof (data as { name?: unknown }).name !== "string") {
      throw new Error("Missing legal document name")
    }

    const name = (data as { name: string }).name
    if (!(["agb", "impressum"] as string[]).includes(name)) throw new Error(`Unknown legal document name: ${name}`)
    return { name: name as LegalDocumentName }
  })
  .handler(async ({ data }) => {
    const load = legalLoaders[`/src/legal/${data.name}.md`]
    if (!load) throw new Error(`Legal document not found: ${data.name}`)

    const [{ default: matter }, { marked }] = await Promise.all([import("gray-matter"), import("marked")])
    const parsed = matter(await load())
    const title = typeof parsed.data.title === "string" ? parsed.data.title : "Rechtliches"
    const html = marked.parse(parsed.content.trim(), { async: false })
    return { title, html }
  })
