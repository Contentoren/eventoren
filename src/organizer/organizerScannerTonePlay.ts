export function organizerScannerTonePlay(approved: boolean, audioContext?: AudioContext): void {
  if (typeof window === "undefined") return

  const context = audioContext ?? (window.AudioContext ? new window.AudioContext() : undefined)
  if (!context) return
  const closeAfterPlay = !audioContext

  const play = () => {
    try {
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      const duration = approved ? 0.14 : 0.24
      const frequency = approved ? 880 : 220

      oscillator.type = approved ? "sine" : "square"
      oscillator.frequency.setValueAtTime(frequency, context.currentTime)
      gain.gain.setValueAtTime(0.0001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(approved ? 0.18 : 0.12, context.currentTime + 0.01)
      gain.gain.exponentialRampToValueAtTime(0.0001, context.currentTime + duration)
      oscillator.connect(gain)
      gain.connect(context.destination)
      oscillator.addEventListener("ended", () => {
        if (closeAfterPlay) void context.close()
      })
      oscillator.start()
      oscillator.stop(context.currentTime + duration)
    } catch {
      if (closeAfterPlay) void context.close()
    }
  }

  if (context.state === "running") {
    play()
    return
  }
  void context
    .resume()
    .then(play)
    .catch(() => {
      if (closeAfterPlay) void context.close()
    })
}
