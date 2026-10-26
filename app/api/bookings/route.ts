import { NextResponse } from 'next/server'
import {
  ZONE_NAMES,
  calcTotal,
  createBooking,
  findUserByPhone,
  formatWhen,
  notifyAdminNewBooking,
  notifyUserNewBooking,
  readBookings,
  toWebBooking,
} from '@/lib/bookings-store.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_EXTRAS = new Set(['water', 'pepsi', 'redbull', 'sandwich'])

function text(value: unknown, max = 80) {
  return String(value ?? '').trim().replace(/\s+/g, ' ').slice(0, max)
}

export async function GET() {
  try {
    const bookings = await readBookings()
    return NextResponse.json({ ok: true, bookings: bookings.map(toWebBooking) })
  } catch (error) {
    console.error('bookings GET:', error)
    return NextResponse.json(
      { ok: false, message: "Bronlarni o'qishda xatolik" },
      { status: 500 },
    )
  }
}

export async function POST(request: Request) {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ ok: false, message: "Ma'lumot yuborilmadi" }, { status: 400 })
  }

  const input = body as Record<string, unknown>
  const name = text(input.name)
  const phone = text(input.phone, 30)
  const zone = text(input.zone, 20) || 'VIP'
  const date = text(input.date, 10)
  const time = text(input.startTime ?? input.time, 5)
  const hours = Math.max(1, Math.min(24, Number(input.hours) || 1))
  const seats = Math.max(1, Math.min(6, Number(input.seats) || 1))
  const extras = Array.isArray(input.extras)
    ? input.extras.filter(
        (item): item is string => typeof item === 'string' && ALLOWED_EXTRAS.has(item),
      )
    : []

  if (!name || !phone) {
    return NextResponse.json(
      { ok: false, message: 'Ism va telefon raqami kerak' },
      { status: 400 },
    )
  }
  if (!Object.prototype.hasOwnProperty.call(ZONE_NAMES, zone)) {
    return NextResponse.json({ ok: false, message: "Zona noto'g'ri" }, { status: 400 })
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) {
    return NextResponse.json(
      { ok: false, message: "Sana yoki vaqt noto'g'ri" },
      { status: 400 },
    )
  }

  try {
    const user = await findUserByPhone(phone)
    const booking = await createBooking({
      chatId: user?.chatId || null,
      username: user?.username || null,
      name,
      phone,
      zone,
      zoneName: ZONE_NAMES[zone as keyof typeof ZONE_NAMES],
      computerId: text(input.computerId, 40) || null,
      computerLabel: text(input.computerLabel, 40) || null,
      seats,
      date,
      time,
      when: formatWhen(date, time),
      hours,
      extras,
      total: calcTotal(zone, hours, seats, extras),
      paymentMethod: 'cash',
      lang: user?.lang || 'uz',
      status: 'pending',
    })

    // Telegram sozlanmagan bo'lsa ham bron saqlanadi.
    await notifyAdminNewBooking(booking)
    await notifyUserNewBooking(booking)

    return NextResponse.json(
      { ok: true, booking: toWebBooking(booking) },
      { status: 201 },
    )
  } catch (error) {
    console.error('bookings POST:', error)
    return NextResponse.json(
      { ok: false, message: 'Bronni saqlashda xatolik' },
      { status: 500 },
    )
  }
}
