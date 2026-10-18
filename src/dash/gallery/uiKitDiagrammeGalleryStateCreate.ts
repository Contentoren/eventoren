import {
  uiKitDiagrammeAxisFormat,
  uiKitDiagrammeCheckins,
  uiKitDiagrammeCountFormat,
  uiKitDiagrammeDonut,
  uiKitDiagrammeEuroFormat,
  uiKitDiagrammeRevenue30,
  uiKitDiagrammeRevenue7,
  uiKitDiagrammeSpark30,
  uiKitDiagrammeSparkAverage,
  uiKitDiagrammeSparkOrders,
  uiKitDiagrammeSparkTickets,
} from "./uiKitDiagrammeGallerySectionsCreate.ts"

/** Local demo data for the chart gallery: deterministic series, no store. */
export function uiKitDiagrammeGalleryStateCreate() {
  const revenue30 = uiKitDiagrammeRevenue30()
  const revenue7 = uiKitDiagrammeRevenue7()
  const checkins = uiKitDiagrammeCheckins()
  const donut = uiKitDiagrammeDonut()

  return {
    revenue30,
    revenue7,
    checkins,
    donut,
    sparkRevenue: uiKitDiagrammeSpark30(),
    sparkTickets: uiKitDiagrammeSparkTickets(),
    sparkOrders: uiKitDiagrammeSparkOrders(),
    sparkAverage: uiKitDiagrammeSparkAverage(),
    euroFormat: uiKitDiagrammeEuroFormat,
    axisFormat: uiKitDiagrammeAxisFormat,
    countFormat: uiKitDiagrammeCountFormat,
  }
}

export type UiKitDiagrammeGalleryState = ReturnType<typeof uiKitDiagrammeGalleryStateCreate>
