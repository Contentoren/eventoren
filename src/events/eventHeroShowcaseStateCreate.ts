import { type Accessor, createMemo, createSignal, onCleanup, onMount, type Setter } from "solid-js"
import type { EventCategory } from "./EventCategory.ts"
import type { EventFilter } from "./EventFilter.ts"
import type { EventTimeWindow } from "./EventTimeWindow.ts"
import { eventCategoryLabels } from "./eventCategoryLabels.ts"
import { eventDateFormat } from "./eventDateFormat.ts"
import { eventListAll } from "./eventListAll.ts"
import { eventPriceFormat } from "./eventPriceFormat.ts"
import { eventPriceFrom } from "./eventPriceFrom.ts"
import { eventTimeFormat } from "./eventTimeFormat.ts"

const categoryCardDefinitions = [
  { value: "konzerte" as const, icon: "music" },
  { value: "festivals" as const, icon: "sparkles" },
  { value: "kultur" as const, icon: "masks" },
  { value: "sport" as const, icon: "trophy" },
  { value: "reisen" as const, icon: "plane" },
] as const

const reassurancePointItems = [
  {
    id: "originaltickets",
    icon: "badge-check",
    title: "Verifizierte Originaltickets",
    description: "Sicher kaufen, transparent vergleichen.",
  },
  {
    id: "wallet",
    icon: "wallet",
    title: "Direkt in deine Wallet",
    description: "Dein mobiles Ticket ist sofort verfügbar.",
  },
  {
    id: "schutz",
    icon: "shield",
    title: "Käuferschutz inklusive",
    description: "Wir sind da, wenn beim Kauf etwas nicht passt.",
  },
] as const

const spotlightBadgeLabels = ["FEATURED TOUR", "PRESALE", "LIVE 2026"] as const

const featuredSlideDefinitions = [
  {
    title: "Jorja Smith",
    subtitle: "Soul, R&B und elektronische Sounds live auf großer Bühne",
    imageUrl: "/images/concert-crowd_460af152.webp",
    imageAlt: "Publikum bei einem Konzert mit farbiger Bühnenbeleuchtung",
  },
  {
    title: "Teddy Swims",
    subtitle: "Die kraftvolle Stimme des Jahres auf Tour",
    imageUrl: "/images/stage-beams_0d113a31.webp",
    imageAlt: "Bühne mit hellen Lichtstrahlen",
  },
  {
    title: "Linkin Park",
    subtitle: "Alternative Rock und große Hymnen live erleben",
    imageUrl: "/images/festival-lights_3f89b9a5.webp",
    imageAlt: "Beleuchtete Festivalbühne bei Nacht",
  },
  {
    title: "Dua Lipa",
    subtitle: "Future-pop, Dancefloor-Hits und eine spektakuläre Show",
    imageUrl: "/images/dj-stage_ba046940.webp",
    imageAlt: "DJ-Bühne mit farbiger Lichtshow",
  },
  {
    title: "Billie Eilish",
    subtitle: "Intime Sounds und eine einzigartige Live-Inszenierung",
    imageUrl: "/images/concert-crowd_460af152.webp",
    imageAlt: "Konzertpublikum vor einer beleuchteten Bühne",
  },
  {
    title: "AnnenMayKantereit",
    subtitle: "Neue Songs und alte Hits auf großer Arenatour",
    imageUrl: "/images/stage-beams_0d113a31.webp",
    imageAlt: "Konzerthalle mit dramatischer Bühnenbeleuchtung",
  },
] as const

type SignalObject<T> = {
  get: Accessor<T>
  set: Setter<T>
}

const createSignalObject = <T>(initialValue: T): SignalObject<T> => {
  const [get, set] = createSignal(initialValue)
  return { get, set }
}

