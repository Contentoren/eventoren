/** Fixed-key JSON preserves exact text and section order without delimiter ambiguity. */
export function organizerContractTextCanonicalCreate(document: {
  documentId: string
  revision: string
  sections: readonly (readonly [string, string])[]
}): string {
  return JSON.stringify({
    documentId: document.documentId,
    revision: document.revision,
    sections: document.sections.map(([heading, body]) => ({ heading, body })),
  })
}
