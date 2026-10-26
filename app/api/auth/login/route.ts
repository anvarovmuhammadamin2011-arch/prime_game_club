import { NextResponse } from 'next/server'
import {
  checkLoginRate,
  findBotUserByPhone,
  linkUserChat,
  normalizePhone,
  resetLoginRate,
  verifyInitData,
  verifyPin,
} from '@/lib/server/telegram-auth'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const bad = (message: string, status: number, error: string) =>
  NextResponse.json({ ok: false, error, message }, { status })

export async function POST(req: Request) {
  let body: unknown
  try {
    body = await req.json()
  } catch {
    return bad('So‘rov noto‘g‘ri formatda', 400, 'bad_request')
  }

  const {
    phone: rawPhone,
    pin: rawPin,
    initData: rawInitData,
    lang: rawLang,
  } = (body ?? {}) as {
    phone?: string
    pin?: string
    initData?: string
    lang?: string
  }

  const phone = normalizePhone(rawPhone ?? '')
  if (phone.replace(/\D/g, '').length < 9) {
    return bad('Telefon raqamini to‘g‘ri kiriting', 400, 'invalid_phone')
  }

  const pin = String(rawPin ?? '').trim()
  if (pin.length < 4 || pin.length > 64) {
    return bad('Parol noto‘g‘ri', 400, 'invalid_pin')
  }

  if (!checkLoginRate(phone)) {
    return bad(
      'Juda ko‘p urinish. Iltimos, 10 daqiqadan keyin qayta urinib ko‘ring.',
      429,
      'too_many_requests',
    )
  }

  const user = await findBotUserByPhone(phone)
  if (!user) {
    return bad(
      'Bu raqam ro‘yxatdan o‘tmagan. Mini App yoki saytda ro‘yxatdan o‘ting.',
      404,
      'not_found',
    )
  }

  if (!user.pinHash || !user.pinSalt) {
    return bad(
      'Bu raqam uchun parol o‘rnatilmagan. Administratorga murojaat qiling.',
      409,
      'pin_not_set',
    )
  }

  if (!verifyPin(user, pin)) {
    return bad('Telefon raqami yoki parol noto‘g‘ri', 401, 'wrong_pin')
  }

  resetLoginRate(phone)

  // Mini App ichida kirilgan bo'lsa, hisobni Telegram chatiga bog'laymiz —
  // keyingi safar initData orqali avtomatik kiradi.
  let name = user.name
  const telegram = verifyInitData(String(rawInitData ?? ''))
  if (telegram.ok) {
    const linked = await linkUserChat(
      phone,
      telegram.user.id,
      telegram.user.username ?? null,
      rawLang ?? telegram.user.language_code ?? null,
    )
    if (linked) name = linked.name
  }

  return NextResponse.json({
    ok: true,
    user: {
      name,
      phone: normalizePhone(user.phone),
    },
  })
}
