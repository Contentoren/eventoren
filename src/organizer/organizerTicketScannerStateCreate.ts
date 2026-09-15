import { BrowserQRCodeReader, type IScannerControls } from "@zxing/browser"
import { onCleanup } from "solid-js"
import { createSignalObject } from "#ui/utils/createSignalObject.ts"
import type { OrganizerDataResult } from "./OrganizerDataResult.ts"
import type { OrganizerScannerOutcome } from "./OrganizerScannerOutcome.ts"
import type { OrganizerText } from "./OrganizerText.ts"
import type { OrganizerTicket } from "./OrganizerTicket.ts"
import { organizerScannerTonePlay } from "./organizerScannerTonePlay.ts"

const duplicateDebounceMilliseconds = 2_500
type ScannerMessageCode =
  | "action-failed"
  | "scan-success"
  | "scanner.permission-denied"
  | "scanner.unavailable"
  | "scanner.in-use"
  | "scanner.secure-context"
  | "scanner.error"
  | "organizer.check-in.duplicate"
  | "organizer.check-in.unpaid"
  | "organizer.check-in.cancelled"
  | "organizer.check-in.unauthorized"
  | "organizer.check-in.wrong-event"
  | "organizer.check-in.unknown-ticket"

type ScannerOutcomeState = {
  readonly kind: OrganizerScannerOutcome["kind"]
  readonly messageCode: ScannerMessageCode
  readonly code: string
}

export function organizerTicketScannerStateCreate(inputs: {
  readonly text: () => OrganizerText
  readonly scanCode: (code: string) => Promise<OrganizerDataResult<OrganizerTicket>>
}) {
  const videoElement = createSignalObject<HTMLVideoElement | undefined>(undefined)
  const active = createSignalObject(false)
  const starting = createSignalObject(false)
  const checkingIn = createSignalObject(false)
  const errorCode = createSignalObject<ScannerMessageCode | null>(null)
  const outcome = createSignalObject<ScannerOutcomeState | null>(null)
  let controls: IScannerControls | undefined
  let requestId = 0
  let lastCode = ""
  let lastCodeResetTimer: ReturnType<typeof setTimeout> | undefined
  let audioContext: AudioContext | undefined

  const scannerVideoSet = (element: HTMLVideoElement) => videoElement.set(element)

  const scannerTracksStop = () => {
    controls?.stop()
    controls = undefined

    const video = videoElement.get()
    if (video && typeof MediaStream !== "undefined" && video.srcObject instanceof MediaStream) {
      for (const track of video.srcObject.getTracks()) track.stop()
      video.srcObject = null
    }

    BrowserQRCodeReader.releaseAllStreams()
  }

  const scannerAudioContextStart = () => {
    if (audioContext || typeof window === "undefined" || !window.AudioContext) return
    try {
      audioContext = new window.AudioContext()
      void audioContext.resume().catch(() => undefined)
    } catch {
      audioContext = undefined
    }
  }

  const scannerAudioContextStop = () => {
    const currentAudioContext = audioContext
    audioContext = undefined
    if (currentAudioContext) void currentAudioContext.close().catch(() => undefined)
  }

  const scannerStop = () => {
    requestId += 1
    starting.set(false)
    active.set(false)
    checkingIn.set(false)
    lastCode = ""
    if (lastCodeResetTimer) clearTimeout(lastCodeResetTimer)
    lastCodeResetTimer = undefined
    scannerAudioContextStop()
    scannerTracksStop()
  }

  const scannerDebounceResetSchedule = () => {
    if (lastCodeResetTimer) clearTimeout(lastCodeResetTimer)
    lastCodeResetTimer = setTimeout(() => {
      lastCode = ""
      lastCodeResetTimer = undefined
    }, duplicateDebounceMilliseconds)
  }

  const scannerResultHandle = async (rawCode: string) => {
    const code = rawCode.trim()
    if (!code) return

    if (checkingIn.get()) {
      if (code === lastCode) scannerDebounceResetSchedule()
      return
    }

    const duplicateFrame = code === lastCode
    lastCode = code
    scannerDebounceResetSchedule()
    if (duplicateFrame) return

    const currentRequestId = requestId
    checkingIn.set(true)
    errorCode.set(null)
    outcome.set(null)

    let result: OrganizerDataResult<OrganizerTicket>
    try {
      result = await inputs.scanCode(code)
    } catch {
      result = { success: false, errorMessage: inputs.text().actionFailed }
    }
    if (currentRequestId !== requestId) return
    checkingIn.set(false)

    if (result.success) {
      outcome.set({ kind: "success", messageCode: "scan-success", code })
      organizerScannerTonePlay(true, audioContext)
      return
    }

    outcome.set({ kind: "denied", messageCode: scanErrorCode(result.errorCode), code })
    organizerScannerTonePlay(false, audioContext)
  }

  const scannerStart = async () => {
    if (active.get() || starting.get()) return

    const video = videoElement.get()
    if (!video) {
      errorCode.set("scanner.error")
      return
    }
    if (typeof window === "undefined" || !window.isSecureContext) {
      errorCode.set("scanner.secure-context")
      return
    }
    if (!navigator.mediaDevices?.getUserMedia) {
      errorCode.set("scanner.unavailable")
      return
    }

    const currentRequestId = requestId + 1
    requestId = currentRequestId
    starting.set(true)
    errorCode.set(null)
    outcome.set(null)
    scannerAudioContextStart()

    try {
      const reader = new BrowserQRCodeReader(undefined, {
        delayBetweenScanAttempts: 250,
        delayBetweenScanSuccess: 750,
      })
      const nextControls = await reader.decodeFromConstraints(
        { audio: false, video: { facingMode: { ideal: "environment" } } },
        video,
        (result) => {
          if (currentRequestId !== requestId || !result) return
          void scannerResultHandle(result.getText())
        },
      )
      if (currentRequestId !== requestId) {
        nextControls.stop()
        return
      }
      controls = nextControls
      active.set(true)
    } catch (error) {
      if (currentRequestId !== requestId) return
      active.set(false)
      scannerAudioContextStop()
      scannerTracksStop()
      errorCode.set(cameraErrorCode(error))
    } finally {
      if (currentRequestId === requestId) starting.set(false)
    }
  }

  onCleanup(scannerStop)

  const scannerPermissionDeniedSimulate = () => {
    scannerStop()
    scannerFeedbackClear()
    errorCode.set("scanner.permission-denied")
  }

  const scannerFeedbackClear = () => {
    errorCode.set(null)
    outcome.set(null)
  }

  const scannerErrorMessage = () => {
    const code = errorCode.get()
    return code ? scannerMessageText(code, inputs.text()) : ""
  }

  const scannerOutcome = (): OrganizerScannerOutcome | null => {
    const current = outcome.get()
    if (!current) return null
    return {
      kind: current.kind,
      message: scannerMessageText(current.messageCode, inputs.text()),
      code: current.code,
    }
  }

  return {
    scannerActive: active.get,
    scannerStarting: starting.get,
    scannerCheckingIn: checkingIn.get,
    scannerErrorMessage,
    scannerOutcome,
    scannerVideoSet,
    scannerStart,
    scannerStop,
    scannerCodeSimulate: scannerResultHandle,
    scannerPermissionDeniedSimulate,
    scannerFeedbackClear,
  }
}

