import { createMemo, createSignal } from "solid-js"
import type { EventFaqItem } from "./EventFaqItem.ts"
import type { EventHighlightDetail } from "./EventHighlightDetail.ts"
import type { EventItem } from "./EventItem.ts"
import type { EventScheduleItem } from "./EventScheduleItem.ts"
import { eventExclusionsGet } from "./eventExclusionsGet.ts"
import { eventFaqsGet } from "./eventFaqsGet.ts"
import { eventHighlightDetailByTag } from "./eventHighlightDetailByTag.ts"
import { eventInclusionsGet } from "./eventInclusionsGet.ts"
import { eventScheduleGet } from "./eventScheduleGet.ts"

export function eventDetailInfoStateCreate(inputs: { event: () => EventItem }) {
  const [expandedTags, setExpandedTags] = createSignal<readonly string[]>([])
  const [expandedFaqIds, setExpandedFaqIds] = createSignal<readonly string[]>([])
  const [isInclusionsExpanded, setIsInclusionsExpanded] = createSignal(true)
  const [isExclusionsExpanded, setIsExclusionsExpanded] = createSignal(true)
  const [isScheduleExpanded, setIsScheduleExpanded] = createSignal(true)

  const description = createMemo(() => inputs.event().description)
  const hasHighlights = createMemo(() => inputs.event().tags.length > 0)
  const highlights = createMemo<readonly EventHighlightDetail[]>(() =>
    inputs.event().tags.map((tag) => eventHighlightDetailByTag(tag)),
  )
  const inclusions = createMemo<readonly string[]>(() => eventInclusionsGet(inputs.event()))
  const hasInclusions = createMemo(() => inclusions().length > 0)
  const exclusions = createMemo<readonly string[]>(() => eventExclusionsGet(inputs.event()))
  const hasExclusions = createMemo(() => exclusions().length > 0)
  const schedule = createMemo<readonly EventScheduleItem[]>(() => eventScheduleGet(inputs.event()))
  const hasSchedule = createMemo(() => schedule().length > 0)
  const faqs = createMemo<readonly EventFaqItem[]>(() => eventFaqsGet(inputs.event()))
  const hasFaqs = createMemo(() => faqs().length > 0)

  const isHighlightExpanded = (tag: string) => expandedTags().includes(tag)
  const isFaqExpanded = (id: string) => expandedFaqIds().includes(id)

  const toggleHighlight = (tag: string) => {
    setExpandedTags((prev) => (prev.includes(tag) ? prev.filter((item) => item !== tag) : [...prev, tag]))
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
