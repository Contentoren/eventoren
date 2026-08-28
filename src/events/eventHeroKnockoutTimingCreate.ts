/** Seconds each frame stays fully visible before the next one takes over. */
const secondsPerFrame = 6

/**
 * Spreads `frameCount` layers evenly across one shared loop, so every layer
 * runs the same keyframes and only differs by its negative-free start delay.
 */
export function eventHeroKnockoutTimingCreate(frameCount: number) {
  const safeCount = frameCount > 0 ? frameCount : 1
  const duration = safeCount * secondsPerFrame

  return {
    duration: `${duration}s`,
    delayAt: (index: number) => `${index * secondsPerFrame}s`,
  }
}
