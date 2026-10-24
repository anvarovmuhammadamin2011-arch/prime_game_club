import { readFile, appendFile, mkdir, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto'
import { setDefaultResultOrder } from 'node:dns'
import { setDefaultAutoSelectFamily } from 'node:net'
import { maskPhone, normalizePhone, phoneKey } from '@/lib/phone'

// Telegram API'ga ulanishda IPv6 muammosi bo'lsa, IPv4 ni birinchi sinaymiz.
setDefaultResultOrder('ipv4first')
setDefaultAutoSelectFamily(false)

export { maskPhone, normalizePhone, phoneKey }

export type BotUser = {
  chatId: number
  phone: string
  name: string
  username?: string | null
  pinHash?: string | null
  pinSalt?: string | null
  registeredAt?: string
}

const USERS_FILE = path.join(process.cwd(), 'bot', 'data', 'users.json')
const DEV_CODES_FILE = path.join(process.cwd(), 'bot', 'data', 'dev-codes.log')

const CODE_TTL_MS = 5 * 60 * 1000
const MAX_ATTEMPTS = 5
const RATE_WINDOW_MS = 10 * 60 * 1000
const RATE_MAX = 3

// Parol (4 xonali kod) bilan kirish uchun limit
const LOGIN_MAX = 10
const LOGIN_WINDOW_MS = 10 * 60 * 1000

export async function readBotUsers(): Promise<BotUser[]> {
  try {
    const parsed = JSON.parse(await readFile(USERS_FILE, 'utf8'))
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

/**
 * Yozishdan oldin qat'iy o'qish: fayl mavjud bo'lmasa — bo'sh massiv,
 * lekin o'qish/parse xatosi bo'lsa — xato tashlaymiz (mavjud bazani
 * tasodifan o'chirib yubormaslik uchun).
 */
async function readBotUsersForWrite(): Promise<BotUser[]> {
  try {
    const raw = await readFile(USERS_FILE, 'utf8')
    const parsed = JSON.parse(raw)
    return Array.isArray(parsed) ? parsed : []
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'ENOENT') return []
    throw e
  }
}

export async function findBotUserByPhone(phone: string): Promise<BotUser | null> {
  const key = phoneKey(phone)
  if (!key) return null
  const users = await readBotUsers()
  return users.find((u) => phoneKey(u.phone) === key) ?? null
}

function hashPin(pin: string): { pinHash: string; pinSalt: string } {
  const pinSalt = randomBytes(16).toString('hex')
  return {
    pinHash: scryptSync(pin, pinSalt, 32).toString('hex'),
    pinSalt,
  }
}

// users.json ga bir vaqtda yozishni navbatga qo'yamiz
let usersWriteQueue: Promise<unknown> = Promise.resolve()

function withUsersLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = usersWriteQueue.then(fn, fn)
  usersWriteQueue = run.catch(() => {})
  return run
}

export type CreateBotUserInput = {
  name: string
  phone: string
  pin: string
}

export type CreateBotUserResult =
  | { ok: true; user: BotUser }
  | { ok: false; error: 'already_exists' }

/**
 * Saytdan ro'yxatdan o'tgan foydalanuvchini bot bilan bir xil bazaga yozadi.
 * chatId = 0 — hisob saytda yaratilgan, Telegram chatiga bog'lanmagan.
 */
export async function createBotUser(
  input: CreateBotUserInput,
): Promise<CreateBotUserResult> {
  return withUsersLock(async () => {
    const users = await readBotUsersForWrite()
    const key = phoneKey(input.phone)
    if (users.some((u) => phoneKey(u.phone) === key)) {
      return { ok: false, error: 'already_exists' as const }
    }

    const user: BotUser = {
      chatId: 0,
      phone: normalizePhone(input.phone),
      name: input.name.trim().replace(/\s+/g, ' '),
      username: null,
      ...hashPin(input.pin),
      registeredAt: new Date().toISOString(),
    }

    users.push(user)

    await mkdir(path.dirname(USERS_FILE), { recursive: true })
    const tmp = `${USERS_FILE}.tmp`
    await writeFile(tmp, JSON.stringify(users, null, 2), 'utf8')
    await rename(tmp, USERS_FILE)

    return { ok: true, user }
  })
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
  loginRate?: Map<string, number[]>
}

const store = globalThis as unknown as { __primeAuth?: AuthStore }
store.__primeAuth ??= {}
store.__primeAuth.codes ??= new Map<string, CodeEntry>()
store.__primeAuth.rate ??= new Map<string, number[]>()
store.__primeAuth.loginRate ??= new Map<string, number[]>()

const codes = store.__primeAuth.codes
const rate = store.__primeAuth.rate
const loginRate = store.__primeAuth.loginRate

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

/** Parol bilan kirish: 10 marta / 10 daqiqa. true — ruxsat bor */
export function checkLoginRate(phone: string): boolean {
  const key = phoneKey(phone)
  const now = Date.now()
  const hits = (loginRate.get(key) || []).filter((t) => now - t < LOGIN_WINDOW_MS)
  if (hits.length >= LOGIN_MAX) {
    loginRate.set(key, hits)
    return false
  }
  hits.push(now)
  loginRate.set(key, hits)

  if (loginRate.size > 500) {
    for (const [k, v] of loginRate) {
      if (!v.some((t) => now - t < LOGIN_WINDOW_MS)) loginRate.delete(k)
    }
  }
  return true
}

export function resetLoginRate(phone: string) {
  loginRate.delete(phoneKey(phone))
}

/** 4 xonali kodni foydalanuvchining saqlangan hash'i bilan solishtiradi */
export function verifyPin(user: BotUser, pin: string): boolean {
  if (!user.pinHash || !user.pinSalt) return false
  const expected = Buffer.from(user.pinHash, 'hex')
  const actual = scryptSync(String(pin), user.pinSalt, 32)
  return expected.length === actual.length && timingSafeEqual(expected, actual)
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
        '🔐 <b>Prime Game Club</b>\n\n' +
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
