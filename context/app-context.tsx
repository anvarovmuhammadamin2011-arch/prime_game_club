'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react'
import type {
  BarProduct,
  Booking,
  Combo,
  Computer,
  Expense,
  Lang,
  Notification,
  Promo,
  Role,
  Staff,
  User,
} from '@/lib/types'
import {
  INITIAL_BAR_PRODUCTS,
  INITIAL_BAR_SALES,
  INITIAL_BOOKINGS,
  INITIAL_COMBOS,
  INITIAL_COMPUTERS,
  INITIAL_EXPENSES,
  INITIAL_PROMOS,
  INITIAL_STAFF,
  INITIAL_USERS,
} from '@/lib/mock-data'
import type { BarSale, AuditEntry } from '@/lib/types'
import { translate } from '@/lib/translations'
import { uid, nowStamp } from '@/lib/format'
import { normalizePhone, phoneKey } from '@/lib/phone'
import { buildPcSession, formatClock, localDateStr } from '@/lib/pc-session.mjs'

interface AppState {
  currentUser: User | null
  users: User[]
  computers: Computer[]
  bookings: Booking[]
  barProducts: BarProduct[]
  barSales: BarSale[]
  combos: Combo[]
  staff: Staff[]
  promos: Promo[]
  expenses: Expense[]
  auditLog: AuditEntry[]
  notifications: Notification[]
  language: Lang
  theme: 'light' | 'dark'
  hydrated: boolean
}

interface AppContextValue extends AppState {
  t: (key: string, vars?: Record<string, string | number>) => string
  setLanguage: (l: Lang) => void
  toggleTheme: () => void
  login: (phone: string, password: string, silent?: boolean) => { success: boolean; role?: Role }
  logout: () => void
  register: (name: string, phone: string, password: string) => boolean
  registerVerified: (name: string, phone: string) => boolean
  createBooking: (data: Omit<Booking, 'id' | 'status' | 'createdAt' | 'userId' | 'userName'>) => Promise<{
    ok: boolean
    code?: string
    id?: string
    error?: string
  }>
  confirmBooking: (id: string) => Promise<void>
  rejectBooking: (id: string) => Promise<void>
  refreshBookings: () => Promise<void>
  setMaintenanceMode: (id: string, on: boolean) => void
  startPcSession: (
    computerId: string,
    date: string,
    startTime: string,
    hours: number,
    bookingId?: string,
  ) => boolean
  stopPcSession: (computerId: string) => void
  sellBarProduct: (productId: string, qty: number) => void
  addBarProduct: (data: Omit<BarProduct, 'id'>) => void
  addExpense: (data: Omit<Expense, 'id'>) => void
  addPromoCode: (data: Omit<Promo, 'id' | 'uses' | 'active'>) => void
  togglePromo: (id: string) => void
  redeemBonusPoints: () => void
  toggleFavorite: (id: string) => void
  updatePrice: (type: string, price: number) => void
  showNotification: (message: string, type?: Notification['type']) => void
  dismissNotification: (id: string) => void
  pendingCount: number
}

const AppContext = createContext<AppContextValue | null>(null)

const STORAGE_KEY = 'prime-game-club-state-v2'
const LEGACY_STORAGE_KEY = 'legion-game-club-state-v2'
const DEMO_USER_IDS = new Set(['u1', 'u2'])

/**
 * Kompyuterlar ro'yxati configdan olinadi (lib/mock-data.ts).
 * Eski localStorage'da qolgan ro'yxatni yangilaymiz, lekin mavjud
 * statuslarni (band/texnik) saqlab qolamiz.
 */
