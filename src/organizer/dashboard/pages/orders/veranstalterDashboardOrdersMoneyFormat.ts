const formatter = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })
export function veranstalterDashboardOrdersMoneyFormat(cents: number) {
  return formatter.format(cents / 100)
}