export function eventHeroShowcaseStateCreate(inputs: {
  filter: () => EventFilter
  onFilterChange: (filter: EventFilter) => void
}) {
  const allEvents = createMemo(() => eventListAll())

  const featuredHighlights = createMemo(() => allEvents().slice(0, 3))

  const slides = createMemo(() => {
    const events = allEvents()

    return featuredSlideDefinitions.flatMap((definition, index) => {
      const event = events[index]
      if (!event) return []

      return [
        {
          ...event,
          ...definition,
          dateTime: `${eventDateFormat(event.startsAt)} · ${eventTimeFormat(event.startsAt)}`,
          priceFormatted: eventPriceFormat(eventPriceFrom(event)),
          badge: spotlightBadgeLabels[index % spotlightBadgeLabels.length],
          eventLink: `/events/${event.id}`,
        },
      ]
    })
  })

  // Keep the existing name available for the current showcase view while the
  // carousel API uses the shorter `slides` name.
  const featuredSlides = slides

  const activeSlideIndex = createSignalObject(0)
  const isPlaying = createSignalObject(true)

  const nextSlide = () => {
    const slideCount = featuredSlides().length
    if (slideCount === 0) {
      activeSlideIndex.set(0)
      return
    }

    activeSlideIndex.set((current) => (current + 1) % slideCount)
  }

  const prevSlide = () => {
    const slideCount = featuredSlides().length
    if (slideCount === 0) {
      activeSlideIndex.set(0)
      return
    }

    activeSlideIndex.set((current) => (current - 1 + slideCount) % slideCount)
  }

  const goToSlide = (slideIndex: number) => {
    if (!Number.isInteger(slideIndex) || slideIndex < 0 || slideIndex >= slides().length) return

    activeSlideIndex.set(slideIndex)
  }

  const togglePlayPause = () => isPlaying.set((current) => !current)
  const pauseAutoAdvance = () => isPlaying.set(false)
  const resumeAutoAdvance = () => isPlaying.set(true)

  const currentSlide = createMemo(() => slides()[activeSlideIndex.get()])

  onMount(() => {
    const timer = window.setInterval(() => {
      if (!isPlaying.get() || slides().length < 2) return

      nextSlide()
    }, 5000)

    onCleanup(() => window.clearInterval(timer))
  })

  const categoryCards = createMemo(() =>
    categoryCardDefinitions.map((definition) => {
      const count = allEvents().filter((event) => event.category === definition.value).length

      return {
        ...definition,
        label: eventCategoryLabels[definition.value],
        count,
        isActive: inputs.filter().category === definition.value,
      }
    }),
  )

  const categoryOptions = createMemo(() => [
    { value: "alle" as const, label: "Genres" },
    ...(Object.keys(eventCategoryLabels) as EventCategory[]).map((value) => ({
      value,
      label: eventCategoryLabels[value],
    })),
  ])

  const timeWindowOptions = createMemo(() => [
    { value: "alle" as const, label: "DD.MM.YYYY – DD.MM.YYYY" },
    { value: "heute" as const, label: "Heute" },
    { value: "wochenende" as const, label: "Dieses Wochenende" },
    { value: "monat" as const, label: "Diesen Monat" },
  ])

  const reassurancePoints = createMemo(() => reassurancePointItems)

  const selectCategory = (category: EventFilter["category"]) => {
    inputs.onFilterChange({ ...inputs.filter(), category })
  }

  const selectQuery = (query: string) => {
    inputs.onFilterChange({ ...inputs.filter(), query })
  }

  const selectTimeWindow = (timeWindow: EventTimeWindow) => {
    inputs.onFilterChange({ ...inputs.filter(), timeWindow })
  }

  const submitSearch = (event?: SubmitEvent) => {
    event?.preventDefault()
    inputs.onFilterChange(inputs.filter())
  }

  return {
    featuredHighlights,
    featuredSlides,
    slides,
    activeSlideIndex: activeSlideIndex.get,
    isPlaying: isPlaying.get,
    currentSlide,
    nextSlide,
    prevSlide,
    goToSlide,
    togglePlayPause,
    pauseAutoAdvance,
    resumeAutoAdvance,
    categoryCards,
    categoryOptions,
    timeWindowOptions,
    reassurancePoints,
    selectCategory,
    selectQuery,
    selectTimeWindow,
    submitSearch,
  }
}
