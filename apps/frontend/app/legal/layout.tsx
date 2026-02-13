import type { Metadata } from "next"
import Link from "next/link"

export const metadata: Metadata = {
  title: "Legal",
  description: "Legal documents for Artist Influence",
}

export default function LegalLayout({
  children,
}: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border py-4 px-6">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <Link href="/" className="text-lg font-semibold text-primary hover:underline">
            Artist Influence
          </Link>
          <nav className="flex gap-6 text-sm text-muted-foreground">
            <Link href="/legal/eula" className="hover:text-foreground">EULA</Link>
            <Link href="/legal/privacy" className="hover:text-foreground">Privacy Policy</Link>
          </nav>
        </div>
      </header>
      <main className="max-w-3xl mx-auto py-10 px-6">{children}</main>
    </div>
  )
}
