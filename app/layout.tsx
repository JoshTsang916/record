import './globals.css'
import type { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Idea Vault',
  description: 'Capture voice ideas to GitHub'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen flex flex-col">
        {children}
      </body>
    </html>
  )
}

