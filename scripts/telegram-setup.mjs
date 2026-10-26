#!/usr/bin/env node
// Telegram webhook + Mini App menyu tugmasini bitta manzilga bog'laydi.
//
//   pnpm telegram:setup https://prime-game-club-lemon.vercel.app
//
// Arg yoki SITE_URL berilmasa — .env.local dagi SITE_URL ishlatiladi.
// Tunnel bilan lokal ishlaganda `pnpm tunnel` bu ishni o'zi qiladi.

import { setDefaultResultOrder } from 'node:dns'
import { setDefaultAutoSelectFamily } from 'node:net'

setDefaultResultOrder('ipv4first')
setDefaultAutoSelectFamily(false)

const TOKEN = process.env.TELEGRAM_BOT_TOKEN
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET
const URL_BASE = (process.argv[2] || process.env.SITE_URL || '').replace(/\/+$/, '')

if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN topilmadi (.env.local)')
  process.exit(1)
}
if (!/^https:\/\//i.test(URL_BASE)) {
  console.error('HTTPS manzil kerak: pnpm telegram:setup https://...')
  process.exit(1)
}

async function api(method, params) {
  const res = await fetch(`https://api.telegram.org/bot${TOKEN}/${method}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(params),
    signal: AbortSignal.timeout(20_000),
  })
  const data = await res.json().catch(() => ({}))
  if (!data.ok) throw new Error(data.description || `HTTP ${res.status}`)
  return data.result
}

try {
  await api('setWebhook', {
    url: `${URL_BASE}/api/telegram`,
    ...(SECRET ? { secret_token: SECRET } : {}),
    allowed_updates: ['message', 'callback_query'],
    drop_pending_updates: false,
  })
  await api('setChatMenuButton', {
    menu_button: { type: 'web_app', text: 'Mini App', web_app: { url: URL_BASE } },
  })
  await api('deleteMyCommands', { scope: { type: 'default' } })
  console.log(`✅ Webhook: ${URL_BASE}/api/telegram`)
  console.log(`✅ Menyu tugmasi: ${URL_BASE}`)
} catch (e) {
  console.error('❌', e.message)
  process.exit(1)
}
