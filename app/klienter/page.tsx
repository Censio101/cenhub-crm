import { redirect } from "next/navigation"

/** Legacy client picker — admins use the header client switcher on the dashboard. */
export default function KlienterPage() {
  redirect("/")
}
