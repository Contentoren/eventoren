export function serverEnvironmentRead(): {
  readonly apiSecret: string | undefined
} {
  return { apiSecret: process.env.API_SECRET }
}
