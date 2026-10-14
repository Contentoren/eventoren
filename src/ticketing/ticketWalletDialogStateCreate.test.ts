import { describe, expect, it, mock } from "bun:test"
import { ticketWalletDialogStateCreate } from "./ticketWalletDialogStateCreate.ts"

describe("ticketWalletDialogStateCreate", () => {
  it("determines open state based on non-null walletType", () => {
    const closedNullState = ticketWalletDialogStateCreate({
      walletType: () => null,
      onClose: () => {},
      ticket: () => null,
      eventTitle: () => "Test Event",
    })
    expect(closedNullState.isOpen()).toBe(false)

    const closedUndefinedState = ticketWalletDialogStateCreate({
      walletType: () => undefined,
      onClose: () => {},
      ticket: () => null,
      eventTitle: () => "Test Event",
    })
    expect(closedUndefinedState.isOpen()).toBe(false)

    const openAppleState = ticketWalletDialogStateCreate({
      walletType: () => "apple",
      onClose: () => {},
      ticket: () => null,
      eventTitle: () => "Test Event",
    })
    expect(openAppleState.isOpen()).toBe(true)

    const openGoogleState = ticketWalletDialogStateCreate({
      walletType: () => "google",
      onClose: () => {},
      ticket: () => null,
      eventTitle: () => "Test Event",
    })
    expect(openGoogleState.isOpen()).toBe(true)
  })

  it("derives walletName, isApple, and isGoogle correctly for Apple Wallet", () => {
    const state = ticketWalletDialogStateCreate({
      walletType: () => "apple",
      onClose: () => {},
      ticket: () => null,
      eventTitle: () => "Festival 2026",
    })

    expect(state.walletName()).toBe("Apple Wallet")
    expect(state.dialogTitle()).toBe("Zu Apple Wallet hinzufügen")
    expect(state.isApple()).toBe(true)
    expect(state.isGoogle()).toBe(false)
  })

  it("derives walletName, isApple, and isGoogle correctly for Google Wallet", () => {
    const state = ticketWalletDialogStateCreate({
      walletType: () => "google",
      onClose: () => {},
      ticket: () => null,
      eventTitle: () => "Festival 2026",
    })

    expect(state.walletName()).toBe("Google Wallet")
    expect(state.dialogTitle()).toBe("Zu Google Wallet hinzufügen")
    expect(state.isApple()).toBe(false)
    expect(state.isGoogle()).toBe(true)
  })

  it("provides fallback walletName when walletType is null or unknown", () => {
    const state = ticketWalletDialogStateCreate({
      walletType: () => null,
      onClose: () => {},
      ticket: () => null,
      eventTitle: () => "Festival 2026",
    })

    expect(state.walletName()).toBe("Wallet")
    expect(state.isApple()).toBe(false)
    expect(state.isGoogle()).toBe(false)
  })

  it("resolves ticket details and event title from accessors", () => {
    const state = ticketWalletDialogStateCreate({
      walletType: () => "apple",
      onClose: () => {},
      ticket: () => ({
        id: "ticket-1",
        code: "TICK-12345",
        title: "VIP Ticket · Phase 1",
        participantName: "Max Mustermann",
      }),
      eventTitle: () => "Sommerfestival 2026",
    })

    expect(state.ticketCode()).toBe("TICK-12345")
    expect(state.participantName()).toBe("Max Mustermann")
    expect(state.ticketTitle()).toBe("VIP Ticket · Phase 1")
    expect(state.eventTitle()).toBe("Sommerfestival 2026")
  })

  it("safely falls back to empty strings when ticket or fields are missing", () => {
    const state = ticketWalletDialogStateCreate({
      walletType: () => "apple",
      onClose: () => {},
      ticket: () => null,
      eventTitle: () => "",
    })

    expect(state.ticketCode()).toBe("")
    expect(state.participantName()).toBe("")
    expect(state.ticketTitle()).toBe("")
    expect(state.eventTitle()).toBe("")
  })

  it("delegates handleClose to onClose callback", () => {
    const onClose = mock(() => {})
    const state = ticketWalletDialogStateCreate({
      walletType: () => "apple",
      onClose,
      ticket: () => null,
      eventTitle: () => "Event",
    })

    expect(onClose).not.toHaveBeenCalled()
    state.handleClose()
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
