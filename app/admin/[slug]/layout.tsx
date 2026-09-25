type LayoutProps = {
  children: React.ReactNode
}

/** Legacy client URLs redirect to `/admin/clients/[slug]/…`; avoid duplicate client chrome. */
export default function AdminClientLegacyLayout({ children }: LayoutProps) {
  return children
}
