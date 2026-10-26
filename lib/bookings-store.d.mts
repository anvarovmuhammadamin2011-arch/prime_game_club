export type BookingStatus = 'pending' | 'confirmed' | 'rejected' | 'completed'

export interface StoredBooking {
  id: string
  code: string
  chatId: number | null
  username: string | null
  name: string
  phone: string
  zone: string
  zoneName: string
  computerId: string | null
  computerLabel: string | null
  seats: number
  date: string
  time: string
  when: string
  hours: number
  extras: string[]
  total: number
  paymentMethod: string
  lang?: string
  status: BookingStatus
  createdAt: string
}

export interface BotUser {
  chatId: number
  phone: string
  name: string
  username?: string | null
  lang?: string | null
  pinHash?: string | null
  pinSalt?: string | null
  registeredAt?: string
}

export interface WebBooking {
  id: string
  userId: string
  userName: string
  phone: string
  code: string
  computerId: string
  computerLabel: string
  date: string
  startTime: string
  hours: number
  seats: number
  extras: string[]
  total: number
  paymentMethod: string
  lang?: string
  status: BookingStatus
  createdAt: string
}

export const DATA_DIR: string
export const BOOKINGS_FILE: string
export const USERS_FILE: string

export const ZONE_PRICES: Record<string, number>
export const ZONE_NAMES: Record<string, string>
export const EXTRA_PRICES: Record<string, number>
export const BOOKING_STATUS_LABELS: Record<string, string>

export function normalizePhone(raw: unknown): string
export function phoneKey(raw: unknown): string
export function localDate(date?: Date): string
export function addDays(dateStr: string, days: number): string
export function formatWhen(date: string, time: string): string
export function calcTotal(
  zone: string,
  hours: number,
  seats?: number,
  extras?: string[],
): number
export function normalizeBooking(raw?: Partial<StoredBooking>): StoredBooking

export function readBookings(): Promise<StoredBooking[]>
export function writeBookings(list: StoredBooking[]): Promise<void>
export function withBookingsLock<T>(fn: () => Promise<T> | T): Promise<T>
export function makeBookingCode(list: StoredBooking[], digits?: number): string
export function createBooking(
  input: Partial<StoredBooking> & {
    name: string
    phone: string
    zone: string
    date: string
    time: string
    hours: number
  },
): Promise<StoredBooking>
export function updateBooking(
  id: string,
  patch: Partial<StoredBooking>,
): Promise<StoredBooking | null>
export function findBookingByCode(code: string): Promise<StoredBooking | null>
export function findUserByPhone(phone: string): Promise<BotUser | null>
export function findUserByChatId(chatId: number | string): Promise<BotUser | null>
export function toWebBooking(booking: StoredBooking): WebBooking

export function sendTelegram(
  chatId: number | string,
  text: string,
  extra?: Record<string, unknown>,
): Promise<boolean>
export function notifyAdminNewBooking(booking: StoredBooking): Promise<boolean>
export function notifyUserNewBooking(booking: StoredBooking): Promise<boolean>
export function notifyUserBookingStatus(booking: StoredBooking): Promise<boolean>
export function adminBookingText(booking: StoredBooking): string
