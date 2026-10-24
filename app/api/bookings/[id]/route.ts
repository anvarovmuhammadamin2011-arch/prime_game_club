import { NextResponse } from 'next/server'
import {
  notifyUserBookingStatus,
  toWebBooking,
  updateBooking,
} from '@/lib/bookings-store.mjs'
import type { BookingStatus } from '@/lib/bookings-store.mjs'

export const runtime = 'nodejs'
export const dynamic = 'force-dynamic'

const ALLOWED_STATUSES = new Set<BookingStatus>(['confirmed', 'rejected', 'completed'])

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params
  const body = await request.json().catch(() => null)
  const status = String((body as { status?: unknown } | null)?.status ?? '')

  if (!ALLOWED_STATUSES.has(status as BookingStatus)) {
    return NextResponse.json(
      { ok: false, message: "Holat noto'g'ri" },
      { status: 400 },
    )
  }

  try {
    const booking = await updateBooking(id, { status: status as BookingStatus })
    if (!booking) {
      return NextResponse.json(
        { ok: false, message: 'Bron topilmadi' },
        { status: 404 },
      )
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
