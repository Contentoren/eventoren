export type DashMessageRenderContext = {
  vorname: string
  event: string
  datum: string
}

/** Ersetzt {vorname}, {event} und {datum} in Texten (du sprichst). */
export function dashMessageRender(text: string, context: DashMessageRenderContext): string {
  return text
    .replaceAll("{vorname}", context.vorname)
    .replaceAll("{event}", context.event)
    .replaceAll("{datum}", context.datum)
}
