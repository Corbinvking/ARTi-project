import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Campaign Analytics - Artist Influence",
  description: "View campaign analytics and performance metrics",
}

export default function ShareLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

