#!/usr/bin/env node
// Legion Game Club — Telegram bot (long polling).
//
// Ishga tushirish:  pnpm bot
// Token:            .env.local -> TELEGRAM_BOT_TOKEN

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  BAR_CATEGORIES,
  BAR_MENU,
  CLUB,
  COMBOS,
  EXTRAS,
  PROMOS,
  STATUS_LABELS,
  ZONES,
  makeComputers,
} from './club-data.mjs'

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

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json')

/* ------------------------------------------------------------------ */
/* Yordamchilar                                                        */
/* ------------------------------------------------------------------ */

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

export function money(n) {
  return `${Math.round(n).toLocaleString('ru-RU').replace(/\u00A0/g, ' ')} so'm`
}

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

const zoneById = (id) => ZONES.find((z) => z.id === id)

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

/* ------------------------------------------------------------------ */
/* Bronlarni saqlash                                                   */
/* ------------------------------------------------------------------ */

let bookings = []
let bookingsLoaded = false

async function loadBookings() {
  if (bookingsLoaded) return
  try {
    const raw = await readFile(BOOKINGS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    bookings = Array.isArray(parsed) ? parsed : []
  } catch {
    bookings = []
  }
  bookingsLoaded = true
}

async function saveBookings() {
  await mkdir(DATA_DIR, { recursive: true })
  const tmp = `${BOOKINGS_FILE}.tmp`
  await writeFile(tmp, JSON.stringify(bookings, null, 2), 'utf8')
  await rename(tmp, BOOKINGS_FILE)
}

/* ------------------------------------------------------------------ */
/* Telegram foydalanuvchilari (telefon -> chat)                        */
/* ------------------------------------------------------------------ */

const USERS_FILE = path.join(DATA_DIR, 'users.json')
let botUsers = []
let usersLoaded = false

export function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 9) return `+998${digits}`
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`
  if (digits.length === 13 && digits.startsWith('998')) return `+${digits.slice(0, 12)}`
  return digits.startsWith('+') ? digits : `+${digits}`
}

export const phoneKey = (raw) => normalizePhone(raw).replace(/\D/g, '').slice(-9)

async function loadBotUsers() {
  if (usersLoaded) return
  try {
    const parsed = JSON.parse(await readFile(USERS_FILE, 'utf8'))
    botUsers = Array.isArray(parsed) ? parsed : []
  } catch {
    botUsers = []
  }
  usersLoaded = true
}

async function saveBotUsers() {
  await mkdir(DATA_DIR, { recursive: true })
  const tmp = `${USERS_FILE}.tmp`
  await writeFile(tmp, JSON.stringify(botUsers, null, 2), 'utf8')
  await rename(tmp, USERS_FILE)
}

const userByChat = (chatId) => botUsers.find((u) => String(u.chatId) === String(chatId))

async function upsertBotUser({ chatId, phone, name, username }) {
  const key = phoneKey(phone)
  // Raqam boshqa chat'ga bog'langan bo'lsa — eski yozuvni olib tashlaymiz
  botUsers = botUsers.filter(
    (u) => String(u.chatId) === String(chatId) || phoneKey(u.phone) !== key,
  )
  const record = {
    chatId,
    phone: normalizePhone(phone),
    name: (name || '').trim() || 'Mehmon',
    username: username || null,
    registeredAt: new Date().toISOString(),
  }
  botUsers.push(record)
  await saveBotUsers()
  return record
}

const CONTACT_KEYBOARD = {
  keyboard: [[{ text: '📱 Raqamni yuborish', request_contact: true }]],
  resize_keyboard: true,
  one_time_keyboard: true,
}

function askPhone(chatId) {
  return send(
    chatId,
    '📱 <b>Ro‘yxatdan o‘tish</b>\n\n' +
      'Mini App’ga kirish uchun telefon raqamingizni yuboring.\n' +
      'Pastdagi <b>«Raqamni yuborish»</b> tugmasini bosing — raqam avtomatik yuboriladi.\n\n' +
      'Bu raqam saytda ro‘yxatdan o‘tishda tasdiqlash kodi olish uchun ishlatiladi.',
    { reply_markup: CONTACT_KEYBOARD },
  )
}

async function handleContact(msg) {
  const chatId = msg.chat.id
  const contact = msg.contact

  if (contact.user_id && msg.from?.id && contact.user_id !== msg.from.id) {
    return send(chatId, 'Iltimos, faqat o‘zingizning raqamingizni yuboring.')
  }

  const phone = normalizePhone(contact.phone_number)
  if (phone.replace(/\D/g, '').length < 9) {
    return send(chatId, 'Raqam noto‘g‘ri. Qaytadan urinib ko‘ring.')
  }

  const record = await upsertBotUser({
    chatId,
    phone,
    name: [msg.from?.first_name, msg.from?.last_name].filter(Boolean).join(' '),
    username: msg.from?.username,
  })

  await send(
    chatId,
    `✅ <b>Raqam saqlandi:</b> ${esc(record.phone)}\n\n` +
      'Endi Mini App’da shu raqamni kiritsangiz, tasdiqlash kodi shu chatga keladi.\n' +
      'Quyidagi menyudan foydalanishingiz mumkin 👇',
    { reply_markup: MENU_KEYBOARD },
  )
  return send(chatId, 'Tezkor menyu:', { reply_markup: START_INLINE })
}

/* ------------------------------------------------------------------ */
/* Klaviaturalar                                                       */
/* ------------------------------------------------------------------ */

const IS_HTTPS = /^https:\/\//i.test(CLUB.siteUrl)
const siteButton = (text) =>
  IS_HTTPS ? { text, web_app: { url: CLUB.siteUrl } } : { text, url: CLUB.siteUrl }

const MENU_KEYBOARD = {
  keyboard: [
    [siteButton('🚀 Mini App')],
    [{ text: '🎮 Narxlar' }, { text: "🖥 Bo'sh joylar" }],
    [{ text: '📅 Bron qilish' }, { text: '🍔 Bar menyusi' }],
    [{ text: '🎁 Aksiyalar' }, { text: 'ℹ️ Yordam' }],
  ],
  resize_keyboard: true,
}

const inline = (rows) => ({ inline_keyboard: rows })

const MINI_APP_BUTTON = siteButton('🚀 Mini App’ni ochish')

const START_INLINE = inline([
  [MINI_APP_BUTTON],
  [
    { text: '📅 Bron qilish', callback_data: 'm:book' },
    { text: "🖥 Bo'sh joylar", callback_data: 'm:status' },
  ],
  [
    { text: '🎮 Narxlar', callback_data: 'm:prices' },
    { text: '🍔 Bar', callback_data: 'm:bar' },
  ],
  [{ text: '🎁 Aksiyalar', callback_data: 'm:promo' }, { text: '📍 Kontakt', callback_data: 'm:contact' }],
])

/* ------------------------------------------------------------------ */
/* Kontent                                                             */
/* ------------------------------------------------------------------ */

function welcomeText(firstName) {
  return [
    `👋 Salom, <b>${esc(firstName || 'do‘st')}</b>!`,
    '',
    `<b>${CLUB.name}</b> rasmiy botiga xush kelibsiz.`,
    `${CLUB.tagline} — 22 ta premium ish stansiyasi va PS5 zonalari.`,
    '',
    "Bu yerda narxlarni ko'rishingiz, bo'sh joylarni tekshirishingiz va bir necha bosqichda o'rin bron qilishingiz mumkin.",
    '',
    'Kerakli bo‘limni tanlang 👇',
  ].join('\n')
}

function pricesText() {
  const rows = ZONES.map(
    (z) =>
      `<b>${z.name}</b> — ${money(z.price)}/soat\n` +
      `   ${esc(z.gpu)} · ${esc(z.ram)} · ${esc(z.display)}`,
  )
  return [
    '🎮 <b>Narxlar</b>',
    '',
    rows.join('\n\n'),
    '',
    `<b>Qo'shimchalar:</b>`,
    ...EXTRAS.map((e) => `• ${e.name} — ${money(e.price)}`),
    '',
    '🎁 <b>Promo kodlar</b> chegirma beradi — /promo',
  ].join('\n')
}

