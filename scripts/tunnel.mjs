#!/usr/bin/env node
// Lokal saytni Cloudflare quick tunnel orqali HTTPS bilan ochadi
// va Telegram bot menyusidagi Mini App tugmasini yangilaydi.
//
//   pnpm tunnel
//
// Diqqat: quick tunnel URL har ishga tushirishda o'zgaradi.

import { spawn } from 'node:child_process'
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'

const ROOT = path.resolve(import.meta.dirname, '..')
const ENV_FILE = path.join(ROOT, '.env.local')
const LOCAL_URL = process.env.LOCAL_URL || 'http://localhost:3000'
const TOKEN = process.env.TELEGRAM_BOT_TOKEN

if (!TOKEN) {
  console.error('TELEGRAM_BOT_TOKEN topilmadi (.env.local)')
  process.exit(1)
}

const child = spawn(
  process.env.CLOUDFLARED || 'cloudflared',
  ['tunnel', '--url', LOCAL_URL, '--no-autoupdate'],
  { stdio: ['ignore', 'pipe', 'pipe'] },
)

let announced = false

async function onUrl(url) {
  if (announced) return
  announced = true

  console.log(`\n✅ Mini App URL: ${url}\n`)

  try {
    const env = await readFile(ENV_FILE, 'utf8')
    const next = /^SITE_URL=.*$/m.test(env)
      ? env.replace(/^SITE_URL=.*$/m, `SITE_URL=${url}`)
      : `${env.trimEnd()}\nSITE_URL=${url}\n`
    await writeFile(ENV_FILE, next, 'utf8')
    console.log('   .env.local -> SITE_URL yangilandi')
  } catch (e) {
    console.warn('   .env.local yangilanmadi:', e.message)
  }

  try {
    const res = await fetch(`https://api.telegram.org/bot${TOKEN}/setChatMenuButton`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        menu_button: {
          type: 'web_app',
          text: 'Mini App',
          web_app: { url },
        },
      }),
    })
    const data = await res.json().catch(() => null)
    if (data?.ok) console.log('   Bot menyu tugmasi yangilandi')
    else console.warn('   Menyu tugmasi yangilanmadi:', data?.description)
  } catch (e) {
    console.warn('   Telegram bilan aloqa yo‘q:', e.message)
  }

  console.log('\n   /start tugmalari ham yangilanishi uchun: pnpm bot\n')
}

function scan(chunk) {
  const text = chunk.toString()
  if (announced) return
  const m = text.match(/https:\/\/[a-z0-9-]+\.trycloudflare\.com/i)
  if (m) onUrl(m[0].toLowerCase())
}

child.stdout.on('data', scan)
child.stderr.on('data', scan)

child.on('exit', (code) => {
  console.log(`cloudflared to‘xtadi (code ${code})`)
  process.exit(code ?? 0)
})

for (const sig of ['SIGINT', 'SIGTERM']) {
  process.on(sig, () => {
    child.kill('SIGINT')
    setTimeout(() => process.exit(0), 500)
  })
}
