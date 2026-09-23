import { poppins } from "@/lib/fonts/admin-fonts"

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <div className={`admin-ui ${poppins.className}`}>{children}</div>
}
