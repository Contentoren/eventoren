import { expect, test } from "bun:test"

const rootSource = await Bun.file(`${import.meta.dir}/../src/routes/__root.tsx`).text()

function tagIndex(source: string, tag: string): number {
  const index = source.indexOf(tag)
  expect(index, `expected ${tag} in src/routes/__root.tsx`).toBeGreaterThan(-1)
  return index
}

test("root document mounts HeadContent inside body for reactive client-side head updates", () => {
  const headOpen = tagIndex(rootSource, "<head>")
  const headClose = tagIndex(rootSource, "</head>")
  const bodyOpen = tagIndex(rootSource, "<body")
  const headContent = tagIndex(rootSource, "<HeadContent")

  expect(headOpen).toBeLessThan(headClose)
  expect(headClose).toBeLessThan(bodyOpen)
  expect(headContent).toBeGreaterThan(bodyOpen)
})

test("root document keeps framework hydration primitives in place", () => {
  expect(rootSource).toContain("<HydrationScript />")
  expect(rootSource).toContain("<Scripts />")
  expect(rootSource.match(/<HeadContent/g)?.length).toBe(1)
})
