const wordsPerMinute = 200

/** Reading time in whole minutes: words / 200, rounded up, at least 1. */
export function contentReadingMinutes(wordCount: number): number {
  return Math.max(1, Math.ceil(wordCount / wordsPerMinute))
}
