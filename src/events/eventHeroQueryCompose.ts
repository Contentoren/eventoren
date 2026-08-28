export function eventHeroQueryCompose(inputs: { term: string; city: string }): string {
  const term = inputs.term.trim()
  if (term.length > 0) return term

  return inputs.city.trim()
}
