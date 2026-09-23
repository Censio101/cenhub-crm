import type { Area } from "react-easy-crop"

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.addEventListener("load", () => resolve(image))
    image.addEventListener("error", () => reject(new Error("Image could not be loaded")))
    image.src = src
  })
}

export async function cropImageToDataUrl(
  imageSrc: string,
  crop: Area,
  outputSize = 512
): Promise<string> {
  const image = await loadImage(imageSrc)
  const canvas = document.createElement("canvas")
  const context = canvas.getContext("2d")

  if (!context) {
    throw new Error("Could not prepare image crop")
  }

  canvas.width = outputSize
  canvas.height = outputSize

  context.drawImage(
    image,
    crop.x,
    crop.y,
    crop.width,
    crop.height,
    0,
    0,
    outputSize,
    outputSize
  )

  const dataUrl = canvas.toDataURL("image/jpeg", 0.92)
  if (!dataUrl.startsWith("data:image/")) {
    throw new Error("Could not export cropped image")
  }

  return dataUrl
}
