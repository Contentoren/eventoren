const berlinFormatter = new Intl.DateTimeFormat("de-DE", {
  dateStyle: "medium",
  timeStyle: "short",
  timeZone: "Europe/Berlin",
})

/** Pure ISO instant formatting in Europe/Berlin; null for missing/unparsable input. */
export function veranstalterOrganisationenAdminBerlinTimeFormat(iso: string | undefined): string | null {
  if (iso === undefined) return null
  const time = new Date(iso).getTime()
  if (Number.isNaN(time)) return null
  return berlinFormatter.format(new Date(time))
}
