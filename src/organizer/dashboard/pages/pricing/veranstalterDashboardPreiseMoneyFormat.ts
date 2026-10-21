const moneyFormat = new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" })

export function veranstalterDashboardPreiseMoneyFormat(cents: number) {
  return moneyFormat.format(cents / 100)
}
