import { describe, expect, test } from "bun:test"
import { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from "@zxing/library"
import { createRoot } from "solid-js"
import { language } from "../src/app/i18n/language.ts"
import { languageSignal } from "../src/app/i18n/languageSignal.ts"
import type { OrganizerTicket } from "../src/organizer/OrganizerTicket.ts"
import { organizerTextGet } from "../src/organizer/organizerTextGet.ts"
import { organizerTicketScannerStateCreate } from "../src/organizer/organizerTicketScannerStateCreate.ts"
import { ticketQrMatrixCreate } from "../src/ticketing/ticketQrMatrixCreate.ts"

describe("organizer ticket scanner QR compatibility", () => {
  test("decodes the issued ticket code generated for a wallet pass", () => {
    const code = "TKT-0123456789ABCDEF0123"
    const generated = ticketQrMatrixCreate(code)

    expect(generated.success).toBe(true)
    if (!generated.success) return

    const border = 4
    const scale = 6
    const size = (generated.data.length + border * 2) * scale
    const luminances = new Uint8ClampedArray(size * size)

    for (let y = 0; y < size; y++) {
      for (let x = 0; x < size; x++) {
        const moduleX = Math.floor(x / scale) - border
        const moduleY = Math.floor(y / scale) - border
        const dark =
          moduleX >= 0 &&
          moduleY >= 0 &&
          moduleX < generated.data.length &&
          moduleY < generated.data.length &&
          generated.data[moduleY]?.[moduleX]
        luminances[y * size + x] = dark ? 0 : 255
      }
    }

    const source = new RGBLuminanceSource(luminances, size, size)
    const decoded = new QRCodeReader().decode(new BinaryBitmap(new HybridBinarizer(source)))

    expect(decoded.getText()).toBe(code)
  })

  test("localizes simulated camera errors and scan outcomes after a language switch", async () => {
    languageSignal.set(language.de)
    let dispose: (() => void) | undefined
    let state: ReturnType<typeof organizerTicketScannerStateCreate> | undefined
    let scanSuccess = true

    createRoot((rootDispose) => {
      dispose = rootDispose
      state = organizerTicketScannerStateCreate({
        text: () => organizerTextGet(languageSignal.get()),
        scanCode: async () => {
          if (scanSuccess) return { success: true, data: {} as OrganizerTicket }
          return {
            success: false,
            errorMessage: "duplicate",
            errorCode: "organizer.check-in.duplicate",
          }
        },
      })
    })

    try {
      if (!state) throw new Error("scanner state was not created")
      state.scannerPermissionDeniedSimulate()
      expect(state.scannerErrorMessage()).toBe(organizerTextGet(language.de).scannerPermissionDenied)

      languageSignal.set(language.en)
      expect(state.scannerErrorMessage()).toBe(organizerTextGet(language.en).scannerPermissionDenied)

      await state.scannerCodeSimulate("TKT-demo")
      expect(state.scannerErrorMessage()).toBe("")
      expect(state.scannerOutcome()?.message).toBe(organizerTextGet(language.en).scanSuccess)

      languageSignal.set(language.de)
      expect(state.scannerOutcome()?.message).toBe(organizerTextGet(language.de).scanSuccess)

      scanSuccess = false
      await state.scannerCodeSimulate("TKT-demo-duplicate")
      expect(state.scannerOutcome()?.message).toBe(organizerTextGet(language.de).duplicateTitle)

      languageSignal.set(language.en)
      expect(state.scannerOutcome()?.message).toBe(organizerTextGet(language.en).duplicateTitle)
    } finally {
      dispose?.()
      languageSignal.set(language.en)
    }
  })

  test("clears the pending state when scan confirmation rejects", async () => {
    let dispose: (() => void) | undefined
    let state: ReturnType<typeof organizerTicketScannerStateCreate> | undefined

    createRoot((rootDispose) => {
      dispose = rootDispose
      state = organizerTicketScannerStateCreate({
        text: () => organizerTextGet(languageSignal.get()),
        scanCode: async () => {
          throw new Error("backend unavailable")
        },
      })
    })

    try {
      if (!state) throw new Error("scanner state was not created")
      await state.scannerCodeSimulate("TKT-rejected")
      expect(state.scannerCheckingIn()).toBe(false)
      expect(state.scannerErrorMessage()).toBe("")
      expect(state.scannerOutcome()?.kind).toBe("denied")
      expect(state.scannerOutcome()?.message).toBe(organizerTextGet(language.en).actionFailed)
    } finally {
      dispose?.()
    }
  })
})