function syncComputers(stored: Computer[] | undefined): Computer[] {
  if (!Array.isArray(stored) || stored.length === 0) return INITIAL_COMPUTERS

  // Eski ro'yxat (masalan, 20 PC + 2 PS5) bo'lsa — configdagi yangi
  // ro'yxatga o'tamiz. Mos kelsa, mavjud statuslarni saqlab qolamiz.
  const expectedIds = new Set(INITIAL_COMPUTERS.map((c) => c.id))
  const sameInventory =
    stored.length === INITIAL_COMPUTERS.length &&
    stored.every((c) => expectedIds.has(c.id))
  if (!sameInventory) return INITIAL_COMPUTERS

  const byId = new Map(stored.map((c) => [c.id, c]))
  return INITIAL_COMPUTERS.map((c) => {
    const previous = byId.get(c.id)
    if (!previous) return c
    return {
      ...c,
      status: previous.status,
      sessionStartedAt: previous.sessionStartedAt ?? null,
      sessionEndsAt: previous.sessionEndsAt ?? null,
      sessionBookingId: previous.sessionBookingId ?? null,
    }
  })
}

/**
 * Seed hisoblarni (admin/superadmin) configdan yangilaymiz, saytda
 * ro'yxatdan o'tgan foydalanuvchilarni saqlab qolamiz.
 */
function syncUsers(stored: User[] | undefined): User[] {
  if (!Array.isArray(stored)) return INITIAL_USERS
  const seeded = new Map(INITIAL_USERS.map((u) => [u.id, u]))
  const merged = stored
    .filter((u) => !DEMO_USER_IDS.has(u.id))
    .map((u) => seeded.get(u.id) ?? u)
  for (const u of INITIAL_USERS) {
    if (!stored.some((s) => s.id === u.id)) merged.push(u)
  }
  return merged
}

// Birinchi versiyadagi bar menyusi (chips, burger va h.k.) yangi
// menyuga o'tkaziladi; keyin qo'shilgan mahsulotlar saqlanadi.
const LEGACY_BAR_NAMES = new Set([
  'Lays Chips',
  'Snickers',
  'Burger',
  'Hot-Dog',
  'Cheesecake',
  'Espresso',
])

function syncBarProducts(stored: BarProduct[] | undefined): BarProduct[] {
  if (!Array.isArray(stored)) return INITIAL_BAR_PRODUCTS
  if (stored.some((p) => LEGACY_BAR_NAMES.has(p.name))) return INITIAL_BAR_PRODUCTS
  return stored
}

// Demo hisob bilan sahifa ochilganda avtomatik kirib qolmasin.
function syncCurrentUser(stored: User | null | undefined): User | null {
  if (!stored) return null
  return DEMO_USER_IDS.has(stored.id) ? null : stored
}

