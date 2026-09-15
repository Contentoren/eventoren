const logoutMarkerCookieName = "eventoren-logout"

export const eventorenLogoutMarkerCookie = {
  name: logoutMarkerCookieName,

  create(secure: boolean): string {
    const attributes = [`${logoutMarkerCookieName}=1`, "Path=/", "SameSite=Lax", "Max-Age=10"]
    if (secure) attributes.push("Secure")
    return attributes.join("; ")
  },

  clear(secure: boolean): string {
    const attributes = [`${logoutMarkerCookieName}=`, "Path=/", "SameSite=Lax", "Max-Age=0"]
    if (secure) attributes.push("Secure")
    return attributes.join("; ")
  },
} as const