function statusText() {
  const computers = makeComputers()
  const byType = new Map()
  for (const c of computers) {
    if (!byType.has(c.type)) byType.set(c.type, [])
    byType.get(c.type).push(c)
  }

  const blocks = []
  for (const [type, list] of byType) {
    const free = list.filter((c) => c.status === 'available')
    const counts = list.reduce((acc, c) => {
      acc[c.status] = (acc[c.status] || 0) + 1
      return acc
    }, {})
    const summary = Object.entries(counts)
      .map(([s, n]) => `${STATUS_LABELS[s] || s}: ${n}`)
      .join(' · ')
    blocks.push(
      `<b>${type}</b> — jami ${list.length}\n` +
        `   ${summary}\n` +
        `   Bo'sh: ${free.length ? free.map((c) => c.label).join(', ') : 'yo‘q'}`,
    )
  }

  return [
    "🖥 <b>Kompyuterlar holati</b>",
    '',
    blocks.join('\n\n'),
    '',
    "Gaming Pro va Standard zonalar ham mavjud — ular bo'yicha administrator bilan bog'laning.",
    '',
    '📅 O‘rin band qilish: /book',
  ].join('\n')
}

function barText() {
  const groups = new Map()
  for (const item of BAR_MENU) {
    if (!groups.has(item.category)) groups.set(item.category, [])
    groups.get(item.category).push(item)
  }
  const blocks = [...groups].map(
    ([cat, items]) =>
      `<b>${BAR_CATEGORIES[cat] || cat}</b>\n` +
      items.map((i) => `• ${i.name} — ${money(i.price)}`).join('\n'),
  )
  return [
    '🍔 <b>Bar menyusi</b>',
    '',
    blocks.join('\n\n'),
    '',
    '<b>Kombo to‘plamlar:</b>',
    ...COMBOS.map((c) => `• ${c.name} (${c.items.join(', ')}) — ${money(c.price)}`),
    '',
    'Buyurtmani joyida administratorda qilasiz 🙂',
  ].join('\n')
}

