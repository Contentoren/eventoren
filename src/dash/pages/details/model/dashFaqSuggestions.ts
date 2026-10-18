export interface DashFaqSuggestion {
  label: string
  question: string
  answer: string
}

/** Vorgefertigte FAQ-Vorschläge in du-Form, die du per Klick als Frage übernehmen kannst. */
export function dashFaqSuggestions(): DashFaqSuggestion[] {
  return [
    {
      label: "Parken",
      question: "Gibt es Parkplätze?",
      answer:
        "Ja, direkt am Haus stehen kostenlose Parkplätze für dich bereit. Komm am besten etwas früher, damit du entspannt ankommst.",
    },
    {
      label: "Garderobe",
      question: "Gibt es eine Garderobe?",
      answer: "Ja, du kannst deine Jacke und deine Tasche an unserer Garderobe abgeben.",
    },
    {
      label: "Mindestalter",
      question: "Gibt es ein Mindestalter?",
      answer:
        "Nein, es gibt kein Mindestalter. Bring Kinder unter 14 Jahren bitte in Begleitung einer erwachsenen Person mit.",
    },
    {
      label: "Barrierefreiheit",
      question: "Ist die Veranstaltung barrierefrei?",
      answer:
        "Ja, alle Bereiche sind stufenlos erreichbar. Melde dich gern vorab bei uns, wenn du Unterstützung brauchst.",
    },
    {
      label: "Abendkasse",
      question: "Gibt es Tickets an der Abendkasse?",
      answer: "Solange die Veranstaltung nicht ausverkauft ist, bekommst du Tickets auch an der Abendkasse.",
    },
  ]
}
