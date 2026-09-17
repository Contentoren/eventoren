import { createSignal, onCleanup, onMount } from "solid-js"
import { eventHeroImages } from "./eventHeroImages.ts"

const intervalMilliseconds = 4000

export function eventCatalogHeroStateCreate() {
  const [activeImageIndex, setActiveImageIndex] = createSignal(0)

  onMount(() => {
    const timer = setInterval(() => {
      setActiveImageIndex((current) => (current + 1) % eventHeroImages.length)
    }, intervalMilliseconds)

    onCleanup(() => {
      clearInterval(timer)
    })
  })

  return {
    activeImageIndex,
    images: eventHeroImages,
  }
}
