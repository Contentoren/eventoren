export type PageName = keyof typeof pageName

export const pageName = {
  home: "home",
  overview: "overview",
} as const

export const pagePath = {
  home: "/",
  overview: "/overview",
} as const satisfies Record<PageName, string>