function promoText() {
  return [
    '🎁 <b>Aksiyalar</b>',
    '',
    ...PROMOS.map(
      (p) => `• <code>${p.code}</code> — ${p.discount}% ${p.desc ? `\n   ${p.desc}` : ''}`,
    ),
    '',
    "Promo kodni bron qilishda administrator aytsangiz, chegirma qo'llanadi.",
  ].join('\n')
}

function contactText() {
  return [
    '📍 <b>Kontakt</b>',
    '',
    `🏠 ${esc(CLUB.address)}`,
    `📞 ${esc(CLUB.phone)}`,
    `🕒 ${esc(CLUB.workHours)}`,
    `🌐 ${esc(CLUB.siteUrl)}`,
    '',
    '📱 Mini App: pastdagi <b>🚀 Mini App</b> tugmasi orqali',
  ].join('\n')
}

function miniAppText() {
  return [
    '🚀 <b>Legion Game Club — Mini App</b>',
    '',
    'Saytning to‘liq versiyasi Telegram ichida ochiladi:',
    '• onlayn bron qilish',
    '• kompyuterlar xaritasi',
    '• bar va aksiyalar',
    '• profil va tarix',
  ].join('\n')
}

function helpText() {
  return [
    'ℹ️ <b>Buyruqlar</b>',
    '',
    '/start — asosiy menyu',
    '/app — Mini App’ni ochish',
    "/book — o'rin bron qilish",
    '/prices — narxlar',
    "/status — bo'sh joylar",
    '/bar — bar menyusi',
    '/promo — aksiyalar',
    '/mybookings — mening bronlarim',
    '/contact — kontakt',
    '/id — chat ID (admin uchun)',
    '/cancel — jarayonni bekor qilish',
  ].join('\n')
}

/* ------------------------------------------------------------------ */
/* Bron qilish jarayoni                                                */
/* ------------------------------------------------------------------ */

const sessions = new Map()

function startBooking(chatId, from) {
  sessions.set(chatId, { step: 'name', data: { name: from?.first_name || '' } })
  return send(chatId, '📅 <b>Bron qilish</b>\n\n1/4 — Ismingizni yozing:', {
    reply_markup: inline([[{ text: '❌ Bekor qilish', callback_data: 'b:cancel' }]]),
  })
}

