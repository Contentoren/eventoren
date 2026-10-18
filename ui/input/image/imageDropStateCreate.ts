import { mdiImagePlusOutline } from "@adaptive-ds/mdi/mdiImagePlusOutline.js"
import { mdiPencilOutline } from "@adaptive-ds/mdi/mdiPencilOutline.js"
import { mdiTrashCanOutline } from "@adaptive-ds/mdi/mdiTrashCanOutline.js"
import { createSignalObject } from "#ui/utils/createSignalObject.js"

const maxBytes = 10 * 1024 * 1024

export type ImageDropAspect = "square" | "16:9" | "free"

const cropSizeRead = (naturalWidth: number, naturalHeight: number, maxSize: number, aspect: ImageDropAspect) => {
  if (aspect === "free") {
    const scale = Math.min(1, maxSize / Math.max(naturalWidth, naturalHeight))
    return {
      source: { x: 0, y: 0, width: naturalWidth, height: naturalHeight },
      target: {
        width: Math.max(1, Math.round(naturalWidth * scale)),
        height: Math.max(1, Math.round(naturalHeight * scale)),
      },
    }
  }
  const targetRatio = aspect === "16:9" ? 16 / 9 : 1
  const naturalRatio = naturalWidth / naturalHeight
  let cropWidth = naturalWidth
  let cropHeight = naturalHeight
  if (naturalRatio > targetRatio) {
    cropWidth = naturalHeight * targetRatio
  } else {
    cropHeight = naturalWidth / targetRatio
  }
  const scale = maxSize / Math.max(cropWidth, cropHeight)
  return {
    source: {
      x: Math.round((naturalWidth - cropWidth) / 2),
      y: Math.round((naturalHeight - cropHeight) / 2),
      width: Math.round(cropWidth),
      height: Math.round(cropHeight),
    },
    target: {
      width: Math.max(1, Math.round(cropWidth * scale)),
      height: Math.max(1, Math.round(cropHeight * scale)),
    },
  }
}

const imageElementLoad = (objectUrl: string) =>
  new Promise<HTMLImageElement>((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error("decode"))
    image.src = objectUrl
  })

const fileToDataUrl = async (file: File, maxSize: number, aspect: ImageDropAspect) => {
  const objectUrl = URL.createObjectURL(file)
  try {
    const image = await imageElementLoad(objectUrl)
    const sizes = cropSizeRead(image.naturalWidth, image.naturalHeight, maxSize, aspect)
    const canvas = document.createElement("canvas")
    canvas.width = sizes.target.width
    canvas.height = sizes.target.height
    const context = canvas.getContext("2d")
    if (!context) throw new Error("canvas")
    context.drawImage(
      image,
      sizes.source.x,
      sizes.source.y,
      sizes.source.width,
      sizes.source.height,
      0,
      0,
      sizes.target.width,
      sizes.target.height,
    )
    const webp = canvas.toDataURL("image/webp", 0.85)
    return webp.startsWith("data:image/webp") ? webp : canvas.toDataURL("image/jpeg", 0.85)
  } finally {
    URL.revokeObjectURL(objectUrl)
  }
}

export function imageDropStateCreate(p: {
  maxSize: () => number
  aspect: () => ImageDropAspect
  onChange: (next: string | null) => void
}) {
  const dragging = createSignalObject(false)
  const error = createSignalObject<string | null>(null)
  let input: HTMLInputElement | null = null

  const processFile = async (file: File | undefined) => {
    if (!file) return
    if (!file.type.startsWith("image/")) {
      error.set("Diese Datei ist kein Bild. Bitte wähle eine JPG-, PNG-, WebP- oder GIF-Datei.")
      return
    }
    if (file.size > maxBytes) {
      error.set("Das Bild ist zu groß. Bitte wähle eine Datei unter 10 MB.")
      return
    }
    error.set(null)
    try {
      p.onChange(await fileToDataUrl(file, p.maxSize(), p.aspect()))
    } catch {
      error.set("Das Bild konnte nicht gelesen werden. Bitte versuche es mit einer anderen Datei.")
    }
  }

  return {
    dragging: dragging.get,
    error: error.get,
    dropIcon: () => mdiImagePlusOutline,
    changeIcon: () => mdiPencilOutline,
    removeIcon: () => mdiTrashCanOutline,
    openPicker: () => input?.click(),
    handleDragOver: (event: DragEvent) => {
      event.preventDefault()
      dragging.set(true)
    },
    handleDragLeave: (event: DragEvent) => {
      event.preventDefault()
      dragging.set(false)
    },
    handleDrop: (event: DragEvent) => {
      event.preventDefault()
      dragging.set(false)
      void processFile(event.dataTransfer?.files?.[0])
    },
    handleFileInput: (event: Event & { currentTarget: HTMLInputElement }) => {
      void processFile(event.currentTarget.files?.[0] ?? undefined)
      event.currentTarget.value = ""
    },
    registerInput: (element: HTMLInputElement | null) => {
      input = element
    },
  }
}
