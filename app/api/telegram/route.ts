import { NextResponse } from 'next/server'
import {
  adminBookingText,
  findUserByChatId,
  notifyUserBookingStatus,
  readBookings,
  updateBooking,
} from '@/lib/bookings-store.mjs'
import { upsertTelegramUser } from '@/lib/telegram-users.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET

const WELCOME = {
  uz:
    '🕹 <b>Prime Game Club</b>\n\n' +
    'Bron qilish, bo‘sh o‘rinlar, bar menyusi — hammasi bitta Mini App ichida.\n\n' +
    '👇 Mini App’ni ochish uchun pastdagi tugmani bosing.',
  ru:
    '🕹 <b>Prime Game Club</b>\n\n' +
    'Бронирование, свободные места, меню бара — всё в одном Mini App.\n\n' +
    '👇 Нажмите кнопку ниже, чтобы открыть Mini App.',
}

const PHONE_REQUEST = {
  uz:
    '📱 <b>Prime Game Club</b>\n\n' +
    'Telefon raqamingizni ulashing — keyin Mini App’da parol o‘rnatasiz va shu raqam bilan kirasiz.',
  ru:
    '📱 <b>Prime Game Club</b>\n\n' +
    'Поделитесь номером телефона — затем задайте пароль в Mini App и входите по этому номеру.',
}

const PHONE_SAVED = {
  uz:
    '✅ <b>Raqamingiz saqlandi!</b>\n\n' +
    'Endi Mini App’ni ochib, kirish uchun parol o‘rnating.',
  ru:
    '✅ <b>Номер сохранён!</b>\n\n' +
    'Откройте Mini App и задайте пароль для входа.',
}

const WELCOME_BACK = {
  uz: '✅ <b>Raqamingiz saqlandi!</b>\n\n👇 Mini App’ni oching.',
  ru: '✅ <b>Номер сохранён!</b>\n\n👇 Откройте Mini App.',
}

const phoneKeyboard = (lang: 'uz' | 'ru') => ({
  keyboard: [
    [
      {
        text: lang === 'ru' ? '📱 Поделиться номером' : '📱 Telefon raqamni ulashish',
        request_contact: true,
      },
    ],
  ],
  resize_keyboard: true,
  one_time_keyboard: true,
})

const miniAppInline = (origin: string) => ({
  inline_keyboard: [[{ text: '🚀 Mini App’ni ochish', web_app: { url: origin } }]],
})

type TgUpdate = {
  message?: {
    chat?: { id?: number; type?: string }
    from?: {
      id?: number
      language_code?: string
      first_name?: string
      last_name?: string
      username?: string
    }
    text?: string
    contact?: { phone_number?: string; user_id?: number }
  }
  callback_query?: {
    id: string
    data?: string
    message?: { chat?: { id?: number }; message_id?: number }
  }
}

// Menyu tugmasi eski tunnel manziliga qotib qolmasin — har instansiyada
// bir marta joriy (Vercel) manzilga o'rnatamiz.
let menuFixed = false
async function ensureMenuButton(url: string) {
  if (menuFixed) return
  menuFixed = true
  try {
    await api('setChatMenuButton', {
      menu_button: { type: 'web_app', text: 'Mini App', web_app: { url } },
    })
  } catch (error) {
    console.error('setChatMenuButton:', error)
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
  await ensureMenuButton(origin)

  try {
    const message = update.message
    const chat = message?.chat
    if (message && chat?.type === 'private' && chat.id) {
      const chatId = chat.id
      const from = message.from
      const lang: 'uz' | 'ru' = from?.language_code?.startsWith('ru') ? 'ru' : 'uz'
      const contact = message.contact

      // Telegram faqat foydalanuvchining o'z raqamini ulashishiga ruxsat beradi.
      if (contact?.phone_number && (!contact.user_id || contact.user_id === from?.id)) {
        const name = [from?.first_name, from?.last_name].filter(Boolean).join(' ')
        const user = await upsertTelegramUser({
          chatId,
          phone: contact.phone_number,
          name,
          username: from?.username ?? null,
          lang,
        })

        const needsPassword = !user?.pinHash || !user?.pinSalt
        await api('sendMessage', {
          chat_id: chatId,
          text: needsPassword ? PHONE_SAVED[lang] : WELCOME_BACK[lang],
          parse_mode: 'HTML',
          link_preview_options: { is_disabled: true },
          reply_markup: miniAppInline(origin),
        })
      } else {
        const existing = await findUserByChatId(chatId)

        // Yangi foydalanuvchi — avval telefon raqamini ulashadi.
        if (!existing) {
          await api('sendMessage', {
            chat_id: chatId,
            text: PHONE_REQUEST[lang],
            parse_mode: 'HTML',
            link_preview_options: { is_disabled: true },
            reply_markup: phoneKeyboard(lang),
          })
        } else if (!existing.pinHash || !existing.pinSalt) {
          await api('sendMessage', {
            chat_id: chatId,
            text: PHONE_SAVED[lang],
            parse_mode: 'HTML',
            link_preview_options: { is_disabled: true },
            reply_markup: miniAppInline(origin),
          })
        } else {
          await api('sendMessage', {
            chat_id: chatId,
            text: WELCOME[lang],
            parse_mode: 'HTML',
            link_preview_options: { is_disabled: true },
            reply_markup: miniAppInline(origin),
          })
        }
      }
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
