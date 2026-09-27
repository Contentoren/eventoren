import { describe, expect, spyOn, test } from "bun:test"
import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser"
import { BinaryBitmap, HybridBinarizer, QRCodeReader, RGBLuminanceSource } from "@zxing/library"
import { createRoot } from "solid-js"
import { language } from "../src/app/i18n/language.ts"
import { languageSignal } from "../src/app/i18n/languageSignal.ts"
import type { OrganizerTicket } from "../src/organizer/OrganizerTicket.ts"
import { organizerTextGet } from "../src/organizer/organizerTextGet.ts"
import { organizerTicketScannerStateCreate } from "../src/organizer/organizerTicketScannerStateCreate.ts"
import { ticketQrMatrixCreate } from "../src/ticketing/ticketQrMatrixCreate.ts"

describe("organizer ticket scanner QR compatibility", () => {
  test("stops a camera session that resolves after the scanner has exited", async () => {
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
    const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator")
    Object.defineProperty(globalThis, "window", { configurable: true, value: { isSecureContext: true } })
    Object.defineProperty(globalThis, "navigator", {
      configurable: true,
      value: { mediaDevices: { getUserMedia: () => Promise.resolve({}) } },
    })

    let resolveStart: ((controls: IScannerControls) => void) | undefined
    const decode = spyOn(BrowserQRCodeReader.prototype, "decodeFromConstraints").mockImplementation(
      () => new Promise((resolve) => (resolveStart = resolve)),
    )
    let dispose: (() => void) | undefined
    let state: ReturnType<typeof organizerTicketScannerStateCreate> | undefined
    createRoot((rootDispose) => {
      dispose = rootDispose
      state = organizerTicketScannerStateCreate({
        text: () => organizerTextGet(),
        scanCode: async () => ({ success: true, data: {} as OrganizerTicket }),
      })
    })

    let stopped = false
    try {
      if (!state) throw new Error("scanner state was not created")
      const scannerState = state
      scannerState.scannerVideoSet({ srcObject: null } as HTMLVideoElement)
      const pendingStart = scannerState.scannerStart()
      expect(scannerState.scannerStarting()).toBe(true)
      scannerState.scannerStop()
      resolveStart?.({ stop: () => (stopped = true) } as IScannerControls)
      await pendingStart
      expect(stopped).toBe(true)
      expect(scannerState.scannerActive()).toBe(false)
      expect(scannerState.scannerStarting()).toBe(false)
    } finally {
      dispose?.()
      decode.mockRestore()
      if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow)
      else Reflect.deleteProperty(globalThis, "window")
      if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator)
      else Reflect.deleteProperty(globalThis, "navigator")
    }
  })

  test("opens the camera panel, starts the camera automatically, and closes it again", async () => {
    let dispose: (() => void) | undefined
    let state: ReturnType<typeof organizerTicketScannerStateCreate> | undefined

    createRoot((rootDispose) => {
      dispose = rootDispose
      state = organizerTicketScannerStateCreate({
        text: () => organizerTextGet(),
        scanCode: async () => ({ success: true, data: {} as OrganizerTicket }),
      })
    })

    try {
      if (!state) throw new Error("scanner state was not created")
      expect(state.scannerOpen()).toBe(false)
      state.scannerVideoSet({} as HTMLVideoElement)
      state.scannerToggle()
      expect(state.scannerOpen()).toBe(true)
      await new Promise<void>((resolve) => queueMicrotask(resolve))
      expect(state.scannerErrorMessage()).toBe(organizerTextGet().scannerSecureContext)
      state.scannerToggle()
      expect(state.scannerOpen()).toBe(false)
      expect(state.scannerActive()).toBe(false)
    } finally {
      dispose?.()
    }
  })

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

  test("keeps simulated camera errors and scan outcomes in German", async () => {
    const previousWindow = Object.getOwnPropertyDescriptor(globalThis, "window")
    const previousNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator")
    languageSignal.set(language.de)
    let dispose: (() => void) | undefined
    let state: ReturnType<typeof organizerTicketScannerStateCreate> | undefined
    let scanSuccess = true

    createRoot((rootDispose) => {
      dispose = rootDispose
      state = organizerTicketScannerStateCreate({
        text: () => organizerTextGet(),
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
      expect(state.scannerErrorMessage()).toBe(organizerTextGet().scannerPermissionDenied)
      expect(state.scannerErrorMessage(true)).toBe(
        "Kamerazugriff verweigert. Erlaube ihn in den Browsereinstellungen und öffne Scanner erneut.",
      )

      const unavailableNavigator = Object.getOwnPropertyDescriptor(globalThis, "navigator")
      Object.defineProperty(globalThis, "window", { configurable: true, value: { isSecureContext: true } })
      Object.defineProperty(globalThis, "navigator", { configurable: true, value: { mediaDevices: {} } })
      state.scannerVideoSet({} as HTMLVideoElement)
      state.scannerFeedbackClear()
      await state.scannerStart()
      expect(state.scannerErrorMessage(true)).toBe("Keine passende Kamera gefunden.")
      expect(state.scannerErrorMessage()).toBe(organizerTextGet().scannerUnavailable)
      if (unavailableNavigator) Object.defineProperty(globalThis, "navigator", unavailableNavigator)
      else Reflect.deleteProperty(globalThis, "navigator")

      const decode = spyOn(BrowserQRCodeReader.prototype, "decodeFromConstraints").mockRejectedValue(
        new Error("camera startup failed"),
      )
      Object.defineProperty(globalThis, "navigator", {
        configurable: true,
        value: { mediaDevices: { getUserMedia: () => Promise.resolve({}) } },
      })
      state.scannerVideoSet({} as HTMLVideoElement)
      await state.scannerStart()
      expect(state.scannerErrorMessage(true)).toBe(
        "Kamera konnte nicht gestartet werden. Öffne Scanner erneut, um es noch einmal zu versuchen.",
      )
      expect(state.scannerErrorMessage()).toBe(organizerTextGet().scannerError)
      decode.mockRestore()

      languageSignal.set(language.en)
      state.scannerPermissionDeniedSimulate()
      expect(state.scannerErrorMessage()).toBe(organizerTextGet().scannerPermissionDenied)

      await state.scannerCodeSimulate("TKT-demo")
      expect(state.scannerErrorMessage()).toBe("")
      expect(state.scannerOutcome()?.message).toBe(organizerTextGet().scanSuccess)

      languageSignal.set(language.de)
      expect(state.scannerOutcome()?.message).toBe(organizerTextGet().scanSuccess)

      scanSuccess = false
      await state.scannerCodeSimulate("TKT-demo-duplicate")
      expect(state.scannerOutcome()?.message).toBe(organizerTextGet().duplicateTitle)

      languageSignal.set(language.en)
      expect(state.scannerOutcome()?.message).toBe(organizerTextGet().duplicateTitle)
    } finally {
      dispose?.()
      languageSignal.set(language.en)
      if (previousWindow) Object.defineProperty(globalThis, "window", previousWindow)
      else Reflect.deleteProperty(globalThis, "window")
      if (previousNavigator) Object.defineProperty(globalThis, "navigator", previousNavigator)
      else Reflect.deleteProperty(globalThis, "navigator")
    }
  })

  test("clears the pending state when scan confirmation rejects", async () => {
    let dispose: (() => void) | undefined
    let state: ReturnType<typeof organizerTicketScannerStateCreate> | undefined

    createRoot((rootDispose) => {
      dispose = rootDispose
      state = organizerTicketScannerStateCreate({
        text: () => organizerTextGet(),
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
      expect(state.scannerOutcome()?.message).toBe(organizerTextGet().actionFailed)
    } finally {
      dispose?.()
    }
  })
})
