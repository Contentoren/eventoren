export function envGoogleWalletEnabled(): boolean {
  const processEnv = typeof process !== "undefined" ? process.env : undefined
  const metaEnv = typeof import.meta !== "undefined" ? import.meta.env : undefined

  return Boolean(
    processEnv?.PUBLIC_GOOGLE_WALLET_ISSUER_ID ||
      processEnv?.VITE_GOOGLE_WALLET_ISSUER_ID ||
      metaEnv?.PUBLIC_GOOGLE_WALLET_ISSUER_ID ||
      metaEnv?.VITE_GOOGLE_WALLET_ISSUER_ID ||
      processEnv?.PUBLIC_GOOGLE_WALLET_ENABLED === "true" ||
      metaEnv?.PUBLIC_GOOGLE_WALLET_ENABLED === "true",
  )
}
