import { createHmac, timingSafeEqual } from 'node:crypto'
import { NextResponse } from 'next/server'
import { findUserByChatId } from '@/lib/bookings-store.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

type TelegramUser = {
  id?: number
  first_name?: string
  last_name?: string
  username?: string
}

/**
 * Telegram Mini App initData'ni bot tokeni bilan tekshiradi.
 * Faqat botda ro'yxatdan o'tgan foydalanuvchini qaytaradi.
 */
export async function POST(request: Request) {
  const token = process.env.TELEGRAM_BOT_TOKEN
  if (!token) {
    return NextResponse.json(
      { ok: false, error: 'not_configured' },
      { status: 503 },
    )
  }

  const body = await request.json().catch(() => null)
  const initData = String((body as { initData?: unknown } | null)?.initData ?? '')
  if (!initData) {
    return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 })
  }

  const params = new URLSearchParams(initData)
  const hash = params.get('hash') || ''
  params.delete('hash')

  const dataCheckString = [...params.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join('\n')

  const secret = createHmac('sha256', 'WebAppData').update(token).digest()
  const computed = createHmac('sha256', secret).update(dataCheckString).digest('hex')

  const provided = Buffer.from(hash, 'hex')
  const expected = Buffer.from(computed, 'hex')
  if (
    provided.length !== expected.length ||
    !timingSafeEqual(provided, expected)
  ) {
    return NextResponse.json({ ok: false, error: 'bad_hash' }, { status: 401 })
  }

  const authDate = Number(params.get('auth_date') || 0)
  if (!authDate || Date.now() / 1000 - authDate > 86_400) {
    return NextResponse.json({ ok: false, error: 'expired' }, { status: 401 })
  }

  let telegramUser: TelegramUser | null = null
  try {
    telegramUser = JSON.parse(params.get('user') || 'null')
  } catch {
    telegramUser = null
  }
  if (!telegramUser?.id) {
    return NextResponse.json({ ok: false, error: 'bad_user' }, { status: 400 })
  }

  const user = await findUserByChatId(telegramUser.id)
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'not_registered' },
      { status: 404 },
    )
  }

  return NextResponse.json({
    ok: true,
    user: {
      name: user.name,
      phone: user.phone,
      chatId: user.chatId,
    },
  })
}
