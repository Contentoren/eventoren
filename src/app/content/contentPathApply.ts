export function contentPathApply(path: string, prefix?: string): string {
  if (
    !prefix ||
    path.startsWith("#") ||
    path.startsWith("http") ||
    path.startsWith("mailto:") ||
    path.startsWith("tel:")
  ) {
    return path
  }
  if (path === "/") return prefix
  return `${prefix}${path}`
}
