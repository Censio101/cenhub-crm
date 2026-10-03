export const DEMO_COMPANY = {
  name: "Nordkystens Tømrer",
  image: "/company-avatar.jpg",
  logo: "/nordkystens-tomrer-logo.svg",
} as const

/** Seed / fallback for the demo workspace. Live tenants read from the active workspace. */
export const CURRENT_COMPANY = DEMO_COMPANY
