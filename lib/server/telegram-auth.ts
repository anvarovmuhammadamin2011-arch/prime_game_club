import { readFile, appendFile } from 'node:fs/promises'
import path from 'node:path'
import { maskPhone, normalizePhone, phoneKey } from '@/lib/phone'

export { maskPhone, normalizePhone, phoneKey }

export type BotUser = {
  chatId: number
  phone: string
  name: string
  username?: string | null
  registeredAt?: string
}

const USERS_FILE = path.join(process.cwd(), 'bot', 'data', 'users.json')
const DEV_CODES_FILE = path.join(process.cwd(), 'bot', 'data', 'dev-codes.log')

const CODE_TTL_MS = 5 * 60 * 1000
const MAX_ATTEMPTS = 5
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 3

export async function readBotUsers(): Promise<BotUser[]> {
  try {
    const parsed = JSON.parse(await readFile(USERS_FILE, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export async function findBotUserByPhone(phone: string): Promise<BotUser | null> {
  const key = phoneKey(phone)
  if (!key) return null
  const users = await readBotUsers()
  return users.find((u) => phoneKey(u.phone) === key) ?? null
}

type CodeEntry = {
  code: string
  chatId: number
  name: string
  phone: string
  expiresAt: number
  attempts: number
}

type AuthStore = {
  codes?: Map<string, CodeEntry>
  rate?: Map<string, number[]>
}

const store = globalThis as unknown as { __legionAuth?: AuthStore }
store.__legionAuth ??= {}
store.__legionAuth.codes ??= new Map<string, CodeEntry>()
store.__legionAuth.rate ??= new Map<string, number[]>()

const codes = store.__legionAuth.codes
const rate = store.__legionAuth.rate

const randomCode = () => String(Math.floor(1000 + Math.random() * 9000))

/** 3 marta / 10 daqiqa. true — ruxsat bor */
export function checkRateLimit(phone: string): boolean {
  const key = phoneKey(phone)
  const now = Date.now()
  const hits = (rate.get(key) || []).filter((t) => now - t < RATE_WINDOW_MS)
  if (hits.length >= RATE_MAX) {
    rate.set(key, hits)
    return false
  }
  hits.push(now)
  rate.set(key, hits)

  // eski yozuvlarni tozalash
  if (rate.size > 500) {
    for (const [k, v] of rate) {
      if (!v.some((t) => now - t < RATE_WINDOW_MS)) rate.delete(k)
    }
  }
  return true
}

export function issueCode(user: BotUser): CodeEntry {
  const entry: CodeEntry = {
    code: randomCode(),
    chatId: user.chatId,
    name: user.name,
    phone: normalizePhone(user.phone),
    expiresAt: Date.now() + CODE_TTL_MS,
    attempts: 0,
  }
  codes.set(phoneKey(user.phone), entry)
  return entry
}

export function getCodeEntry(phone: string): CodeEntry | undefined {
  return codes.get(phoneKey(phone))
}

export function clearCode(phone: string) {
  codes.delete(phoneKey(phone))
}

export type VerifyResult =
  | { ok: true; entry: CodeEntry }
  | { ok: false; error: 'wrong_code' | 'expired' | 'too_many_attempts' }

export function verifyCode(phone: string, input: string): VerifyResult {
  const key = phoneKey(phone)
  const entry = codes.get(key)
  if (!entry) return { ok: false, error: 'expired' }
  if (Date.now() > entry.expiresAt) {
    codes.delete(key)
    return { ok: false, error: 'expired' }
  }
  if (entry.attempts >= MAX_ATTEMPTS) {
    codes.delete(key)
    return { ok: false, error: 'too_many_attempts' }
  }
  entry.attempts += 1
  if (String(input).trim() !== entry.code) {
    if (entry.attempts >= MAX_ATTEMPTS) codes.delete(key)
    return { ok: false, error: 'wrong_code' }
  }
  codes.delete(key)
  return { ok: true, entry }
}

/** Telegram orqali kod yuborish. Dev rejimida faylga yozadi. */
export async function sendCode(chatId: number, code: string): Promise<void> {
  if (process.env.AUTH_DEV_LOG_CODES === '1') {
    await appendFile(DEV_CODES_FILE, `${new Date().toISOString()} chat=${chatId} code=${code}\n`)
    console.log(`[auth-dev] chat=${chatId} code=${code}`)
    return
  }

  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) throw new Error('TELEGRAM_BOT_TOKEN topilmadi')

  const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: chatId,
      text:
        '🔐 <b>Legion Game Club</b>\n\n' +
        `Mini App’ga kirish kodi: <code>${code}</code>\n\n` +
        'Kod 5 daqiqa amal qiladi. Kodni hech kimga aytmang.',
      parse_mode: 'HTML',
    }),
    signal: AbortSignal.timeout(15_000),
  })

  const data = await res.json().catch(() => null)
  if (!res.ok || !data?.ok) {
    throw new Error(data?.description || `Telegram HTTP ${res.status}`)
  }
}
