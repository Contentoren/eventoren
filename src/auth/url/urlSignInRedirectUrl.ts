import { getDefaultUrlSignedIn } from "#src/auth/url/getDefaultUrlSignedIn.ts"
import { pagePathIsAuth } from "#src/auth/url/pagePathIsAuth.ts"

export function urlSignInRedirectUrl(fromPathname: string | null | undefined = location.pathname) {
  const defaultUrl = getDefaultUrlSignedIn()
  if (!fromPathname || pagePathIsAuth(fromPathname)) {
    return defaultUrl
  }
  return fromPathname
}
