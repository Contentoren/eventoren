import { createMemo, createSignal } from "solid-js"
import type { EventFaqItem } from "./EventFaqItem.ts"
import type { EventItem } from "./EventItem.ts"
import type { EventScheduleItem } from "./EventScheduleItem.ts"
import { eventExclusionsGet } from "./eventExclusionsGet.ts"
import { eventFaqsGet } from "./eventFaqsGet.ts"
import { eventHighlightsGet } from "./eventHighlightsGet.ts"
import { eventInclusionsGet } from "./eventInclusionsGet.ts"
import { eventScheduleGet } from "./eventScheduleGet.ts"

export function eventDetailInfoStateCreate(inputs: { event: () => EventItem }) {
  const [expandedHighlights, setExpandedHighlights] = createSignal<readonly number[]>([])
  const [expandedFaqIds, setExpandedFaqIds] = createSignal<readonly string[]>([])
  const [isInclusionsExpanded, setIsInclusionsExpanded] = createSignal(true)
  const [isExclusionsExpanded, setIsExclusionsExpanded] = createSignal(true)
  const [isScheduleExpanded, setIsScheduleExpanded] = createSignal(true)

  const description = createMemo(() => inputs.event().description)
  const highlights = createMemo(() => eventHighlightsGet(inputs.event()))
  const hasHighlights = createMemo(() => highlights().length > 0)
  const inclusions = createMemo<readonly string[]>(() => eventInclusionsGet(inputs.event()))
  const hasInclusions = createMemo(() => inclusions().length > 0)
  const exclusions = createMemo<readonly string[]>(() => eventExclusionsGet(inputs.event()))
  const hasExclusions = createMemo(() => exclusions().length > 0)
  const schedule = createMemo<readonly EventScheduleItem[]>(() => eventScheduleGet(inputs.event()))
  const hasSchedule = createMemo(() => schedule().length > 0)
  const faqs = createMemo<readonly EventFaqItem[]>(() => eventFaqsGet(inputs.event()))
  const hasFaqs = createMemo(() => faqs().length > 0)

  const isHighlightExpanded = (index: number) => expandedHighlights().includes(index)
  const isFaqExpanded = (id: string) => expandedFaqIds().includes(id)

  const toggleHighlight = (index: number) => {
    setExpandedHighlights((prev) => (prev.includes(index) ? prev.filter((item) => item !== index) : [...prev, index]))
  }

  const toggleFaq = (id: string) => {
    setExpandedFaqIds((prev) => (prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]))
  }

  const toggleInclusions = () => {
    setIsInclusionsExpanded((prev) => !prev)
  }

  const toggleExclusions = () => {
    setIsExclusionsExpanded((prev) => !prev)
  }

  const toggleSchedule = () => {
    setIsScheduleExpanded((prev) => !prev)
  }

  return {
    description,
    exclusions,
    faqs,
    hasExclusions,
    hasFaqs,
    hasHighlights,
    hasInclusions,
    hasSchedule,
    highlights,
    inclusions,
    isExclusionsExpanded,
    isFaqExpanded,
    isHighlightExpanded,
    isInclusionsExpanded,
    isScheduleExpanded,
    schedule,
    toggleExclusions,
    toggleFaq,
    toggleHighlight,
    toggleInclusions,
    toggleSchedule,
  }
}
