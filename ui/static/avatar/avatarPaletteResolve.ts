const palette = [
  "bg-teal-100 text-teal-900 dark:bg-teal-950 dark:text-teal-200",
  "bg-sky-100 text-sky-900 dark:bg-sky-950 dark:text-sky-200",
  "bg-violet-100 text-violet-900 dark:bg-violet-950 dark:text-violet-200",
  "bg-rose-100 text-rose-900 dark:bg-rose-950 dark:text-rose-200",
  "bg-amber-100 text-amber-900 dark:bg-amber-950 dark:text-amber-200",
  "bg-emerald-100 text-emerald-900 dark:bg-emerald-950 dark:text-emerald-200",
  "bg-slate-200 text-slate-800 dark:bg-slate-800 dark:text-slate-200",
] as const

/** Deterministic soft color palette for a display name (stable across renders). */
export function avatarPaletteResolve(name: string): string {
  let hash = 0
  for (const char of name.trim().toLowerCase()) {
    hash = (hash * 31 + (char.codePointAt(0) ?? 0)) % 997
  }
  return palette[((hash % palette.length) + palette.length) % palette.length] ?? palette[0]
}
