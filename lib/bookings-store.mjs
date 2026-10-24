// Prime Game Club — bronlar uchun umumiy saqlash moduli.
// Bot (bot/index.mjs) ham, sayt API'lari ham shu fayldan foydalanadi.
//
// Ma'lumotlar: bot/data/bookings.json
// Kod: 4 xonali, faol bronlar ichida takrorlanmaydi.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export const DATA_DIR = path.join(ROOT, 'bot', 'data')
export const BOOKINGS_FILE = path.join(DATA_DIR, 'bookings.json')
export const USERS_FILE = path.join(DATA_DIR, 'users.json')

export const ZONE_PRICES = {
  VIP: 25000,
  GAMING_PRO: 25000,
  STANDARD: 10000,
  PS5: 20000,
}

export const ZONE_NAMES = {
  VIP: 'VIP',
  GAMING_PRO: 'Gaming Pro',
  STANDARD: 'Standard',
  PS5: 'PS5 / Xbox',
}

export const EXTRA_PRICES = {
  drink: 8000,
  snack: 12000,
  headset: 5000,
}

export const BOOKING_STATUS_LABELS = {
  pending: '⏳ Kutilmoqda',
  confirmed: '✅ Tasdiqlangan',
  rejected: '❌ Rad etilgan',
  completed: '🏁 Yakunlangan',
}

export function normalizePhone(raw) {
  const digits = String(raw || '').replace(/\D/g, '')
  if (!digits) return ''
  if (digits.length === 9) return `+998${digits}`
  if (digits.length === 12 && digits.startsWith('998')) return `+${digits}`
  if (digits.length === 13 && digits.startsWith('998')) return `+${digits.slice(0, 12)}`
  return digits.startsWith('+') ? digits : `+${digits}`
}

export function phoneKey(raw) {
  return normalizePhone(raw).replace(/\D/g, '').slice(-9)
}

/** YYYY-MM-DD (mahalliy vaqt bo'yicha) */
export function localDate(date = new Date()) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

export function addDays(dateStr, days) {
  const date = new Date(`${dateStr}T12:00:00`)
  date.setDate(date.getDate() + days)
  return localDate(date)
}

export function formatWhen(date, time) {
  if (!date || !time) return ''
  const today = localDate()
  const tomorrow = addDays(today, 1)
  const label =
    date === today
      ? 'Bugun'
      : date === tomorrow
        ? 'Ertaga'
        : date.split('-').reverse().join('.')
  return `${label}, ${time}`
}

export function calcTotal(zone, hours, seats = 1, extras = []) {
  const price = ZONE_PRICES[zone] ?? 0
  const count = Math.max(1, Number(hours) || 1)
  const pcs = Math.max(1, Number(seats) || 1)
  const extrasTotal = (Array.isArray(extras) ? extras : []).reduce(
    (sum, id) => sum + (EXTRA_PRICES[id] || 0),
    0,
  )
  return price * count * pcs + extrasTotal
}

export function normalizeBooking(raw = {}) {
  const zone = raw.zone || 'VIP'
  const hours = Math.max(1, Number(raw.hours) || 1)
  const seats = Math.max(1, Number(raw.seats) || 1)
  const date = raw.date || ''
  const time = raw.time || ''
  const extras = Array.isArray(raw.extras) ? raw.extras : []

  return {
    id: String(raw.id || ''),
    code: raw.code ? String(raw.code) : '',
    chatId: raw.chatId == null ? null : Number(raw.chatId),
    username: raw.username || null,
    name: String(raw.name || raw.userName || 'Mehmon'),
    phone: raw.phone ? normalizePhone(raw.phone) : '',
    zone,
    zoneName: raw.zoneName || ZONE_NAMES[zone] || zone,
    computerId: raw.computerId || null,
    computerLabel: raw.computerLabel || null,
    seats,
    date,
    time,
    when: raw.when || formatWhen(date, time),
    hours,
    extras,
    total: Number(raw.total) || calcTotal(zone, hours, seats, extras),
    paymentMethod: raw.paymentMethod || 'cash',
    status: raw.status || 'pending',
    createdAt: raw.createdAt || new Date().toISOString(),
  }
}