async function bookingStep(chatId, session, text, contact) {
  const { data } = session

  if (session.step === 'name') {
    const name = text?.trim()
    if (!name || name.length < 2) {
      return send(chatId, 'Ism kamida 2 harfdan iborat bo‘lsin. Qaytadan yozing:')
    }
    data.name = name
    session.step = 'phone'
    return send(chatId, '2/4 — Telefon raqamingizni yuboring:', {
      reply_markup: {
        keyboard: [
          [{ text: '📱 Raqamni yuborish', request_contact: true }],
          [{ text: '❌ Bekor qilish' }],
        ],
        resize_keyboard: true,
        one_time_keyboard: true,
      },
    })
  }

  if (session.step === 'phone') {
    const phone = (contact?.phone_number || text || '').trim()
    const digits = phone.replace(/[^\d+]/g, '')
    if (digits.replace(/\D/g, '').length < 9) {
      return send(chatId, 'Telefon raqami noto‘g‘ri. Masalan: +998 90 123 45 67')
    }
    data.phone = digits.startsWith('+') ? digits : `+${digits}`
    session.step = 'zone'
    await send(chatId, '✅ Raqam qabul qilindi.', {
      reply_markup: { remove_keyboard: true },
    })
    return send(chatId, '3/4 — Zonani tanlang:', {
      reply_markup: inline([
        ...ZONES.map((z) => [
          { text: `${z.name} — ${money(z.price)}/soat`, callback_data: `z:${z.id}` },
        ]),
        [{ text: '❌ Bekor qilish', callback_data: 'b:cancel' }],
      ]),
    })
  }

  if (session.step === 'time') {
    const when = text?.trim()
    if (!when || when.length < 3) {
      return send(chatId, 'Qachon va soat nechada? Masalan: <i>bugun 18:00</i>')
    }
    data.when = when.slice(0, 60)
    session.step = 'hours'
    return send(chatId, 'Necha soat o‘ynaysiz?', {
      reply_markup: inline([
        [1, 2, 3, 4, 5, 6].map((h) => ({ text: `${h} soat`, callback_data: `h:${h}` })),
        [{ text: '❌ Bekor qilish', callback_data: 'b:cancel' }],
      ]),
    })
  }

  return send(chatId, helpText())
}

function bookingSummary(data) {
  const zone = zoneById(data.zone)
  const total = (zone?.price || 0) * (data.hours || 0)
  return [
    '📅 <b>Bron ma’lumotlari</b>',
    '',
    `👤 Ism: ${esc(data.name)}`,
    `📞 Telefon: ${esc(data.phone)}`,
    `🎮 Zona: ${esc(zone?.name || data.zone)}`,
    `🕒 Vaqt: ${esc(data.when)}`,
    `⏳ Davomiylik: ${data.hours} soat`,
    `💰 Jami: <b>${money(total)}</b>`,
    '',
    'Tasdiqlaysizmi?',
  ].join('\n')
}

function keyboardConfirm() {
  return inline([
    [
      { text: '✅ Tasdiqlash', callback_data: 'b:confirm' },
      { text: '❌ Bekor qilish', callback_data: 'b:cancel' },
    ],
  ])
}

