import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Webhook Project',
  description: 'A Next.js project for webhooks.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}
