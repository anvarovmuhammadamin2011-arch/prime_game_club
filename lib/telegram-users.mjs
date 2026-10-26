// Telegram kontakt orqali kelgan telefon raqamini users.json ga yozadi.
// Bot (bot/index.mjs) va Vercel webhook ikkalasi ham shu moduldan foydalanadi.

import { readJson, writeJson } from './storage.mjs'
import { normalizePhone, phoneKey } from './bookings-store.mjs'

let queue = Promise.resolve()

function withUsersLock(fn) {
  const run = queue.then(fn, fn)
  queue = run.catch(() => {})
  return run
}

/**
 * Telefon raqami bo'yicha mavjud hisobni topadi yoki yangisini yaratadi
 * (parolsiz). chatId har doim Telegram foydalanuvchisiga bog'lanadi.
 */
export async function upsertTelegramUser({
  chatId,
  phone,
  name,
  username = null,
  lang = null,
}) {
  if (!chatId || !phone) return null

  return withUsersLock(async () => {
    const parsed = await readJson('users.json', [])
    const users = Array.isArray(parsed) ? parsed : []

    const key = phoneKey(phone)
    const byPhone = users.findIndex((u) => phoneKey(u.phone) === key)
    const byChat = users.findIndex((u) => String(u.chatId) === String(chatId))
    const index = byPhone >= 0 ? byPhone : byChat

    if (index >= 0) {
      // Boshqa hisob shu chatga bog'langan bo'lsa, uni uzamiz.
      if (byPhone >= 0 && byChat >= 0 && byPhone !== byChat) {
        users[byChat] = { ...users[byChat], chatId: 0 }
      }

      const current = users[index]
      const updated = {
        ...current,
        chatId,
        phone: normalizePhone(phone),
        name: current.name || name || 'Mehmon',
        username: username ?? current.username ?? null,
        lang: lang ?? current.lang ?? null,
      }
      users[index] = updated
      await writeJson('users.json', users)
      return updated
    }

    const user = {
      chatId,
      phone: normalizePhone(phone),
      name: (name || '').trim() || 'Mehmon',
      username,
      lang,
      registeredAt: new Date().toISOString(),
    }
    users.push(user)
    await writeJson('users.json', users)
    return user
  })
}
