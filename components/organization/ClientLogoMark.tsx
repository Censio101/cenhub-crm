import Image from "next/image"

/** Client mark is 176×40. Height is set; width follows that ratio. */
export const clientLogoClassName =
  "h-10 w-[calc(2.5rem*176/40)] max-w-none shrink-0 object-contain aspect-[176/40] sm:h-12 sm:w-[calc(3rem*176/40)]"

export function ClientLogoMark({
  src,
  alt,
  className = clientLogoClassName,
}: {
  src: string
  alt: string
  className?: string
}) {
  if (src.startsWith("data:") || src.startsWith("blob:") || src.startsWith("http")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={src} alt={alt} className={className} />
  }

  return (
    <Image
      src={src}
      alt={alt}
      width={176}
      height={40}
      className={className}
      priority
      unoptimized
    />
  )
}