async function confirmBooking(chatId, session, user, messageId) {
  const data = session.data
  const zone = zoneById(data.zone)
  const booking = {
    id: `bk-${Date.now()}`,
    chatId,
    username: user?.username || null,
    name: data.name,
    phone: data.phone,
    zone: data.zone,
    zoneName: zone?.name || data.zone,
    when: data.when,
    hours: data.hours,
    total: (zone?.price || 0) * data.hours,
    status: 'pending',
    createdAt: new Date().toISOString(),
  }

  bookings.unshift(booking)
  await saveBookings()
  sessions.delete(chatId)

  const text =
    `✅ <b>So‘rovingiz qabul qilindi!</b>\n\n` +
    `Bron: <code>${booking.id}</code>\n` +
    `🎮 ${esc(booking.zoneName)} · ${booking.hours} soat · ${money(booking.total)}\n` +
    `🕒 ${esc(booking.when)}\n\n` +
    `Administrator tasdiqlagach sizga shu yerda xabar beramiz.\n` +
    `Bronlarim: /mybookings`

  await send(chatId, text, { reply_markup: MENU_KEYBOARD })

  if (ADMIN_CHAT_ID) {
    const adminText =
      '🔔 <b>Yangi bron so‘rovi</b>\n\n' +
      `ID: <code>${booking.id}</code>\n` +
      `👤 ${esc(booking.name)} (${esc(booking.phone)})\n` +
      `🎮 ${esc(booking.zoneName)} · ${booking.hours} soat\n` +
      `🕒 ${esc(booking.when)}\n` +
      `💰 ${money(booking.total)}` +
      (booking.username ? `\n🔗 @${esc(booking.username)}` : '')
    await send(ADMIN_CHAT_ID, adminText, {
      reply_markup: inline([
        [
          { text: '✅ Tasdiqlash', callback_data: `a:ok:${booking.id}` },
          { text: '❌ Rad etish', callback_data: `a:no:${booking.id}` },
        ],
      ]),
    })
  }

  if (messageId) {
    try {
      await api('editMessageReplyMarkup', { chat_id: chatId, message_id: messageId })
    } catch {
      /* ignore */
    }
  }
}

/* ------------------------------------------------------------------ */
/* Update handling                                                     */
/* ------------------------------------------------------------------ */

async function handleCallback(q) {
  const chatId = q.message?.chat?.id
  const messageId = q.message?.message_id
  const data = q.data || ''
  const user = q.from

  const answer = (text) => api('answerCallbackQuery', { callback_query_id: q.id, text })

  if (data === 'noop') {
    await answer()
    return
  }

  // Menyu
  if (data.startsWith('m:')) {
    await answer()
    switch (data.slice(2)) {
      case 'book':
        if (!userByChat(chatId)) return askPhone(chatId)
        return startBooking(chatId, user)
      case 'status':
        return send(chatId, statusText())
      case 'prices':
        return send(chatId, pricesText())
      case 'bar':
        return send(chatId, barText())
      case 'promo':
        return send(chatId, promoText())
      case 'contact':
        return send(chatId, contactText())
    }
    return
  }

  // Bron jarayoni
  if (data === 'b:cancel') {
    sessions.delete(chatId)
    await answer('Bekor qilindi')
    return send(chatId, 'Bron bekor qilindi. Boshidan boshlash: /book', {
      reply_markup: MENU_KEYBOARD,
    })
  }

  // Admin: bronni tasdiqlash / rad etish
  if (data.startsWith('a:')) {
    if (!ADMIN_CHAT_ID || String(chatId) !== String(ADMIN_CHAT_ID)) {
      await answer('Ruxsat yo‘q')
      return
    }
    const [, action, id] = data.split(':')
    const booking = bookings.find((b) => b.id === id)
    if (!booking) {
      await answer('Bron topilmadi')
      return
    }
    booking.status = action === 'ok' ? 'confirmed' : 'rejected'
    await saveBookings()
    await answer(action === 'ok' ? 'Tasdiqlandi' : 'Rad etildi')

    await send(
      booking.chatId,
      action === 'ok'
        ? `✅ <b>Broningiz tasdiqlandi!</b>\n\n<code>${booking.id}</code> · ${esc(booking.zoneName)} · ${booking.hours} soat\n🕒 ${esc(booking.when)}\n\nSizni kutamiz! 🎮`
        : `❌ <b>Afsuski bron rad etildi.</b>\n\n<code>${booking.id}</code> · ${esc(booking.zoneName)} · ${esc(booking.when)}\nBatafsil: /contact`,
    )

    try {
      await api('editMessageReplyMarkup', {
        chat_id: chatId,
        message_id: messageId,
        reply_markup: inline([
          [
            {
              text: action === 'ok' ? '✅ Tasdiqlandi' : '❌ Rad etildi',
              callback_data: 'noop',
            },
          ],
        ]),
      })
    } catch {
      /* ignore */
    }
    return
  }

  const session = sessions.get(chatId)
  if (!session) {
    await answer('Jarayon eskirgan. /book bilan qaytadan boshlang.')
    return
  }

  if (data.startsWith('z:')) {
    session.data.zone = data.slice(2)
    session.step = 'time'
    await answer()
    return send(chatId, '4/4 — Qaysi kuni va soat nechada? Masalan: <i>bugun 18:00</i>')
  }

  if (data.startsWith('h:')) {
    const hours = Number(data.slice(2))
    if (!Number.isFinite(hours) || hours < 1 || hours > 24) {
      await answer('Noto‘g‘ri qiymat')
      return
    }
    session.data.hours = hours
    session.step = 'confirm'
    await answer()
    return send(chatId, bookingSummary(session.data), { reply_markup: keyboardConfirm() })
  }

  if (data === 'b:confirm') {
    if (session.step !== 'confirm') {
      await answer('Ma’lumotlar to‘liq emas. /book dan boshlang.')
      return
    }
    await answer('Qabul qilindi')
    return confirmBooking(chatId, session, user, messageId)
  }

  await answer()
}

