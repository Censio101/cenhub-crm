/** Swap these when the real Censio Discord server is ready. */
export const DISCORD_INVITE_URL = "https://discord.gg/censio"

/** Numeric Discord server (guild) ID. Enables the official widget iframe. */
export const DISCORD_WIDGET_SERVER_ID = ""

export const DISCORD_WIDGET_THEME = "light" as const

export const DISCORD_WIDGET_URL = DISCORD_WIDGET_SERVER_ID
  ? `https://discord.com/widget?id=${DISCORD_WIDGET_SERVER_ID}&theme=${DISCORD_WIDGET_THEME}`
  : null
