import { NextResponse } from 'next/server'
import {
  adminBookingText,
  notifyUserBookingStatus,
  readBookings,
  updateBooking,
} from '@/lib/bookings-store.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

const WELCOME =
  '🕹 <b>Prime Game Club</b>\n\n' +
  'Bron qilish, bo‘sh o‘rinlar, bar menyusi — hammasi bitta Mini App ichida.\n\n' +
  '👇 Mini App’ni ochish uchun pastdagi tugmani bosing.'

type TgUpdate = {
  message?: {
    chat?: { id?: number; type?: string }
    text?: string
  }
  callback_query?: {
    id: string
    data?: string
    message?: { chat?: { id?: number }; message_id?: number }
  }
}

async function api(method: string, params: unknown) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(15_000),
  })
  const data = (await res.json().catch(() => ({}))) as {
    ok?: boolean
    description?: string
    result?: unknown
  }
  if (!data.ok) throw new Error(data.description || `HTTP ${res.status}`)
  return data.result
}

/** Telegram webhook: bot serverda (Vercel'da) doimiy ishlaydi, PC kerak emas. */
export async function POST(request: Request) {
  if (!TOKEN || !SECRET) {
    return NextResponse.json({ ok: false, error: 'not_configured' }, { status: 503 })
  }
  if (request.headers.get('x-telegram-bot-api-secret-token') !== SECRET) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const update = (await request.json().catch(() => null)) as TgUpdate | null
  if (!update) return NextResponse.json({ ok: true })

  const origin = new URL(request.url).origin

  try {
    if (update.message?.chat?.type === 'private' && update.message.chat.id) {
      await api('sendMessage', {
        chat_id: update.message.chat.id,
        text: WELCOME,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: {
          inline_keyboard: [
            [{ text: '🚀 Mini App’ni ochish', web_app: { url: origin } }],
          ],
        },
      })
    }

    const q = update.callback_query
    if (q) {
      const chatId = q.message?.chat?.id
      const messageId = q.message?.message_id
      const data = String(q.data || '')
      const answer = (text?: string) =>
        api('answerCallbackQuery', {
          callback_query_id: q.id,
          ...(text ? { text } : {}),
        }).catch(() => {})

      if (data === 'noop') {
        await answer()
      } else if (!data.startsWith('a:')) {
        await answer()
      } else if (!process.env.ADMIN_CHAT_ID || String(chatId) !== process.env.ADMIN_CHAT_ID) {
        await answer('Ruxsat yo‘q')
      } else {
        const [, action, id] = data.split(':')
        const booking = (await readBookings()).find((b) => b.id === id)

        if (!booking) {
          await answer('Bron topilmadi')
        } else if (booking.status !== 'pending') {
          await answer('Bu bron allaqachon ko‘rib chiqilgan')
        } else {
          const status = action === 'ok' ? 'confirmed' : 'rejected'
          const updated = await updateBooking(booking.id, { status })
          await answer(action === 'ok' ? 'Tasdiqlandi' : 'Rad etildi')
          if (updated) await notifyUserBookingStatus(updated).catch(() => {})

          if (updated && chatId && messageId) {
            await api('editMessageText', {
              chat_id: chatId,
              message_id: messageId,
              text:
                adminBookingText(updated) +
                (action === 'ok' ? '\n\n✅ <b>Tasdiqlangan</b>' : '\n\n❌ <b>Rad etilgan</b>'),
              parse_mode: 'HTML',
              link_preview_options: { is_disabled: true },
              reply_markup: { inline_keyboard: [] },
            }).catch(() => {})
          }
        }
      }
    }
  } catch (error) {
    console.error('telegram webhook:', error)
  }

  return NextResponse.json({ ok: true })
}
