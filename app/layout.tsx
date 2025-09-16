import './globals.css'
import type { Metadata } from 'next'
import Navbar from '@/components/navbar'
import { ToastProvider } from '@/components/toast'
import FocusBar from '@/components/focus-bar'

export const metadata: Metadata = {
  title: 'Idea Vault',
  description: 'Capture voice ideas to GitHub'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{ __html: `
            (function() {
              try {
                var theme = localStorage.getItem('theme');
                var isDark = theme ? theme === 'dark' : window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
                if (isDark) document.documentElement.classList.add('dark');
                else document.documentElement.classList.remove('dark');
              } catch (e) {}
            })();
          ` }}
        />
      </head>
      <body className="min-h-screen flex flex-col">
        <ToastProvider>
          <Navbar />
          <FocusBar />
          {children}
        </ToastProvider>
      </body>
    </html>
  )
}