function scanErrorCode(code: string | undefined): ScannerMessageCode {
  if (code === "organizer.check-in.duplicate") return code
  if (code === "organizer.check-in.unpaid") return code
  if (code === "organizer.check-in.cancelled") return code
  if (code === "organizer.check-in.unauthorized") return code
  if (code === "organizer.check-in.wrong-event") return code
  if (code === "organizer.check-in.unknown-ticket") return code
  return "action-failed"
}

function cameraErrorCode(error: unknown): ScannerMessageCode {
  const name = error instanceof Error ? error.name : ""
  if (name === "NotAllowedError" || name === "PermissionDeniedError" || name === "SecurityError") {
    return "scanner.permission-denied"
  }
  if (name === "NotFoundError" || name === "DevicesNotFoundError" || name === "OverconstrainedError") {
    return "scanner.unavailable"
  }
  if (name === "NotReadableError" || name === "TrackStartError") return "scanner.in-use"
  return "scanner.error"
}

function scannerMessageText(code: ScannerMessageCode, text: OrganizerText): string {
  if (code === "scan-success") return text.scanSuccess
  if (code === "scanner.permission-denied") return text.scannerPermissionDenied
  if (code === "scanner.unavailable") return text.scannerUnavailable
  if (code === "scanner.in-use") return text.scannerInUse
  if (code === "scanner.secure-context") return text.scannerSecureContext
  if (code === "scanner.error") return text.scannerError
  if (code === "organizer.check-in.duplicate") return text.duplicateTitle
  if (code === "organizer.check-in.unpaid") return text.unpaid
  if (code === "organizer.check-in.cancelled") return text.cancelled
  if (code === "organizer.check-in.unauthorized") return text.unauthorized
  if (code === "organizer.check-in.wrong-event") return text.wrongEvent
  if (code === "organizer.check-in.unknown-ticket") return text.unknownTicket
  return text.actionFailed
}
