export function convexUrlGet(): string {
  const processEnv = typeof process === "undefined" ? undefined : process.env
  return (
    import.meta.env.VITE_CONVEX_URL ??
    import.meta.env.PUBLIC_BASE_URL_CONVEX ??
    processEnv?.VITE_CONVEX_URL ??
    processEnv?.CONVEX_URL ??
    processEnv?.PUBLIC_BASE_URL_CONVEX ??
    processEnv?.CONVEX_SELF_HOSTED_URL ??
    "http://127.0.0.1:3210"
  )
}
