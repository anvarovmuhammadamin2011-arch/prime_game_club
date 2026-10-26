import { NextResponse } from 'next/server'
import { setBotUserPassword, verifyInitData } from '@/lib/server/telegram-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bad = (message: string, status: number, error: string) =>
  NextResponse.json({ ok: false, error, message }, { status })

/**
 * Botda telefon raqamini ulashgan foydalanuvchi Mini App'da birinchi marta
 * parol o'rnatadi. Keyingi kirishlar telefon + parol orqali bo'ladi.
 */
export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    password?: unknown
    initData?: unknown
  } | null

  const verified = verifyInitData(String(body?.initData ?? ''))
  if (!verified.ok) {
    const status =
      verified.error === 'expired' || verified.error === 'bad_hash' ? 401 : 400
    return bad('Telegram ma’lumoti tasdiqlanmadi', status, verified.error)
  }

  const password = String(body?.password ?? '').trim()
  if (password.length < 6 || password.length > 64) {
    return bad('Parol kamida 6 belgidan iborat bo‘lishi kerak', 400, 'invalid_password')
  }

  const result = await setBotUserPassword(verified.user.id, password)
  if (!result.ok) {
    if (result.error === 'already_set') {
      return bad('Parol allaqachon o‘rnatilgan', 409, 'already_set')
    }
    return bad('Foydalanuvchi topilmadi. Botda raqamni qayta ulashing.', 404, 'not_found')
  }

  return NextResponse.json({
    ok: true,
    user: {
      name: result.user.name,
      phone: result.user.phone,
    },
  })
}
