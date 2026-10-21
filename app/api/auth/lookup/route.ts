import { NextResponse } from 'next/server'
import {
  checkRateLimit,
  findBotUserByPhone,
  issueCode,
  maskPhone,
  normalizePhone,
  sendCode,
} from '@/lib/server/telegram-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const BOT_URL = 'https://t.me/legionclubrobot'

const bad = (message: string, status: number, error: string) =>
  NextResponse.json({ ok: false, error, message }, { status })

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return bad('So‘rov noto‘g‘ri formatda', 400, 'bad_request')
  }

  const phone = normalizePhone((body as { phone?: string })?.phone ?? '')
  if (phone.replace(/\D/g, '').length < 9) {
    return bad('Telefon raqamini to‘g‘ri kiriting', 400, 'invalid_phone')
  }

  const user = await findBotUserByPhone(phone)
  if (!user) {
    return bad(
      'Bu raqam Telegram botimizga hali ulanmagan. @legionclubrobot ga o‘tib /start bosing va raqamingizni yuboring.',
      404,
      'not_found',
    )
  }

  if (!checkRateLimit(phone)) {
    return bad(
      'Juda ko‘p urinish. Iltimos, 10 daqiqadan keyin qayta urinib ko‘ring.',
      429,
      'too_many_requests',
    )
  }

  const entry = issueCode(user)

  try {
    await sendCode(entry.chatId, entry.code)
  } catch (e) {
    console.error('Kod yuborishda xatolik:', e)
    return bad(
      'Kodni Telegram’ga yuborib bo‘lmadi. Botni bloklamaganligingizni tekshirib, qayta urinib ko‘ring.',
      502,
      'send_failed',
    )
  }

  return NextResponse.json({
    ok: true,
    name: entry.name,
    phone: maskPhone(phone),
    botUrl: BOT_URL,
    expiresIn: Math.round((entry.expiresAt - Date.now()) / 1000),
  })
}
