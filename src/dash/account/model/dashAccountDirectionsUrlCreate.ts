export function dashAccountDirectionsUrlCreate(): (input: {
  name: string
  street: string
  zip: string
  city: string
}) => string {
  return (input: { name: string; street: string; zip: string; city: string }): string => {
    const query = `${input.name}, ${input.street}, ${input.zip} ${input.city}`
    return `https://www.openstreetmap.org/search?query=${encodeURIComponent(query)}`
  }
}
