export const eventorenE2eReturnUrlMatches = (baseOrigin: string, returnTarget: URL, url: URL): boolean =>
  url.origin === baseOrigin &&
  url.pathname === returnTarget.pathname &&
  url.search === returnTarget.search &&
  url.hash === returnTarget.hash
