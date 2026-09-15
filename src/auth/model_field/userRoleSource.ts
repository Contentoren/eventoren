export const userRoleSource = {
  zitadel: "zitadel",
} as const

export type UserRoleSource = keyof typeof userRoleSource
