import { inter } from "@/lib/fonts/admin-fonts"

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className={`admin-ui ${inter.className}`}>{children}</div>
}
