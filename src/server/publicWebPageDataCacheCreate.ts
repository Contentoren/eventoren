type PublicWebPageDataResult<T> =
  | {
      readonly success: true
      readonly data: T
    }
  | {
      readonly success: false
      readonly error: {
        readonly status: number
        readonly message: string
      }
    }

export function publicWebPageDataCacheCreate<T>(input: {
  readonly query: () => Promise<PublicWebPageDataResult<T>>
  readonly ttlSeconds: number
  readonly now?: () => number
}): () => Promise<PublicWebPageDataResult<T>> {
  const now = input.now ?? Date.now
  let cached:
    | {
        readonly data: T
        readonly expiresAt: number
      }
    | undefined

  return async () => {
    const currentTime = now()
    if (input.ttlSeconds > 0 && cached !== undefined && cached.expiresAt > currentTime) {
      return { success: true, data: cached.data }
    }

    const result = await input.query()
    if (!result.success || input.ttlSeconds <= 0) return result

    cached = {
      data: result.data,
      expiresAt: currentTime + input.ttlSeconds * 1000,
    }
    return result
  }
}
