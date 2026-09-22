export function errorPageRefreshExecute(options?: { readonly location?: { reload: () => void } }): void {
  const location = options?.location ?? (typeof window !== "undefined" ? window.location : undefined)
  if (!location) {
    return
  }

  location.reload()
}
