#!/usr/bin/env node
// Prime Game Club — Telegram bot (faqat Mini App).
//
// Botning yagona vazifasi: foydalanuvchiga Mini App'ni ochish tugmasini berish.
// Bron qilish, ro'yxatdan o'tish, narxlar va boshqa amallar — Mini App ichida.
//
// Ishga tushirish:  pnpm bot
// Token:            .env.local -> TELEGRAM_BOT_TOKEN
// Mini App URL:     .env.local -> SITE_URL (tunnel avtomatik yangilaydi)

import { setDefaultResultOrder } from 'node:dns'
import { setDefaultAutoSelectFamily } from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { CLUB } from './club-data.mjs'
import {
  adminBookingText,
  notifyUserBookingStatus,
  readBookings,
  updateBooking,
} from '../lib/bookings-store.mjs'

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
if (!TOKEN) {
  console.error(
    'Xato: TELEGRAM_BOT_TOKEN topilmadi.\n' +
      "`.env.local` fayliga TELEGRAM_BOT_TOKEN=... qo'shing yoki `pnpm bot` orqali ishga tushiring.",
  )
  process.exit(1)
}

const API = `https://api.telegram.org/bot${TOKEN}`
const ADMIN_CHAT_ID = process.env.ADMIN_CHAT_ID || null
const SITE_URL = CLUB.siteUrl
const IS_HTTPS = /^https:\/\//i.test(SITE_URL)

// Ba'zi tarmoqlarda IPv6 manzil ochilmaydi va fetch 10 soniya kutib qoladi.
setDefaultResultOrder('ipv4first')
setDefaultAutoSelectFamily(false)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

