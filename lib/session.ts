const SESSION_KEY = "censio-mock-session"

export function isSignedIn() {
  if (typeof window === "undefined") return true
  return window.localStorage.getItem(SESSION_KEY) !== "signed-out"
}

export function signOut() {
  window.localStorage.setItem(SESSION_KEY, "signed-out")
}

export function signIn() {
  window.localStorage.removeItem(SESSION_KEY)
}
