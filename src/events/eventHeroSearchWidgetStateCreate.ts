import { createMemo, createSignal } from "solid-js"
import type { EventFilter } from "./EventFilter.ts"
import type { EventTimeWindow } from "./EventTimeWindow.ts"
import { eventHeroDateToday } from "./eventHeroDateToday.ts"
import { eventHeroDateTriggerLabel } from "./eventHeroDateTriggerLabel.ts"
import { eventHeroQueryCompose } from "./eventHeroQueryCompose.ts"
import { eventHeroResultsAnchorId } from "./eventHeroResultsAnchorId.ts"
import { eventHeroTabs } from "./eventHeroTabs.ts"
import { eventHeroTicketCountClamp } from "./eventHeroTicketCountClamp.ts"
import { eventHeroTicketCountLabel } from "./eventHeroTicketCountLabel.ts"
import { eventHeroTimeWindowOptions } from "./eventHeroTimeWindowOptions.ts"

export function eventHeroSearchWidgetStateCreate(inputs: {
  filter: () => EventFilter
  onFilterChange: (filter: EventFilter) => void
}) {
  const [term, setTerm] = createSignal(inputs.filter().query)
  const [city, setCity] = createSignal("")
  const [ticketCount, setTicketCount] = createSignal(1)
  const [date, setDate] = createSignal(eventHeroDateToday())
  const [discountOpen, setDiscountOpen] = createSignal(false)
  const [discountCode, setDiscountCode] = createSignal("")

  const activeTabId = createMemo(() => {
    const category = inputs.filter().category
    const match = eventHeroTabs.find((tab) => tab.category === category)

    return match?.id ?? "alle"
  })

  const activeTimeWindow = createMemo(() => inputs.filter().timeWindow)

  const ticketCountLabel = createMemo(() => eventHeroTicketCountLabel(ticketCount()))

  const dateLabel = createMemo(() => eventHeroDateTriggerLabel(date()))

  const canDecreaseTicketCount = createMemo(() => ticketCount() > 1)
  const canIncreaseTicketCount = createMemo(() => ticketCount() < 10)

  const scrollToResults = () => {
    if (typeof document === "undefined") return

    const target = document.getElementById(eventHeroResultsAnchorId)
    if (!target) return

    target.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const changeTerm = (value: string) => setTerm(value)
  const changeCity = (value: string) => setCity(value)
  const changeDate = (value: string) => setDate(value)
  const changeDiscountCode = (value: string) => setDiscountCode(value)

  const toggleDiscount = () => setDiscountOpen((current) => !current)

  const selectTab = (tabId: string) => {
    const tab = eventHeroTabs.find((candidate) => candidate.id === tabId)
    if (!tab) return

    inputs.onFilterChange({ ...inputs.filter(), category: tab.category })
  }

  const selectTimeWindow = (timeWindow: EventTimeWindow) => {
    inputs.onFilterChange({ ...inputs.filter(), timeWindow })
  }

  const decreaseTicketCount = () => setTicketCount((current) => eventHeroTicketCountClamp(current - 1))
  const increaseTicketCount = () => setTicketCount((current) => eventHeroTicketCountClamp(current + 1))

  const submitSearch = () => {
    inputs.onFilterChange({
      ...inputs.filter(),
      query: eventHeroQueryCompose({ term: term(), city: city() }),
    })
    scrollToResults()
  }

  return {
    tabs: () => eventHeroTabs,
    timeWindowOptions: () => eventHeroTimeWindowOptions,
    term,
    city,
    date,
    dateLabel,
    ticketCount,
    ticketCountLabel,
    canDecreaseTicketCount,
    canIncreaseTicketCount,
    discountOpen,
    discountCode,
    activeTabId,
    activeTimeWindow,
    changeTerm,
    changeCity,
    changeDate,
    changeDiscountCode,
    toggleDiscount,
    selectTab,
    selectTimeWindow,
    decreaseTicketCount,
    increaseTicketCount,
    submitSearch,
  }
}