/* ------------------------------------------------------------------ */
/* Telegram API                                                        */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function api(method, params = {}, timeoutMs = 60_000) {
  const res = await fetch(`${API}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(timeoutMs),
  })
  const data = await res.json().catch(() => ({}))
  if (!data.ok) {
    const err = new Error(data.description || `HTTP ${res.status}`)
    err.code = data.error_code
    throw err
  }
  return data.result
}

function send(chatId, text, extra = {}) {
  return api('sendMessage', {
    chat_id: chatId,
    text,
    parse_mode: 'HTML',
    link_preview_options: { is_disabled: true },
    ...extra,
  })
}

const inline = (rows) => ({ inline_keyboard: rows })

function miniAppButton() {
  return IS_HTTPS
    ? { text: '🚀 Mini App’ni ochish', web_app: { url: SITE_URL } }
    : { text: '🌐 Saytni ochish', url: SITE_URL }
}

const WELCOME =
  '🕹 <b>Prime Game Club</b>\n\n' +
  'Bron qilish, bo‘sh o‘rinlar, bar menyusi va bonuslar — hammasi bitta Mini App ichida.\n\n' +
  (IS_HTTPS
    ? '👇 Mini App’ni ochish uchun pastdagi tugmani bosing.'
    : '⚠️ Mini App hozircha sozlanmagan. Administratorga murojaat qiling.')

// Eski reply-klaviaturani bir marta olib tashlaymiz.
const cleanedChats = new Set()

async function showMiniApp(chatId) {
  if (!cleanedChats.has(chatId)) {
    cleanedChats.add(chatId)
    try {
      const temp = await send(chatId, '🕹', {
        reply_markup: { remove_keyboard: true },
        disable_notification: true,
      })
      await api('deleteMessage', {
        chat_id: chatId,
        message_id: temp.message_id,
      }).catch(() => {})
    } catch {
      /* eski klaviatura bo'lmasa ham davom etamiz */
    }
  }

  await send(chatId, WELCOME, {
    reply_markup: IS_HTTPS ? inline([[miniAppButton()]]) : undefined,
  })
}

async function handleMessage(message) {
  // Mini App faqat shaxsiy chatda ochiladi.
  if (message.chat?.type !== 'private') return
  await showMiniApp(message.chat.id)
}

/* ------------------------------------------------------------------ */
/* Admin: Telegram'dagi eski bron bildirishnomalari                    */
/* ------------------------------------------------------------------ */

async function handleCallback(q) {
  const chatId = q.message?.chat?.id
  const messageId = q.message?.message_id
  let answered = false

  const answer = async (text) => {
    if (answered) return
    answered = true
    await api('answerCallbackQuery', {
      callback_query_id: q.id,
      ...(text ? { text } : {}),
    }).catch(() => {})
  }

  const data = String(q.data || '')
  if (data === 'noop') return answer()

  // Faqat admin bronni tasdiqlashi/rad etishi mumkin.
  if (!data.startsWith('a:')) return answer()

  if (!ADMIN_CHAT_ID || String(chatId) !== String(ADMIN_CHAT_ID)) {
    return answer('Ruxsat yo‘q')
  }

  const [, action, id] = data.split(':')
  const bookings = await readBookings()
  const booking = bookings.find((b) => b.id === id)

  if (!booking) return answer('Bron topilmadi')
  if (booking.status !== 'pending') {
    return answer('Bu bron allaqachon ko‘rib chiqilgan')
  }

  const status = action === 'ok' ? 'confirmed' : 'rejected'
  const updated = await updateBooking(booking.id, { status })
  if (!updated) return answer('Bron topilmadi')

  await answer(action === 'ok' ? 'Tasdiqlandi' : 'Rad etildi')
  await notifyUserBookingStatus(updated).catch(() => {})

  if (chatId && messageId) {
    try {
      await api('editMessageText', {
        chat_id: chatId,
        message_id: messageId,
        text:
          adminBookingText(updated) +
          (action === 'ok'
            ? '\n\n✅ <b>Tasdiqlangan</b>'
            : '\n\n❌ <b>Rad etilgan</b>'),
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        reply_markup: inline([]),
      })
    } catch {
      /* xabar eski bo'lsa tahrirlash mumkin emas */
    }
  }
}

/* ------------------------------------------------------------------ */
/* Polling                                                             */
/* ------------------------------------------------------------------ */

async function run() {
  let me
  for (let i = 1; i <= 10; i++) {
    try {
      me = await api('getMe')
      break
    } catch (e) {
      console.warn(`Telegram'ga ulanib bo'lmadi (${i}/10): ${e.message}`)
      if (i === 10) {
        console.error('Internet aloqasini tekshirib, botni qayta ishga tushiring.')
        process.exit(1)
      }
      await sleep(Math.min(30_000, i * 3000))
    }
  }

  console.log(`🤖 Bot ishga tushdi: @${me.username} (${me.first_name})`)
  console.log('   Rejim: faqat Mini App')
  console.log(
    `   Mini App: ${IS_HTTPS ? SITE_URL : `HTTPS emas (${SITE_URL}) — tugma vaqtincha sayt havolasi bilan`}`,
  )

  // Webhook bo'lsa, long polling ishlamaydi — o'chiramiz.
  try {
    await api('deleteWebhook', { drop_pending_updates: false })
  } catch (e) {
    console.warn('deleteWebhook:', e.message)
  }

  // Chatdagi doimiy menyu tugmasi — Mini App.
  if (IS_HTTPS) {
    for (let i = 1; i <= 3; i++) {
      try {
        await api('setChatMenuButton', {
          menu_button: {
            type: 'web_app',
            text: 'Mini App',
            web_app: { url: SITE_URL },
          },
        })
        console.log('   Menyu tugmasi: Mini App')
        break
      } catch (e) {
        console.warn(`setChatMenuButton (${i}/3): ${e.message}`)
        if (i < 3) await sleep(2000)
      }
    }
  }

  // Eski buyruqlar ro'yxatini tozalaymiz — faqat Mini App qolsin.
  try {
    await api('deleteMyCommands', { scope: { type: 'default' } })
  } catch (e) {
    console.warn('deleteMyCommands:', e.message)
  }

  let offset = 0
  let running = true
  const stop = () => {
    running = false
    console.log('\n👋 Bot to‘xtatilmoqda...')
  }
  process.on('SIGINT', stop)
  process.on('SIGTERM', stop)

  while (running) {
    let updates
    try {
      updates = await api(
        'getUpdates',
        { offset, timeout: 30, allowed_updates: ['message', 'callback_query'] },
        45_000,
      )
    } catch (e) {
      if (e.code === 409) {
        console.error(
          '409 Conflict: boshqa bot instansiyasi ishlayapti yoki webhook o‘rnatilgan. 5 soniyadan keyin qayta urinamiz.',
        )
        await sleep(5000)
        continue
      }
      if (e.name === 'TimeoutError' || e.name === 'AbortError') continue
      console.error('getUpdates xatosi:', e.message)
      await sleep(3000)
      continue
    }

    for (const update of updates) {
      offset = update.update_id + 1
      try {
        if (update.message) await handleMessage(update.message)
        else if (update.callback_query) await handleCallback(update.callback_query)
      } catch (e) {
        console.error('Update xatosi:', e.message)
      }
    }
  }
}

const isDirectRun =
  process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)

if (isDirectRun) {
  run().catch((e) => {
    console.error('Bot to‘xtab qoldi:', e)
    process.exit(1)
  })
}
