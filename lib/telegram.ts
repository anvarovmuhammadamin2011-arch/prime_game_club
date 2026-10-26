type TelegramWebApp = { initData?: string }

/** Mini App ichida ochilganda Telegram beradigan imzolangan initData. */
export function getTelegramInitData(): string {
  if (typeof window === 'undefined') return ''
  return (
    (window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }).Telegram
      ?.WebApp?.initData ?? ''
  )
}
