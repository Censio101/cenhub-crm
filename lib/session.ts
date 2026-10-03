const SESSION_KEY = "censio-mock-session"

export function isSignedIn() {
  if (typeof window === "undefined") return false
  return window.localStorage.getItem(SESSION_KEY) !== "signed-out"
}

export function signOut() {
  if (typeof window === "undefined") return
  window.localStorage.setItem(SESSION_KEY, "signed-out")
}

export function signIn() {
  if (typeof window === "undefined") return
  window.localStorage.removeItem(SESSION_KEY)
}

/** Afslutter server-session og sender brugeren til login (ingen client-cache). */
export async function logoutToLogin() {
  await fetch("/api/auth/logout", {
    method: "POST",
    credentials: "same-origin",
    cache: "no-store",
  })
  signOut()
  window.location.assign("/login")
}
