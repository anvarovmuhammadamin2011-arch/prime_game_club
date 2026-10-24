/**
 * Telegram bot havolasi.
 *
 * Bot username'i yoki to'liq havolasini `.env.local` orqali o'zgartirish mumkin:
 *   NEXT_PUBLIC_TELEGRAM_BOT_USERNAME=primegameclubbot
 * yoki
 *   NEXT_PUBLIC_TELEGRAM_BOT_URL=https://t.me/primegameclubbot
 *
 * Env o'zgargandan keyin dev serverni (yoki build'ni) qayta ishga tushirish kerak.
 */

const DEFAULT_BOT_USERNAME = 'primeclubrobot'

const configuredUrl = process.env.NEXT_PUBLIC_TELEGRAM_BOT_URL?.trim()
const configuredUsername = process.env.NEXT_PUBLIC_TELEGRAM_BOT_USERNAME?.trim()

function usernameFromUrl(url: string): string {
  try {
    return new URL(url).pathname.replace(/^\//, '').split('/')[0] || ''
  } catch {
    return ''
  }
}

export const BOT_URL =
  configuredUrl ||
  `https://t.me/${(configuredUsername || DEFAULT_BOT_USERNAME).replace(/^@/, '')}`

export const BOT_USERNAME =
  configuredUsername?.replace(/^@/, '') ||
  usernameFromUrl(BOT_URL) ||
  DEFAULT_BOT_USERNAME
