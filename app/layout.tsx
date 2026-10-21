import { Analytics } from '@vercel/analytics/next'
import type { Metadata, Viewport } from 'next'
import { Inter, Orbitron, JetBrains_Mono } from 'next/font/google'
import './globals.css'
import { AppProvider } from '@/context/app-context'
import { TelegramWebApp } from '@/components/telegram-webapp'

const inter = Inter({ variable: '--font-inter', subsets: ['latin'] })
const orbitron = Orbitron({ variable: '--font-orbitron', subsets: ['latin'] })
const jetbrains = JetBrains_Mono({
  variable: '--font-jetbrains',
  subsets: ['latin'],
})

export const metadata: Metadata = {
  title: 'Legion Game Club — Gaming Club Management',
  description:
    "O'zbekiston premium gaming klubi uchun zamonaviy boshqaruv tizimi",
  generator: 'v0.app',
}

export const viewport: Viewport = {
  colorScheme: 'dark light',
  themeColor: '#13111C',
  viewportFit: 'cover',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html
      lang="uz"
      className={`${inter.variable} ${orbitron.variable} ${jetbrains.variable} dark`}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased bg-background text-foreground">
        <AppProvider>{children}</AppProvider>
        <TelegramWebApp />
        {process.env.NODE_ENV === 'production' && <Analytics />}
      </body>
    </html>
  )
}
