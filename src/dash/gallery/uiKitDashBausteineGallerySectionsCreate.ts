export function uiKitDashBausteineGallerySectionsCreate() {
  return {
    sparkRevenue: [12, 18, 15, 24, 22, 31, 28, 36, 42, 39, 48, 55],
    sparkTickets: [8, 12, 11, 16, 19, 17, 24, 29, 27, 33, 38, 44],
    sparkOrders: [5, 7, 9, 8, 12, 14, 13, 17, 19, 22, 24, 28],
    kpiMeta: [
      { label: "Umsatz" },
      { label: "Verkaufte Tickets" },
      { label: "Bestellungen" },
      { label: "Ø Bestellwert" },
    ],
    demoRows: Array.from({ length: 20 }, (_, index) => ({
      name: `Gast ${String(index + 1).padStart(2, "0")}`,
      art: index % 3 === 0 ? "Ermäßigt" : "Stehplatz",
      betrag: index % 3 === 0 ? 18 : 25,
      code: `T-${String(1000 + index)}`,
    })),
  }
}
