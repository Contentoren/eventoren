export function envAppleWalletEnabled(): boolean {
  const processEnv = typeof process !== "undefined" ? process.env : undefined
  const metaEnv = typeof import.meta !== "undefined" ? import.meta.env : undefined

  return Boolean(
    processEnv?.PUBLIC_APPLE_WALLET_PASS_TYPE_ID ||
      processEnv?.VITE_APPLE_WALLET_PASS_TYPE_ID ||
      metaEnv?.PUBLIC_APPLE_WALLET_PASS_TYPE_ID ||
      metaEnv?.VITE_APPLE_WALLET_PASS_TYPE_ID ||
      processEnv?.PUBLIC_APPLE_WALLET_ENABLED === "true" ||
      metaEnv?.PUBLIC_APPLE_WALLET_ENABLED === "true",
  )
}