async function handleMessage(msg) {
  const chatId = msg.chat.id
  const text = (msg.text || '').trim()
  const user = msg.from

  if (msg.contact) {
    const session = sessions.get(chatId)
    if (session?.step === 'phone') {
      return bookingStep(chatId, session, null, msg.contact)
    }
    return handleContact(msg)
  }

  const session = sessions.get(chatId)
  const lower = text.toLowerCase()

  // Reply-klaviaturadagi tugmalar va bekor qilish
  const MENU_ACTIONS = {
    '🎮 narxlar': 'prices',
    "🖥 bo'sh joylar": 'status',
    '📅 bron qilish': 'book',
    '🍔 bar menyusi': 'bar',
    '🎁 aksiyalar': 'promo',
    'ℹ️ yordam': 'help',
    '❌ bekor qilish': 'cancel',
  }
  if (MENU_ACTIONS[lower]) {
    sessions.delete(chatId)
    const action = MENU_ACTIONS[lower]
    if (action === 'book') {
      if (!userByChat(chatId)) return askPhone(chatId)
      return startBooking(chatId, user)
    }
    if (action === 'cancel') {
      return send(chatId, 'Jarayon bekor qilindi.', { reply_markup: MENU_KEYBOARD })
    }
    const fn = {
      prices: pricesText,
      status: statusText,
      bar: barText,
      promo: promoText,
      help: helpText,
    }[action]
    return send(chatId, fn(), { reply_markup: MENU_KEYBOARD })
  }

  // Matn kutilayotgan bosqichlar
  if (session && ['name', 'phone', 'time'].includes(session.step) && !text.startsWith('/')) {
    return bookingStep(chatId, session, text, null)
  }

  const cmd = text.split(/\s+/)[0].split('@')[0].toLowerCase()

  switch (cmd) {
    case '/start':
      sessions.delete(chatId)
      if (!userByChat(chatId)) return askPhone(chatId)
      return send(chatId, welcomeText(user?.first_name), {
        reply_markup: MENU_KEYBOARD,
      }).then(() => send(chatId, 'Tezkor menyu:', { reply_markup: START_INLINE }))

    case '/help':
      return send(chatId, helpText(), { reply_markup: MENU_KEYBOARD })

    case '/app':
      return send(chatId, miniAppText(), {
        reply_markup: inline([[MINI_APP_BUTTON]]),
      })

    case '/book':
      sessions.delete(chatId)
      if (!userByChat(chatId)) return askPhone(chatId)
      return startBooking(chatId, user)

    case '/prices':
      return send(chatId, pricesText())

    case '/status':
      return send(chatId, statusText())

    case '/bar':
      return send(chatId, barText())

    case '/promo':
      return send(chatId, promoText())

    case '/contact':
      return send(chatId, contactText())

    case '/mybookings': {
      const mine = bookings.filter((b) => b.chatId === chatId).slice(0, 10)
      if (!mine.length) {
        return send(chatId, "Sizda hali bron yo‘q. Boshlash: /book")
      }
      const statusLabel = {
        pending: '⏳ Kutilmoqda',
        confirmed: '✅ Tasdiqlangan',
        rejected: '❌ Rad etilgan',
        completed: '🏁 Yakunlangan',
      }
      return send(
        chatId,
        '📋 <b>Mening bronlarim</b>\n\n' +
          mine
            .map(
              (b) =>
                `<code>${b.id}</code> — ${statusLabel[b.status] || b.status}\n` +
                `   ${esc(b.zoneName)} · ${b.hours} soat · ${money(b.total)}\n` +
                `   🕒 ${esc(b.when)}`,
            )
            .join('\n\n'),
      )
    }

    case '/id':
      return send(
        chatId,
        `🆔 Chat ID: <code>${chatId}</code>` +
          (user?.username ? `\n👤 @${esc(user.username)}` : '') +
          (ADMIN_CHAT_ID ? `\n\nAdmin ID: <code>${ADMIN_CHAT_ID}</code>` : ''),
      )

    case '/cancel':
      sessions.delete(chatId)
      return send(chatId, 'Jarayon bekor qilindi.', { reply_markup: MENU_KEYBOARD })

    default:
      if (!text) return
      return send(
        chatId,
        "Tushunmadim 🤔 Quyidagi menyudan foydalaning yoki /help ni ko'ring.",
        { reply_markup: MENU_KEYBOARD },
      )
  }
}

