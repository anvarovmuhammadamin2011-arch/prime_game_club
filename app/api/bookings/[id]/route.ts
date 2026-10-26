import { NextResponse } from 'next/server'
import {
  calcTotal,
  notifyUserBookingStatus,
  readBookings,
  toWebBooking,
  updateBooking,
} from '@/lib/bookings-store.mjs'
import type { BookingStatus } from '@/lib/bookings-store.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES = new Set<BookingStatus>(['confirmed', 'rejected', 'completed'])
const ALLOWED_EXTRAS = new Set(['water', 'pepsi', 'redbull', 'sandwich'])

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = (await request.json().catch(() => null)) as {
    status?: unknown
    extras?: unknown
  } | null

  try {
    // Qo'shimcha xizmatlarni bron yaratilgandan keyin qo'shish.
    if (Array.isArray(body?.extras)) {
      const extras = body.extras.filter(
        (item): item is string => typeof item === 'string' && ALLOWED_EXTRAS.has(item),
      )
      const booking = (await readBookings()).find((b) => b.id === id)
      if (!booking) {
        return NextResponse.json({ ok: false, message: 'Bron topilmadi' }, { status: 404 })
      }
      if (booking.status !== 'pending') {
        return NextResponse.json(
          { ok: false, message: "Bron allaqachon ko'rib chiqilgan" },
          { status: 400 },
        )
      }

      const total = calcTotal(booking.zone, booking.hours, booking.seats, extras)
      const updated = await updateBooking(id, { extras, total })
      if (!updated) {
        return NextResponse.json({ ok: false, message: 'Bron topilmadi' }, { status: 404 })
      }
      return NextResponse.json({ ok: true, booking: toWebBooking(updated) })
    }

    const status = String(body?.status ?? '')
    if (!ALLOWED_STATUSES.has(status as BookingStatus)) {
      return NextResponse.json({ ok: false, message: "Holat noto'g'ri" }, { status: 400 })
    }

    const booking = await updateBooking(id, { status: status as BookingStatus })
    if (!booking) {
      return NextResponse.json({ ok: false, message: 'Bron topilmadi' }, { status: 404 })
    }

    await notifyUserBookingStatus(booking)
    return NextResponse.json({ ok: true, booking: toWebBooking(booking) })
  } catch (error) {
    console.error('bookings PATCH:', error)
    return NextResponse.json(
      { ok: false, message: 'Bronni yangilashda xatolik' },
      { status: 500 },
    )
  }
}
