import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import { AppNav } from '@/components/layout/AppNav'
import { Toaster } from 'react-hot-toast'

const inter = Inter({ variable: '--font-geist-sans', subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'MistyOak',
  description: 'Systém pro správu zakázkové výroby nábytku',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="cs">
      <body className={inter.variable}>
        <div className="flex flex-col min-h-screen">
          <AppNav />
          <main className="flex-1 pb-20 md:pb-0">{children}</main>
        </div>
        <Toaster position="top-right" />
      </body>
    </html>
  )
}