import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
// @ts-ignore: allow side-effect import of CSS without type declarations
import './globals.css'
import { ThemeProvider } from '@/components/shared/ThemeProvider'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Placement Copilot',
  description: 'AI-Powered Placement Preparation Platform',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  )
}