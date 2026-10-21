import { NextResponse } from 'next/server'
import { normalizePhone, verifyCode } from '@/lib/server/telegram-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json(
      { ok: false, error: 'bad_request', message: 'So‘rov noto‘g‘ri formatda' },
      { status: 400 },
    )
  }

  const { phone, code } = (body ?? {}) as { phone?: string; code?: string }
  const normalized = normalizePhone(phone ?? '')

  if (!code || !/^\d{4}$/.test(String(code))) {
    return NextResponse.json(
      { ok: false, error: 'invalid_code', message: 'Kod 4 xonali bo‘lishi kerak' },
      { status: 400 },
    )
  }

  const result = verifyCode(normalized, String(code))

  if (!result.ok) {
    const messages: Record<string, string> = {
      wrong_code: 'Kod noto‘g‘ri. Qayta tekshirib ko‘ring.',
      expired: 'Kod eskirgan yoki yuborilmagan. Yangi kod so‘rang.',
      too_many_attempts: 'Juda ko‘p noto‘g‘ri urinish. Yangi kod so‘rang.',
    }
    const status = result.error === 'too_many_attempts' ? 429 : 400
    return NextResponse.json(
      { ok: false, error: result.error, message: messages[result.error] },
      { status },
    )
  }

  return NextResponse.json({
    ok: true,
    user: {
      name: result.entry.name,
      phone: result.entry.phone,
      telegramChatId: result.entry.chatId,
    },
  })
}