async function handleUpdate(update) {
  if (update.message) return handleMessage(update.message)
  if (update.callback_query) return handleCallback(update.callback_query)
}

/* ------------------------------------------------------------------ */
/* Polling                                                             */
/* ------------------------------------------------------------------ */

async function run() {
  await loadBookings()
  await loadBotUsers()

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
  console.log(`   Admin chat: ${ADMIN_CHAT_ID || "sozlanmagan (yangi bronlar faqat faylga yoziladi)"}`)
  console.log(`   Bronlar: ${path.relative(process.cwd(), BOOKINGS_FILE)}`)
  if (CLUB.siteUrl.includes('localhost')) {
    console.log(`   Sayt: ${CLUB.siteUrl}`)
  }

  // Webhook bo'lsa, long polling ishlamaydi — o'chiramiz.
  try {
    await api('deleteWebhook', { drop_pending_updates: false })
  } catch (e) {
    console.warn('deleteWebhook:', e.message)
  }

  // Mini App: chatdagi menyu tugmasi
  if (IS_HTTPS) {
    for (let i = 1; i <= 3; i++) {
      try {
        await api('setChatMenuButton', {
          menu_button: {
            type: 'web_app',
            text: 'Mini App',
            web_app: { url: CLUB.siteUrl },
          },
        })
        const mb = await api('getChatMenuButton')
        if (mb.type !== 'web_app') {
          console.warn(`   Diqqat: menyu tugmasi "${mb.type}" bo'lib qoldi (kesh bo'lishi mumkin)`)
        }
        console.log(`   Mini App: ${CLUB.siteUrl}`)
        break
      } catch (e) {
        console.warn(`setChatMenuButton (${i}/3): ${e.message}`)
        if (i < 3) await sleep(2000)
      }
    }
  } else {
    console.warn('Mini App uchun HTTPS URL kerak (SITE_URL). Hozir:', CLUB.siteUrl)
  }

  // Buyruqlar ro'yxati (chatdagi "/" menyusi)
  try {
    await api('setMyCommands', {
      commands: [
        { command: 'start', description: 'Asosiy menyu' },
        { command: 'app', description: "Mini App'ni ochish" },
        { command: 'book', description: "O'rin bron qilish" },
        { command: 'prices', description: 'Narxlar' },
        { command: 'status', description: "Bo'sh joylar" },
        { command: 'bar', description: 'Bar menyusi' },
        { command: 'promo', description: 'Aksiyalar' },
        { command: 'mybookings', description: 'Mening bronlarim' },
        { command: 'contact', description: 'Kontakt' },
        { command: 'cancel', description: 'Jarayonni bekor qilish' },
      ],
    })
  } catch (e) {
    console.warn('setMyCommands:', e.message)
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
        await handleUpdate(update)
      } catch (e) {
        console.error('Update xatosi:', e.message)
      }
    }
  }
}

run().catch((e) => {
  console.error('Bot to‘xtab qoldi:', e)
  process.exit(1)
})
