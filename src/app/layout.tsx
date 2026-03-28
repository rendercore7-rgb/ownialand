import type { Metadata } from 'next'
import { Syne, DM_Sans } from 'next/font/google'
import './globals.css'

const syne = Syne({
  variable: '--font-display',
  subsets: ['latin'],
  display: 'swap',
})

const dmSans = DM_Sans({
  variable: '--font-sans',
  subsets: ['latin'],
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'OWNIA LAND',
  description: 'OWNIA LAND Investment Platform',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="ko" className={`${syne.variable} ${dmSans.variable}`}>
      <body className="min-h-dvh antialiased">{children}</body>
    </html>
  )
}
