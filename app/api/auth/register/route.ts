import { NextResponse } from 'next/server'
import {
  createBotUser,
  normalizePhone,
  verifyInitData,
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
    name: rawName,
    phone: rawPhone,
    pin: rawPin,
    initData: rawInitData,
    lang: rawLang,
  } = (body ?? {}) as {
    name?: string
    phone?: string
    pin?: string
    initData?: string
    lang?: string
  }

  const name = String(rawName ?? '')
    .trim()
    .replace(/\s+/g, ' ')

  if (name.length < 2) {
    return bad('Ismingizni to‘liq kiriting', 400, 'invalid_name')
  }
  if (name.length > 80) {
    return bad('Ism juda uzun', 400, 'invalid_name')
  }

  const digits = String(rawPhone ?? '').replace(/\D/g, '')
  if (!/^\d{9}$/.test(digits) && !/^998\d{9}$/.test(digits)) {
    return bad(
      'Telefon raqamini to‘g‘ri kiriting. Masalan: +998 90 123 45 67',
      400,
      'invalid_phone',
    )
  }
  const phone = normalizePhone(digits)

  const pin = String(rawPin ?? '').trim()
  if (pin.length < 6 || pin.length > 64) {
    return bad('Parol kamida 6 belgidan iborat bo‘lishi kerak', 400, 'invalid_pin')
  }

  // Mini App ichida ro'yxatdan o'tilgan bo'lsa, chat darhol bog'lanadi va
  // keyingi ochilishlarda avtomatik kirish ishlaydi.
  const telegram = verifyInitData(String(rawInitData ?? ''))

  try {
    const result = await createBotUser({
      name,
      phone,
      pin,
      chatId: telegram.ok ? telegram.user.id : 0,
      username: telegram.ok ? (telegram.user.username ?? null) : null,
      lang: rawLang ?? (telegram.ok ? telegram.user.language_code : null),
    })

    if (!result.ok) {
      return bad(
        'Bu raqam allaqachon ro‘yxatdan o‘tgan. Kirish bo‘limidan foydalaning.',
        409,
        'already_exists',
      )
    }

    return NextResponse.json({
      ok: true,
      user: {
        name: result.user.name,
        phone: result.user.phone,
      },
    })
  } catch (e) {
    console.error('Ro‘yxatdan o‘tishda xatolik:', e)
    return bad(
      "Hisobni saqlab bo‘lmadi. Qayta urinib ko‘ring yoki administratorga murojaat qiling.",
      500,
      'save_failed',
    )
  }
}
