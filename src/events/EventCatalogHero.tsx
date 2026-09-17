import { For } from "solid-js"
import { UiContainer } from "../ui/UiContainer.tsx"
import { eventCatalogHeroStateCreate } from "./eventCatalogHeroStateCreate.ts"

export function EventCatalogHero() {
  const state = eventCatalogHeroStateCreate()

  return (
    <section class="relative isolate overflow-hidden border-b border-border-subtle bg-slate-100 text-content">
      {/* Warm up background images in browser cache */}
      <div class="hidden">
        <For each={state.images}>{(image) => <img src={image.src} alt="" aria-hidden="true" decoding="async" />}</For>
      </div>

      {/* Atmospheric ambient glows */}
      <div
        aria-hidden="true"
        class="pointer-events-none absolute -top-28 left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle_at_center,rgba(45,212,191,0.25)_0%,transparent_70%)] blur-3xl"
      />
      <div
        aria-hidden="true"
        class="pointer-events-none absolute bottom-0 right-1/4 h-[320px] w-[500px] rounded-full bg-[radial-gradient(circle_at_center,rgba(129,140,248,0.2)_0%,transparent_70%)] blur-3xl"
      />

      <UiContainer class="relative flex flex-col items-center justify-center py-16 text-center sm:py-24">
        {/* Large transparent wordmark revealing rotating images */}
        <h1 class="relative w-full max-w-5xl select-none font-black leading-none tracking-tight uppercase">
          <span class="sr-only">Eventoren – Besondere Erlebnisse. Direkt dein Ticket.</span>

          <span class="relative block text-[clamp(3.5rem,11vw,9.5rem)] [font-stretch:condensed]">
            {/* Sizing base */}
            <span class="invisible block" aria-hidden="true">
              EVENTOREN
            </span>

            {/* Gradient fallback layer */}
            <span
              aria-hidden="true"
              class="absolute inset-0 block bg-gradient-to-r from-teal-400 via-indigo-300 to-rose-400 bg-clip-text text-transparent opacity-35 [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]"
            >
              EVENTOREN
            </span>

            {/* Cycling image layers clipped to text */}
            <For each={state.images}>
              {(image, index) => (
                <span
                  aria-hidden="true"
                  class="absolute inset-0 block bg-cover bg-center bg-clip-text text-transparent transition-opacity duration-1000 ease-in-out will-change-[opacity] [-webkit-background-clip:text] [-webkit-text-fill-color:transparent]"
                  style={{
                    "background-image": `url(${image.src})`,
                    opacity: state.activeImageIndex() === index() ? "1" : "0",
                  }}
                >
                  EVENTOREN
                </span>
              )}
            </For>
          </span>
        </h1>

        <p class="mt-6 text-xl font-bold tracking-tight text-content sm:text-2xl lg:text-3xl">
          Besondere Erlebnisse. Direkt dein Ticket.
        </p>
        <p class="mt-2 max-w-2xl text-sm leading-relaxed text-content-muted sm:text-base">
          Entdecke veröffentlichte Events und sichere dir Tickets mit transparenten Preisen und digitaler Zustellung.
        </p>
      </UiContainer>
    </section>
  )
}