export async function readBookings() {
  try {
    const raw = await readFile(BOOKINGS_FILE, 'utf8')
    if (!raw.trim()) return []
    const parsed = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []
    return parsed.map(normalizeBooking)
  } catch (e) {
    if (e && e.code === 'ENOENT') return []
    throw e
  }
}

export async function writeBookings(list) {
  await mkdir(DATA_DIR, { recursive: true })
  const tmp = `${BOOKINGS_FILE}.${process.pid}.tmp`
  await writeFile(tmp, JSON.stringify(list, null, 2), 'utf8')
  await rename(tmp, BOOKINGS_FILE)
}

let writeQueue = Promise.resolve()

/** Bir jarayon ichida o'qish-yozishni navbatga qo'yadi. */
export function withBookingsLock(fn) {
  const run = writeQueue.then(fn, fn)
  writeQueue = run.then(
    () => undefined,
    () => undefined,
  )
  return run
}

export function makeBookingCode(list, digits = 4) {
  const active = new Set(
    list
      .filter((b) => b.status === 'pending' || b.status === 'confirmed')
      .map((b) => String(b.code || '')),
  )
  const min = 10 ** (digits - 1)
  const span = 9 * min
  for (let i = 0; i < 500; i++) {
    const code = String(min + Math.floor(Math.random() * span))
    if (!active.has(code)) return code
  }
  // Juda ko'p faol bron bo'lsa, 5 xonali kodga o'tamiz.
  return makeBookingCode(list, digits + 1)
}

export async function createBooking(input) {
  return withBookingsLock(async () => {
    const list = await readBookings()
    const extras = Array.isArray(input.extras) ? input.extras : []
    const booking = normalizeBooking({
      ...input,
      id:
        input.id ||
        `bk-${Date.now().toString(36)}${Math.random().toString(36).slice(2, 6)}`,
      code: input.code || makeBookingCode(list),
      status: 'pending',
      createdAt: input.createdAt || new Date().toISOString(),
      total:
        input.total ??
        calcTotal(input.zone, input.hours, input.seats || 1, extras),
    })
    list.unshift(booking)
    await writeBookings(list)
    return booking
  })
}

export async function updateBooking(id, patch) {
  return withBookingsLock(async () => {
    const list = await readBookings()
    const index = list.findIndex((b) => b.id === id)
    if (index < 0) return null
    list[index] = normalizeBooking({ ...list[index], ...patch })
    await writeBookings(list)
    return list[index]
  })
}

export async function findBookingByCode(code) {
  const needle = String(code || '').trim()
  if (!needle) return null
  const list = await readBookings()
  return list.find((b) => String(b.code) === needle) ?? null
}

export async function findUserByPhone(phone) {
  const key = phoneKey(phone)
  if (!key) return null
  try {
    const parsed = JSON.parse(await readFile(USERS_FILE, 'utf8'))
    if (!Array.isArray(parsed)) return null
    return parsed.find((u) => phoneKey(u.phone) === key) ?? null
  } catch {
    return null
  }
}

export async function findUserByChatId(chatId) {
  if (chatId == null) return null
  try {
    const parsed = JSON.parse(await readFile(USERS_FILE, 'utf8'))
    if (!Array.isArray(parsed)) return null
    return parsed.find((u) => String(u.chatId) === String(chatId)) ?? null
  } catch {
    return null
  }
}

/** Web (context/app-context) kutadigan Booking shakli */
export function toWebBooking(b) {
  return {
    id: b.id,
    userId: b.phone ? `phone:${phoneKey(b.phone)}` : 'guest',
    userName: b.name,
    phone: b.phone,
    code: b.code,
    computerId: b.computerId || '',
    computerLabel: b.computerLabel || `${b.zoneName} · ${b.seats} o'rin`,
    date: b.date || '',
    startTime: b.time || b.when || '',
    hours: b.hours,
    seats: b.seats,
    extras: b.extras || [],
    total: b.total,
    paymentMethod: b.paymentMethod,
    status: b.status,
    createdAt: b.createdAt,
  }
}

