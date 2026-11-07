import { language, languageDefault } from "./language.ts"

/** Document language for a pathname: `en` for `/en` and `/en/...` (English guides), German everywhere else. */
export function rootDocumentLanguageFromPath(pathname: string): typeof language.de | typeof language.en {
  if (pathname === "/en" || pathname.startsWith("/en/")) return language.en
  return languageDefault
}
