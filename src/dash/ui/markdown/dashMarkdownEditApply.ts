export interface DashMarkdownEditSelection {
  value: string
  start: number
  end: number
}

export interface DashMarkdownEditResult {
  value: string
  start: number
  end: number
}

function dashMarkdownEditReplace(selection: DashMarkdownEditSelection, insert: string): DashMarkdownEditResult {
  const next = selection.value.slice(0, selection.start) + insert + selection.value.slice(selection.end)
  return { value: next, start: selection.start + insert.length, end: selection.start + insert.length }
}

export function dashMarkdownEditWrapBold(selection: DashMarkdownEditSelection): DashMarkdownEditResult {
  const selected = selection.value.slice(selection.start, selection.end)
  if (selected) return dashMarkdownEditReplace(selection, `**${selected}**`)
  const result = dashMarkdownEditReplace(selection, "****")
  return { value: result.value, start: result.start - 2, end: result.end - 2 }
}

export function dashMarkdownEditWrapItalic(selection: DashMarkdownEditSelection): DashMarkdownEditResult {
  const selected = selection.value.slice(selection.start, selection.end)
  if (selected) return dashMarkdownEditReplace(selection, `*${selected}*`)
  const result = dashMarkdownEditReplace(selection, "**")
  return { value: result.value, start: result.start - 1, end: result.end - 1 }
}

export function dashMarkdownEditToggleHeading(selection: DashMarkdownEditSelection): DashMarkdownEditResult {
  const lineStart = selection.value.lastIndexOf("\n", selection.start - 1) + 1
  const rawEnd = selection.value.indexOf("\n", selection.start)
  const lineEnd = rawEnd === -1 ? selection.value.length : rawEnd
  const line = selection.value.slice(lineStart, lineEnd)
  if (line.startsWith("## ")) {
    const next = `${selection.value.slice(0, lineStart)}${line.slice(3)}${selection.value.slice(lineEnd)}`
    const shift = selection.start - lineStart >= 3 ? -3 : 0
    return { value: next, start: selection.start + shift, end: selection.end + shift }
  }
  const next = `${selection.value.slice(0, lineStart)}## ${line}${selection.value.slice(lineEnd)}`
  return { value: next, start: selection.start + 3, end: selection.end + 3 }
}

export function dashMarkdownEditToggleList(selection: DashMarkdownEditSelection): DashMarkdownEditResult {
  const collapsed = selection.end === selection.start
  const anchor = collapsed ? selection.start : selection.end - 1
  const lineStart = selection.value.lastIndexOf("\n", selection.start - 1) + 1
  const rawEnd = selection.value.indexOf("\n", collapsed ? selection.start : anchor)
  const lineEnd = rawEnd === -1 ? selection.value.length : rawEnd
  const lines = selection.value.slice(lineStart, lineEnd).split("\n")
  const listed = lines.every((line) => /^(?:- |\d+\. )/.test(line))
  const mapped = lines.map((line) => (listed ? line.replace(/^(?:- |\d+\. )/, "") : `- ${line}`)).join("\n")
  const next = selection.value.slice(0, lineStart) + mapped + selection.value.slice(lineEnd)
  return { value: next, start: lineStart, end: lineStart + mapped.length }
}

export function dashMarkdownEditWrapLink(selection: DashMarkdownEditSelection): DashMarkdownEditResult {
  const selected = selection.value.slice(selection.start, selection.end)
  if (selected) {
    const result = dashMarkdownEditReplace(selection, `[${selected}](https://)`)
    const urlStart = result.end - 9
    return { value: result.value, start: urlStart, end: urlStart }
  }
  const result = dashMarkdownEditReplace(selection, "[](https://)")
  const urlStart = result.end - 1
  return { value: result.value, start: urlStart, end: urlStart }
}
