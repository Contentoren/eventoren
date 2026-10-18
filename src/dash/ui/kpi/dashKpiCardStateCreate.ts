export function dashKpiCardStateCreate(inputs: {
  href: () => string | undefined
  search: () => Record<string, string | number> | undefined
  delta: () => number | null | undefined
  deltaLabel: () => string | undefined
}) {
  const link = () => {
    const to = inputs.href()
    if (!to) return null
    return { to, search: inputs.search() }
  }

  const delta = () => {
    const value = inputs.delta()
    if (value === undefined || value === null) return null
    return { value, label: inputs.deltaLabel() ?? "ggü. Vorzeitraum" }
  }

  return { delta, link }
}

export type DashKpiCardState = ReturnType<typeof dashKpiCardStateCreate>
