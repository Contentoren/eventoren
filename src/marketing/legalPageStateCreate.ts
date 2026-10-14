import { createMemo } from "solid-js"

export function legalPageStateCreate(props: { readonly html: () => string }) {
  const document = createMemo(() => {
    const source = props.html()
    const headings: { id: string; html: string }[] = []
    const hasNumberedSections = /<h2>\d+\.\s/u.test(source)
    const html = source.replace(/<h2>([\s\S]*?)<\/h2>/gu, (heading, content: string, offset: number) => {
      if (!/^\d+\.\s/u.test(content.replace(/<[^>]*>/gu, ""))) {
        if (hasNumberedSections && offset === source.search(/\S/u)) {
          return `<h2 class="legal-introduction">${content}</h2>`
        }
        return heading
      }

      const id = `legal-section-${headings.length + 1}`
      headings.push({ id, html: content })
      return `<h2 id="${id}">${content}</h2>`
    })
    return { html, headings }
  })

  return {
    html: () => document().html,
    headings: () => document().headings,
  }
}
