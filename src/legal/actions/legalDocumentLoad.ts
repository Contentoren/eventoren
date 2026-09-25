import { createServerFn } from "@tanstack/solid-start"
import { createResult, createResultError, type ResultOk } from "#result"
import { legalDocumentLoadNameValidate } from "../legalDocumentLoadNameValidate.ts"
import { legalErrorCatalog } from "../legalErrorCatalog.ts"

const legalLoaders = import.meta.glob<string>("/src/legal/*.md", { query: "?raw", import: "default" })

type LegalDocument = { readonly title: string; readonly html: string }
type LegalDocumentName = Extract<ReturnType<typeof legalDocumentLoadNameValidate>, { success: true }>["data"]
type LegalDocumentLoadError = Extract<ReturnType<typeof legalDocumentLoadNameValidate>, { success: false }>
type LegalDocumentLoadResult = ResultOk<LegalDocument> | LegalDocumentLoadError

export const legalDocumentLoad = createServerFn({ method: "GET" })
  .validator((data: unknown) => data)
  .handler(async ({ data }): Promise<LegalDocumentLoadResult> => {
    const op = "legalDocumentLoad"
    const nameResult = legalDocumentLoadNameValidate(data)
    if (!nameResult.success) return nameResult

    const name: LegalDocumentName = nameResult.data
    const load = legalLoaders[`/src/legal/${name}.md`]
    if (!load) {
      return {
        ...createResultError(op, "Legal document not found"),
        ...legalErrorCatalog.documentNotFound,
      }
    }

    const [{ default: matter }, { marked }] = await Promise.all([import("gray-matter"), import("marked")])
    const parsed = matter(await load())
    const title = typeof parsed.data.title === "string" ? parsed.data.title : "Rechtliches"
    const html = marked.parse(parsed.content.trim(), { async: false })
    return createResult({ title, html })
  })
