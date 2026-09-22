export function errorPageBackNavigate(options?: {
  readonly history?: { readonly length: number; back: () => void }
  readonly location?: { assign: (url: string) => void }
  readonly fallbackHref?: string
}): void {
  const fallbackHref = options?.fallbackHref ?? "/"
  const history = options?.history ?? (typeof window !== "undefined" ? window.history : undefined)
  const location = options?.location ?? (typeof window !== "undefined" ? window.location : undefined)

  if (history && history.length > 1) {
    history.back()
    return
  }

  if (location) {
    location.assign(fallbackHref)
  }
}
