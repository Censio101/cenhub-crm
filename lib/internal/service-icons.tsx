import type { CSSProperties } from "react"

type MarkProps = {
  className?: string
  style?: CSSProperties
  "aria-hidden"?: boolean | "true"
}

export function MetaMark({ className, style, ...rest }: MarkProps) {
  return (
    <svg viewBox="0 0 36 24" className={className} style={style} {...rest}>
      <path
        fill="currentColor"
        d="M8.4 1.6C4.2 1.6.8 5.4.8 12s3.4 10.4 7.6 10.4c2.6 0 4.7-1.6 6.6-4.2 1-1.4 1.8-2.8 2.2-3.8.4 1 1.2 2.4 2.2 3.8 1.9 2.6 4 4.2 6.6 4.2 4.2 0 7.6-3.8 7.6-10.4S30.2 1.6 26 1.6c-2.6 0-4.7 1.6-6.6 4.2-1 1.4-1.8 2.8-2.2 3.8-.4-1-1.2-2.4-2.2-3.8C13.1 3.2 11 1.6 8.4 1.6zm0 3.4c1.7 0 3.2 1.2 4.6 3.1.9 1.1 1.5 2.3 1.8 3.1-.3.8-1 2-1.8 3.1-1.4 1.9-2.9 3.1-4.6 3.1-2.4 0-4-2.4-4-6.2s1.6-6.2 4-6.2zm17.6 0c2.4 0 4 2.4 4 6.2s-1.6 6.2-4 6.2c-1.7 0-3.2-1.2-4.6-3.1-.9-1.1-1.5-2.3-1.8-3.1.3-.8 1-2 1.8-3.1 1.4-1.9 2.9-3.1 4.6-3.1z"
      />
    </svg>
  )
}

export function SearchGlass({ className, style, ...rest }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} style={style} {...rest}>
      <circle cx="10.2" cy="10.2" r="6.1" fill="none" stroke="currentColor" strokeWidth="2.1" />
      <path
        d="M14.8 14.8 20.4 20.4"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
      />
    </svg>
  )
}

export function GoogleMark({ className, ...rest }: MarkProps) {
  return (
    <svg viewBox="0 0 24 24" className={className} {...rest}>
      <path
        fill="#4285F4"
        d="M21.6 12.2c0-.7-.1-1.4-.2-2H12v3.8h5.4a4.6 4.6 0 0 1-2 3v2.5h3.2c1.9-1.7 3-4.3 3-7.3z"
      />
      <path
        fill="#34A853"
        d="M12 22c2.7 0 4.9-.9 6.6-2.4l-3.2-2.5c-.9.6-2 .9-3.4.9-2.6 0-4.8-1.7-5.6-4.1H3.1v2.6A10 10 0 0 0 12 22z"
      />
      <path
        fill="#FBBC05"
        d="M6.4 13.9A6 6 0 0 1 6.1 12c0-.7.1-1.3.3-1.9V7.5H3.1A10 10 0 0 0 2 12c0 1.6.4 3.1 1.1 4.5l3.3-2.6z"
      />
      <path
        fill="#EA4335"
        d="M12 5.8c1.5 0 2.8.5 3.8 1.5l2.8-2.8C16.9 2.9 14.7 2 12 2 7.6 2 3.8 4.5 3.1 7.5l3.3 2.6c.8-2.4 3-4.3 5.6-4.3z"
      />
    </svg>
  )
}
