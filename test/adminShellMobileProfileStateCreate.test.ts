import { describe, expect, test } from "bun:test"
import { createRoot } from "solid-js"
import { adminShellMobileProfileStateCreate } from "../src/admin/adminShellMobileProfileStateCreate.ts"
import { createSignalObject } from "../ui/utils/createSignalObject.ts"

describe("management mobile profile navigation", () => {
  test("Profile toggles over the current route without changing its path", () => {
    createRoot((dispose) => {
      const path = createSignalObject("/admin/bestellungen")
      const profile = adminShellMobileProfileStateCreate("admin", path.get)
      try {
        expect(profile.profileVisible()).toBe(false)
        profile.profileToggle()
        expect(profile.profileVisible()).toBe(true)
        expect(path.get()).toBe("/admin/bestellungen")
        profile.profileToggle()
        expect(profile.profileVisible()).toBe(false)
      } finally {
        dispose()
      }
    })
  })

  test("Profile closes on navigation and on a menu click even when the route stays the same", () => {
    createRoot((dispose) => {
      const path = createSignalObject("/organizer")
      const profile = adminShellMobileProfileStateCreate("organizer", path.get)
      try {
        profile.profileToggle()
        profile.profileClose()
        expect(profile.profileVisible()).toBe(false)
        profile.profileToggle()
        path.set("/admin/events")
        expect(profile.profileVisible()).toBe(false)
        expect(path.get()).toBe("/admin/events")
      } finally {
        dispose()
      }
    })
  })

  test("only the organizer event-detail route delegates its footer to the three-tab event page", () => {
    createRoot((dispose) => {
      const path = createSignalObject("/organizer/event/abc")
      const organizer = adminShellMobileProfileStateCreate("organizer", path.get)
      const admin = adminShellMobileProfileStateCreate("admin", path.get)
      try {
        expect(organizer.isOrganizerEventDetail()).toBe(true)
        expect(admin.isOrganizerEventDetail()).toBe(false)
        organizer.profileToggle()
        expect(organizer.profileVisible()).toBe(false)
        path.set("/organizer/event/abc/")
        expect(organizer.isOrganizerEventDetail()).toBe(true)
        path.set("/organizer/event/abc/tickets")
        expect(organizer.isOrganizerEventDetail()).toBe(false)
        path.set("/organizer")
        expect(organizer.isOrganizerEventDetail()).toBe(false)
      } finally {
        dispose()
      }
    })
  })
})
