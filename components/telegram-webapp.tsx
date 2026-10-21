'use client'

import Script from 'next/script'

type TelegramWebApp = {
  ready: () => void
  expand: () => void
  setHeaderColor?: (color: string) => void
  setBackgroundColor?: (color: string) => void
  platform?: string
}

/**
 * Telegram Mini App integratsiyasi.
 * Sayt oddiy brauzerda ochilganda hech narsa qilmaydi.
 */
export function TelegramWebApp() {
  return (
    <Script
      src="https://telegram.org/js/telegram-web-app.js"
      strategy="afterInteractive"
      onLoad={() => {
        const tg = (
          window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }
        ).Telegram?.WebApp
        if (!tg) return

        tg.ready()
        tg.expand()

        try {
          tg.setHeaderColor?.('#13111C')
          tg.setBackgroundColor?.('#13111C')
        } catch {
          // Eski Telegram versiyalarida bu metodlar bo'lmasligi mumkin
        }
      }}
    />
  )
}
