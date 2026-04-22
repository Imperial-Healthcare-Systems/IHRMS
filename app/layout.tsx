import type { Metadata } from 'next'
import './globals.css'
import { SessionProvider } from '@/components/layout/SessionProvider'
import { ToastProvider } from '@/components/ui/Toast'

export const metadata: Metadata = {
  title: 'IHRMS — Imperial Healthcare Systems',
  description: 'Complete Hire-to-Retire HR Management System for Imperial Healthcare Systems',
  icons: { icon: '/favicon.ico' },
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SessionProvider>
          <ToastProvider>
            {children}
          </ToastProvider>
        </SessionProvider>
      </body>
    </html>
  )
}
