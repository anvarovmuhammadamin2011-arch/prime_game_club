import { NextResponse } from 'next/server'
import { findUserByChatId } from '@/lib/bookings-store.mjs'
import { verifyInitData } from '@/lib/server/telegram-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

/**
 * Telegram Mini App initData'ni bot tokeni bilan tekshiradi.
 * Faqat botda ro'yxatdan o'tgan foydalanuvchini qaytaradi.
 */
export async function POST(request: Request) {
  if (!process.env.TELEGRAM_BOT_TOKEN) {
    return NextResponse.json(
      { ok: false, error: 'not_configured' },
      { status: 503 },
    )
  }

  const body = await request.json().catch(() => null)
  const initData = String((body as { initData?: unknown } | null)?.initData ?? '')

  const verified = verifyInitData(initData)
  if (!verified.ok) {
    const status =
      verified.error === 'expired' || verified.error === 'bad_hash' ? 401 : 400
    return NextResponse.json(
      { ok: false, error: verified.error },
      { status },
    )
  }

  const user = await findUserByChatId(verified.user.id)
  if (!user) {
    return NextResponse.json(
      { ok: false, error: 'not_registered' },
      { status: 404 },
    )
  }

  return NextResponse.json({
    ok: true,
    needs_password: !user.pinHash || !user.pinSalt,
    user: {
      name: user.name,
      phone: user.phone,
      chatId: user.chatId,
      lang: user.lang || null,
    },
  })
}
