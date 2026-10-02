const SESSION_KEY = "censio-mock-session"

const listeners = new Set<() => void>()

/** Lets React components follow the mock session (same tab and other tabs). */
export function subscribeToSession(listener: () => void) {
  listeners.add(listener)
  window.addEventListener("storage", listener)
  return () => {
    listeners.delete(listener)
    window.removeEventListener("storage", listener)
  }
}

function notify() {
  for (const listener of listeners) listener()
}

export function isSignedIn() {
  if (typeof window === "undefined") return true
  return window.localStorage.getItem(SESSION_KEY) !== "signed-out"
}

export function signOut() {
  window.localStorage.setItem(SESSION_KEY, "signed-out")
  notify()
}

export function signIn() {
  window.localStorage.removeItem(SESSION_KEY)
  notify()
}