export function AppProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AppState>({
    currentUser: null,
    users: INITIAL_USERS,
    computers: INITIAL_COMPUTERS,
    bookings: INITIAL_BOOKINGS,
    barProducts: INITIAL_BAR_PRODUCTS,
    barSales: INITIAL_BAR_SALES,
    combos: INITIAL_COMBOS,
    staff: INITIAL_STAFF,
    promos: INITIAL_PROMOS,
    expenses: INITIAL_EXPENSES,
    auditLog: [],
    notifications: [],
    language: 'uz',
    theme: 'dark',
    hydrated: false,
  })
  const latestState = useRef(state)
  latestState.current = state
  const remindedBookings = useRef<Set<string>>(new Set())

  // hydrate from localStorage
  useEffect(() => {
    try {
      const raw =
        localStorage.getItem(STORAGE_KEY) ?? localStorage.getItem(LEGACY_STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setState((s) => ({
          ...s,
          ...parsed,
          currentUser: syncCurrentUser(parsed.currentUser),
          computers: syncComputers(parsed.computers),
          users: syncUsers(parsed.users),
          barProducts: syncBarProducts(parsed.barProducts),
          notifications: [],
          hydrated: true,
        }))
      } else {
        const preferred: Lang = navigator.language
          ?.toLowerCase()
          .startsWith('ru')
          ? 'ru'
          : 'uz'
        setState((s) => ({ ...s, language: preferred, hydrated: true }))
      }
    } catch {
      setState((s) => ({ ...s, hydrated: true }))
    }
  }, [])

  // persist
  useEffect(() => {
    if (!state.hydrated) return
    const { notifications, hydrated, ...rest } = state
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(rest))
    } catch {
      /* ignore */
    }
  }, [state])

  // theme class
  useEffect(() => {
    const root = document.documentElement
    if (state.theme === 'dark') root.classList.add('dark')
    else root.classList.remove('dark')
  }, [state.theme])

  // tanlangan tilni hujjatga ham yozamiz (screen reader / brauzer uchun)
  useEffect(() => {
    document.documentElement.lang = state.language
  }, [state.language])

  const showNotification = useCallback(
    (message: string, type: Notification['type'] = 'info') => {
      const id = uid('n')
      setState((s) => ({
        ...s,
        // Ko'p bron tasdiqlansa ham navbat bilan bittadan chiqadi.
        notifications: [...s.notifications, { id, message, type }].slice(-30),
      }))
    },
    [],
  )

  const dismissNotification = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      notifications: s.notifications.filter((n) => n.id !== id),
    }))
  }, [])

  const t = useCallback(
    (key: string, vars?: Record<string, string | number>) =>
      translate(state.language, key, vars),
    [state.language],
  )

  const setLanguage = useCallback((l: Lang) => {
    setState((s) => ({ ...s, language: l }))
  }, [])

  const toggleTheme = useCallback(() => {
    setState((s) => ({ ...s, theme: s.theme === 'dark' ? 'light' : 'dark' }))
  }, [])

  const login = useCallback(
    (phone: string, password: string, silent = false) => {
      const user = state.users.find(
        (u) => u.phone === phone.trim() && u.password === password,
      )
      if (!user) {
        if (!silent) showNotification(t('nWrongLogin'), 'error')
        return { success: false }
      }
      setState((s) => ({ ...s, currentUser: user }))
      showNotification(t('nWelcome', { name: user.name }), 'success')
      return { success: true, role: user.role }
    },
    [state.users, showNotification, t],
  )

  const logout = useCallback(() => {
    setState((s) => ({ ...s, currentUser: null }))
  }, [])

  const register = useCallback(
    (name: string, phone: string, password: string) => {
      if (state.users.some((u) => u.phone === phone.trim())) {
        showNotification(t('nPhoneExists'), 'error')
        return false
      }
      const newUser: User = {
        id: uid('u'),
        name,
        phone: phone.trim(),
        password,
        role: 'user',
        bonusPoints: 0,
        referralCode: name.slice(0, 4).toUpperCase() + '2026',
        favorites: [],
        joinedAt: new Date().toISOString().slice(0, 10),
        hoursPlayed: 0,
      }
      setState((s) => ({ ...s, users: [...s.users, newUser], currentUser: newUser }))
      showNotification(t('nRegisteredBonus'), 'success')
      return true
    },
    [state.users, showNotification, t],
  )

  const registerVerified = useCallback(
    (name: string, phone: string) => {
      const key = phoneKey(phone)
      const existing = state.users.find((u) => phoneKey(u.phone) === key)

      if (existing) {
        setState((s) => ({ ...s, currentUser: existing }))
        showNotification(t('nWelcome', { name: existing.name }), 'success')
        return true
      }

      const cleanName = name.trim() || t('guest')
      const newUser: User = {
        id: uid('u'),
        name: cleanName,
        phone: normalizePhone(phone),
        password: 'telegram-auth',
        role: 'user',
        bonusPoints: 0,
        referralCode: cleanName.slice(0, 4).toUpperCase() + '2026',
        favorites: [],
        joinedAt: new Date().toISOString().slice(0, 10),
        hoursPlayed: 0,
      }
      setState((s) => ({ ...s, users: [...s.users, newUser], currentUser: newUser }))
      showNotification(t('nRegistered'), 'success')
      return true
    },
    [state.users, showNotification, t],
  )

  const refreshBookings = useCallback(async () => {
    try {
      const res = await fetch('/api/bookings', { cache: 'no-store' })
      const payload = (await res.json().catch(() => null)) as
        | { ok?: boolean; bookings?: Booking[] }
        | null
      if (res.ok && payload?.ok && Array.isArray(payload.bookings)) {
        setState((s) => ({ ...s, bookings: payload.bookings as Booking[] }))
      }
    } catch {
      /* server vaqtincha ishlamasa, lokal holat qoladi */
    }
  }, [])

  useEffect(() => {
    if (!state.hydrated) return
    void refreshBookings()
    const timer = setInterval(() => {
      void refreshBookings()
    }, 20_000)
    return () => clearInterval(timer)
  }, [state.hydrated, refreshBookings])

  // Sessiya vaqti kelganda PC'ni band qilamiz, tugaganda bo'shatamiz.
  // shortcut: taymer faqat panel ochiq turganda ishlaydi; real PC control
  // kerak bo'lsa sessiyani serverga ko'chirish kerak.
  useEffect(() => {
    if (!state.hydrated) return

    const tick = async () => {
      const now = Date.now()
      const current = latestState.current
      const due = current.computers.filter(
        (c) => c.sessionEndsAt && new Date(c.sessionEndsAt).getTime() <= now,
      )

      if (due.length > 0) {
        const completed = new Set<string>()
        for (const pc of due) {
          if (!pc.sessionBookingId) continue
          try {
            const res = await fetch(
              `/api/bookings/${encodeURIComponent(pc.sessionBookingId)}`,
              {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ status: 'completed' }),
              },
            )
            if (res.ok) completed.add(pc.sessionBookingId)
          } catch {
            /* server vaqtincha ishlamasa, sessiya baribir o'chadi */
          }
        }

        setState((s) => ({
          ...s,
          computers: s.computers.map((c) =>
            c.sessionEndsAt && new Date(c.sessionEndsAt).getTime() <= now
              ? {
                  ...c,
                  status: c.status === 'maintenance' ? 'maintenance' : 'available',
                  sessionStartedAt: null,
                  sessionEndsAt: null,
                  sessionBookingId: null,
                }
              : c,
          ),
          bookings: completed.size
            ? s.bookings.map((b) =>
                completed.has(b.id) ? { ...b, status: 'completed' } : b,
              )
            : s.bookings,
        }))
      }

      const starting = current.computers.filter(
        (c) =>
          c.sessionStartedAt &&
          c.sessionEndsAt &&
          new Date(c.sessionStartedAt).getTime() <= now &&
          new Date(c.sessionEndsAt).getTime() > now &&
          c.status !== 'booked' &&
          c.status !== 'maintenance',
      )
      if (starting.length > 0) {
        const ids = new Set(starting.map((c) => c.id))
        setState((s) => ({
          ...s,
          computers: s.computers.map((c) =>
            ids.has(c.id) ? { ...c, status: 'booked' } : c,
          ),
        }))
      }
    }

    void tick()
    const timer = setInterval(() => {
      void tick()
    }, 20_000)
    return () => clearInterval(timer)
  }, [state.hydrated])

  // Bron boshlanish vaqtida adminga eslatma.
  const currentRole = state.currentUser?.role
  useEffect(() => {
    if (!state.hydrated) return
    if (currentRole !== 'admin' && currentRole !== 'superadmin') return

    const tick = () => {
      const now = new Date()
      const today = localDateStr(now)
      for (const b of latestState.current.bookings) {
        if (b.status !== 'confirmed' || b.date !== today) continue
        if (remindedBookings.current.has(b.id)) continue

        const [h, m] = b.startTime.split(':').map(Number)
        if (!Number.isFinite(h) || !Number.isFinite(m)) continue

        const start = new Date(now)
        start.setHours(h, m, 0, 0)
        const diff = now.getTime() - start.getTime()
        if (diff < 0 || diff > 5 * 60_000) continue

        const pc = latestState.current.computers.find(
          (c) =>
            (b.computerId && c.id === b.computerId) ||
            c.label === b.computerLabel,
        )
        if (pc?.sessionBookingId === b.id) continue

        remindedBookings.current.add(b.id)
        showNotification(
          t('nBookingStarting', {
            time: b.startTime,
            name: b.userName,
            pc: b.computerLabel,
          }),
          'warning',
        )
      }
    }

    tick()
    const timer = setInterval(tick, 20_000)
    return () => clearInterval(timer)
  }, [state.hydrated, currentRole, showNotification, t])

  const createBooking = useCallback(
    async (
      data: Omit<Booking, 'id' | 'status' | 'createdAt' | 'userId' | 'userName'>,
    ) => {
      const user = state.currentUser
      if (!user) return { ok: false, error: t('nLoginFirst') }
      if (data.paymentMethod !== 'cash') {
        return { ok: false, error: t('nCashOnly') }
      }

      const computer = state.computers.find((c) => c.id === data.computerId)

      try {
        const res = await fetch('/api/bookings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: user.name,
            phone: user.phone,
            zone: computer?.type || 'VIP',
            computerId: data.computerId,
            computerLabel: data.computerLabel,
            seats: data.seats || 1,
            date: data.date,
            startTime: data.startTime,
            hours: data.hours,
            extras: data.extras,
            paymentMethod: data.paymentMethod,
          }),
        })
        const payload = (await res.json().catch(() => null)) as
          | { ok?: boolean; booking?: Booking; message?: string }
          | null

        if (!res.ok || !payload?.ok || !payload.booking) {
          const message = payload?.message || t('nBookingFailed')
          showNotification(message, 'error')
          return { ok: false, error: message }
        }

        const booking = payload.booking
        const bonusEarned = Math.round((booking.total || data.total || 0) * 0.01)
        setState((s) => {
          const users = s.users.map((u) =>
            u.id === user.id ? { ...u, bonusPoints: u.bonusPoints + bonusEarned } : u,
          )
          return {
            ...s,
            bookings: [booking, ...s.bookings.filter((b) => b.id !== booking.id)],
            users,
            currentUser: users.find((u) => u.id === user.id) ?? s.currentUser,
            computers: s.computers.map((c) =>
              c.id === data.computerId && c.status !== 'maintenance'
                ? { ...c, status: 'pending' }
                : c,
            ),
          }
        })
        showNotification(t('nBookingCreated'), 'success')
        return { ok: true, code: booking.code, id: booking.id }
      } catch {
        showNotification(t('nNoServer'), 'error')
        return { ok: false, error: t('nNoServer') }
      }
    },
    [state.currentUser, state.computers, showNotification, t],
  )

  const confirmBooking = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/bookings/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'confirmed' }),
        })
        const payload = (await res.json().catch(() => null)) as
          | { ok?: boolean; message?: string }
          | null
        if (!res.ok || !payload?.ok) {
          showNotification(payload?.message || t('nConfirmError'), 'error')
          return
        }
        setState((s) => {
          const current = s.bookings.find((b) => b.id === id)
          return {
            ...s,
            bookings: s.bookings.map((b) =>
              b.id === id ? { ...b, status: 'confirmed' } : b,
            ),
            computers: s.computers.map((c) =>
              c.id === current?.computerId && c.status !== 'maintenance'
                ? { ...c, status: 'booked' }
                : c,
            ),
            auditLog: [
              {
                id: uid('au'),
                action: t('auditConfirmed', { id }),
                by: s.currentUser?.name ?? 'system',
                at: nowStamp(),
              },
              ...s.auditLog,
            ],
          }
        })
        showNotification(t('nConfirmed'), 'success')
      } catch {
        showNotification(t('nNoServer'), 'error')
      }
    },
    [showNotification, t],
  )

  const rejectBooking = useCallback(
    async (id: string) => {
      try {
        const res = await fetch(`/api/bookings/${encodeURIComponent(id)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'rejected' }),
        })
        const payload = (await res.json().catch(() => null)) as
          | { ok?: boolean; message?: string }
          | null
        if (!res.ok || !payload?.ok) {
          showNotification(payload?.message || t('nRejectError'), 'error')
          return
        }
        setState((s) => {
          const current = s.bookings.find((b) => b.id === id)
          return {
            ...s,
            bookings: s.bookings.map((b) =>
              b.id === id ? { ...b, status: 'rejected' } : b,
            ),
            computers: s.computers.map((c) =>
              c.id === current?.computerId &&
              !c.sessionEndsAt &&
              c.status !== 'maintenance'
                ? { ...c, status: 'available' }
                : c,
            ),
            auditLog: [
              {
                id: uid('au'),
                action: t('auditRejected', { id }),
                by: s.currentUser?.name ?? 'system',
                at: nowStamp(),
              },
              ...s.auditLog,
            ],
          }
        })
        showNotification(t('nRejected'), 'warning')
      } catch {
        showNotification(t('nNoServer'), 'error')
      }
    },
    [showNotification, t],
  )

  const setMaintenanceMode = useCallback((id: string, on: boolean) => {
    setState((s) => ({
      ...s,
      computers: s.computers.map((c) =>
        c.id === id
          ? {
              ...c,
              status: on ? 'maintenance' : c.sessionEndsAt ? 'booked' : 'available',
              sessionStartedAt: on ? null : c.sessionStartedAt,
              sessionEndsAt: on ? null : c.sessionEndsAt,
              sessionBookingId: on ? null : c.sessionBookingId,
            }
          : c,
      ),
    }))
    showNotification(t(on ? 'nMaintenanceOn' : 'nMaintenanceOff'), 'info')
  }, [showNotification, t])

  const startPcSession = useCallback(
    (
      computerId: string,
      date: string,
      startTime: string,
      hours: number,
      bookingId?: string,
    ) => {
      const pc = state.computers.find((c) => c.id === computerId)
      if (!pc) return false
      if (pc.status === 'maintenance') {
        showNotification(t('nPcMaintenance'), 'error')
        return false
      }
      if (pc.sessionEndsAt) {
        if (bookingId && pc.sessionBookingId === bookingId) return true
        showNotification(t('nPcBusy'), 'error')
        return false
      }

      const session = buildPcSession(date || localDateStr(), startTime, hours)
      if (!session || new Date(session.end).getTime() <= Date.now()) {
        showNotification(t('nTimeInvalid'), 'error')
        return false
      }

      const active = new Date(session.start).getTime() <= Date.now()
      setState((s) => ({
        ...s,
        computers: s.computers.map((c) =>
          c.id === computerId
            ? {
                ...c,
                status: 'booked',
                sessionStartedAt: session.start,
                sessionEndsAt: session.end,
                sessionBookingId: bookingId ?? null,
              }
            : c,
        ),
      }))
      showNotification(
        t(active ? 'nSessionStarted' : 'nSessionScheduled', {
          pc: pc.label,
          time: formatClock(active ? session.end : session.start),
        }),
        'success',
      )
      return true
    },
    [state.computers, showNotification, t],
  )

  const stopPcSession = useCallback(
    (computerId: string) => {
      const pc = state.computers.find((c) => c.id === computerId)
      if (!pc?.sessionEndsAt) return
      const bookingId = pc.sessionBookingId ?? null
      const started = pc.sessionStartedAt
        ? new Date(pc.sessionStartedAt).getTime() <= Date.now()
        : false
      const completed = started && bookingId ? bookingId : null

      setState((s) => ({
        ...s,
        computers: s.computers.map((c) =>
          c.id === computerId
            ? {
                ...c,
                status: c.status === 'maintenance' ? 'maintenance' : 'available',
                sessionStartedAt: null,
                sessionEndsAt: null,
                sessionBookingId: null,
              }
            : c,
        ),
        bookings: completed
          ? s.bookings.map((b) =>
              b.id === completed ? { ...b, status: 'completed' } : b,
            )
          : s.bookings,
      }))

      if (completed) {
        void fetch(`/api/bookings/${encodeURIComponent(completed)}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        }).catch(() => {})
      }
      showNotification(t('nSessionStopped', { pc: pc.label }), 'info')
    },
    [state.computers, showNotification, t],
  )

  const sellBarProduct = useCallback((productId: string, qty: number) => {
    setState((s) => {
      const product = s.barProducts.find((p) => p.id === productId)
      if (!product || product.stock < qty) return s
      const sale: BarSale = {
        id: uid('bs'),
        productId,
        productName: product.name,
        qty,
        total: product.price * qty,
        at: nowStamp(),
      }
      return {
        ...s,
        barProducts: s.barProducts.map((p) =>
          p.id === productId ? { ...p, stock: p.stock - qty } : p,
        ),
        barSales: [sale, ...s.barSales],
      }
    })
    showNotification(t('nSaleDone'), 'success')
  }, [showNotification, t])

  const addBarProduct = useCallback((data: Omit<BarProduct, 'id'>) => {
    setState((s) => ({
      ...s,
      barProducts: [...s.barProducts, { ...data, id: uid('bp') }],
    }))
    showNotification(t('nProductAdded'), 'success')
  }, [showNotification, t])

  const addExpense = useCallback((data: Omit<Expense, 'id'>) => {
    setState((s) => ({
      ...s,
      expenses: [{ ...data, id: uid('e') }, ...s.expenses],
    }))
    showNotification(t('nExpenseAdded'), 'success')
  }, [showNotification, t])

  const addPromoCode = useCallback((data: Omit<Promo, 'id' | 'uses' | 'active'>) => {
    setState((s) => ({
      ...s,
      promos: [{ ...data, id: uid('p'), uses: 0, active: true }, ...s.promos],
    }))
    showNotification(t('nPromoCreated'), 'success')
  }, [showNotification, t])

  const togglePromo = useCallback((id: string) => {
    setState((s) => ({
      ...s,
      promos: s.promos.map((p) => (p.id === id ? { ...p, active: !p.active } : p)),
    }))
  }, [])

  const redeemBonusPoints = useCallback(() => {
    setState((s) => {
      const user = s.currentUser
      if (!user || user.bonusPoints < 100) {
        return s
      }
      const blocks = Math.floor(user.bonusPoints / 100)
      const users = s.users.map((u) =>
        u.id === user.id ? { ...u, bonusPoints: u.bonusPoints - blocks * 100 } : u,
      )
      return { ...s, users, currentUser: users.find((u) => u.id === user.id) ?? user }
    })
    showNotification(t('nBonusRedeemed'), 'success')
  }, [showNotification, t])

  const toggleFavorite = useCallback((id: string) => {
    setState((s) => {
      if (!s.currentUser) return s
      const favorites = s.currentUser.favorites.includes(id)
        ? s.currentUser.favorites.filter((f) => f !== id)
        : [...s.currentUser.favorites, id]
      const users = s.users.map((u) =>
        u.id === s.currentUser!.id ? { ...u, favorites } : u,
      )
      return { ...s, users, currentUser: { ...s.currentUser, favorites } }
    })
  }, [])

  const updatePrice = useCallback((_type: string, _price: number) => {
    showNotification(t('nPriceUpdated'), 'success')
  }, [showNotification, t])

  const pendingCount = useMemo(
    () => state.bookings.filter((b) => b.status === 'pending').length,
    [state.bookings],
  )

  const value: AppContextValue = {
    ...state,
    t,
    setLanguage,
    toggleTheme,
    login,
    logout,
    register,
    registerVerified,
    createBooking,
    confirmBooking,
    rejectBooking,
    refreshBookings,
    setMaintenanceMode,
    startPcSession,
    stopPcSession,
    sellBarProduct,
    addBarProduct,
    addExpense,
    addPromoCode,
    togglePromo,
    redeemBonusPoints,
    toggleFavorite,
    updatePrice,
    showNotification,
    dismissNotification,
    pendingCount,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
