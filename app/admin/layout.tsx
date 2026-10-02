import { AdminLocaleSync } from "@/components/i18n/LocaleSync"
import { LanguageProvider } from "@/components/i18n/LanguageProvider"
import { outfit } from "@/lib/fonts/app-fonts"
import { ADMIN_LOCALE_STORAGE_KEY } from "@/lib/i18n/types"
import { cn } from "cn"

export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <LanguageProvider
      storageKey={ADMIN_LOCALE_STORAGE_KEY}
      restoreDocumentLangOnUnmount
    >
      <AdminLocaleSync />
      <div className={cn("admin-ui flex min-h-full flex-1 flex-col", outfit.className)}>
        {children}
      </div>
    </LanguageProvider>
  )
}
