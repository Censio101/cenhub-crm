import { LanguageProvider } from "@/components/i18n/LanguageProvider"

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return <LanguageProvider>{children}</LanguageProvider>
}