const esc = (s) =>
  String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')

export function adminBookingText(b) {
  return [
    '🔔 <b>Yangi bron so‘rovi</b>',
    '',
    `🔑 <b>Kod:</b> <code>${esc(b.code)}</code>`,
    `👤 ${esc(b.name)} (${esc(b.phone)})${b.username ? ` · @${esc(b.username)}` : ''}`,
    `🎮 ${esc(b.zoneName)} · ${b.seats} o‘rin (PC) · ${b.hours} soat`,
    `📅 ${esc(b.when || formatWhen(b.date, b.time))}`,
    `💰 <b>${Math.round(b.total).toLocaleString('ru-RU').replace(/\u00A0/g, ' ')} so‘m</b>`,
    '',
    `Mijoz kelganda <b>${esc(b.code)}</b> kodini aytadi.`,
    'Batafsil ma’lumot: admin panel → Bronlar.',
  ].join('\n')
}

export async function sendTelegram(chatId, text, extra = {}) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token || !chatId) return false
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'HTML',
        link_preview_options: { is_disabled: true },
        ...extra,
      }),
      signal: AbortSignal.timeout(20_000),
    })
    const data = await res.json().catch(() => null)
    return Boolean(res.ok && data?.ok)
  } catch {
    return false
  }
}

export async function notifyAdminNewBooking(b) {
  const admin = process.env.ADMIN_CHAT_ID
  if (!admin) return false
  return sendTelegram(admin, adminBookingText(b), {
    reply_markup: {
      inline_keyboard: [
        [
          { text: '✅ Tasdiqlash', callback_data: `a:ok:${b.id}` },
          { text: '❌ Rad etish', callback_data: `a:no:${b.id}` },
        ],
      ],
    },
  })
}

export async function notifyUserNewBooking(b) {
  if (!b.chatId) return false
  return sendTelegram(
    b.chatId,
    `✅ <b>Bron qabul qilindi!</b>\n\n` +
      `🔑 <b>Bron kodi:</b> <code>${esc(b.code)}</code>\n\n` +
      `🎮 ${esc(b.zoneName)} · ${b.seats} o‘rin (PC)\n` +
      `📅 ${esc(b.when || formatWhen(b.date, b.time))} · ${b.hours} soat\n` +
      `💰 <b>${Math.round(b.total).toLocaleString('ru-RU').replace(/\u00A0/g, ' ')} so‘m</b>\n\n` +
      `Administrator tasdiqlagach xabar beramiz.\n` +
      `Klubga kelganda administratorga <b>shu kodni</b> ayting.`,
  )
}

export async function notifyUserBookingStatus(b) {
  if (!b.chatId) return false
  const time = b.when || formatWhen(b.date, b.time)
  if (b.status === 'confirmed') {
    return sendTelegram(
      b.chatId,
      `✅ <b>Broningiz tasdiqlandi!</b>\n\n` +
        `🔑 Kod: <code>${esc(b.code)}</code>\n` +
        `🎮 ${esc(b.zoneName)} · ${b.seats} o‘rin (PC) · ${b.hours} soat\n` +
        `📅 ${esc(time)}\n\n` +
        `Klubga kelganda administratorga <b>${esc(b.code)}</b> kodini ayting. Sizni kutamiz! 🎮`,
    )
  }
  if (b.status === 'rejected') {
    return sendTelegram(
      b.chatId,
      `❌ <b>Afsuski bron rad etildi.</b>\n\n` +
        `🔑 Kod: <code>${esc(b.code)}</code>\n` +
        `📅 ${esc(time)}\n\n` +
        `Batafsil ma’lumot uchun klub administratsiyasiga murojaat qiling.`,
    )
  }
  return false
}
