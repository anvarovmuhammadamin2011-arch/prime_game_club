'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
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
  t: (key: string) => string
  setLanguage: (l: Lang) => void
  toggleTheme: () => void
  login: (phone: string, password: string, silent?: boolean) => { success: boolean; role?: Role }
  logout: () => void
  register: (name: string, phone: string, password: string) => boolean
  registerVerified: (name: string, phone: string) => boolean
  createBooking: (data: Omit<Booking, 'id' | 'status' | 'createdAt' | 'userId' | 'userName'>) => Promise<{
    ok: boolean
    code?: string
    error?: string
  }>
  confirmBooking: (id: string) => Promise<void>
  rejectBooking: (id: string) => Promise<void>
  refreshBookings: () => Promise<void>
  setMaintenanceMode: (id: string, on: boolean) => void
  sellBarProduct: (productId: string, qty: number) => void
  addBarProduct: (data: Omit<BarProduct, 'id'>) => void
  addExpense: (data: Omit<Expense, 'id'>) => void
  addPromoCode: (data: Omit<Promo, 'id' | 'uses' | 'active'>) => void
  togglePromo: (id: string) => void
  redeemBonusPoints: () => void
  toggleFavorite: (id: string) => void
  updatePrice: (type: string, price: number) => void
  showNotification: (message: string, type?: Notification['type']) => void
  pendingCount: number
}

const AppContext = createContext<AppContextValue | null>(null)

const STORAGE_KEY = 'prime-game-club-state-v2'
const LEGACY_STORAGE_KEY = 'legion-game-club-state-v2'

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
    return previous ? { ...c, status: previous.status } : c
  })
}

/**
 * Seed hisoblarni (admin/superadmin) configdan yangilaymiz, saytda
 * ro'yxatdan o'tgan foydalanuvchilarni saqlab qolamiz.
 */
function syncUsers(stored: User[] | undefined): User[] {
  if (!Array.isArray(stored)) return INITIAL_USERS
  const seeded = new Map(INITIAL_USERS.map((u) => [u.id, u]))
  const merged = stored.map((u) => seeded.get(u.id) ?? u)
  for (const u of INITIAL_USERS) {
    if (!stored.some((s) => s.id === u.id)) merged.push(u)
  }
  return merged
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
          computers: syncComputers(parsed.computers),
          users: syncUsers(parsed.users),
          notifications: [],
          hydrated: true,
        }))
      } else {
        setState((s) => ({ ...s, hydrated: true }))
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

  const showNotification = useCallback(
    (message: string, type: Notification['type'] = 'info') => {
      const id = uid('n')
      setState((s) => ({
        ...s,
        notifications: [...s.notifications, { id, message, type }],
      }))
      setTimeout(() => {
        setState((s) => ({
          ...s,
          notifications: s.notifications.filter((n) => n.id !== id),
        }))
      }, 3500)
    },
    [],
  )

  const t = useCallback((key: string) => translate(state.language, key), [state.language])

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
        if (!silent) showNotification("Telefon yoki parol noto'g'ri", 'error')
        return { success: false }
      }
      setState((s) => ({ ...s, currentUser: user }))
      showNotification(`Xush kelibsiz, ${user.name}`, 'success')
      return { success: true, role: user.role }
    },
    [state.users, showNotification],
  )

  const logout = useCallback(() => {
    setState((s) => ({ ...s, currentUser: null }))
  }, [])

  const register = useCallback(
    (name: string, phone: string, password: string) => {
      if (state.users.some((u) => u.phone === phone.trim())) {
        showNotification("Bu raqam allaqachon ro'yxatdan o'tgan", 'error')
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
      showNotification("Ro'yxatdan o'tdingiz! 20,000 so'm sovg'a balans", 'success')
      return true
    },
    [state.users, showNotification],
  )

  const registerVerified = useCallback(
    (name: string, phone: string) => {
      const key = phoneKey(phone)
      const existing = state.users.find((u) => phoneKey(u.phone) === key)

      if (existing) {
        setState((s) => ({ ...s, currentUser: existing }))
        showNotification(`Xush kelibsiz, ${existing.name}`, 'success')
        return true
      }

      const cleanName = name.trim() || 'Mehmon'
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
      showNotification("Ro'yxatdan o'tdingiz!", 'success')
      return true
    },
    [state.users, showNotification],
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

  const createBooking = useCallback(
    async (
      data: Omit<Booking, 'id' | 'status' | 'createdAt' | 'userId' | 'userName'>,
    ) => {
      const user = state.currentUser
      if (!user) return { ok: false, error: 'Avval tizimga kiring' }
      if (data.paymentMethod !== 'cash') {
        return { ok: false, error: "Faqat naqd to'lov mavjud" }
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
          const message = payload?.message || 'Bron yaratilmadi. Qayta urinib ko‘ring.'
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
              c.id === data.computerId ? { ...c, status: 'pending' } : c,
            ),
          }
        })
        showNotification('Bron yaratildi, tasdiqlash kutilmoqda', 'success')
        return { ok: true, code: booking.code }
      } catch {
        showNotification('Server bilan aloqa yo‘q. Internetni tekshiring.', 'error')
        return { ok: false, error: 'Server bilan aloqa yo‘q' }
      }
    },
    [state.currentUser, state.computers, showNotification],
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
          showNotification(payload?.message || 'Bronni tasdiqlashda xatolik', 'error')
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
              c.id === current?.computerId ? { ...c, status: 'booked' } : c,
            ),
            auditLog: [
              {
                id: uid('au'),
                action: `Bron tasdiqlandi: ${id}`,
                by: s.currentUser?.name ?? 'system',
                at: nowStamp(),
              },
              ...s.auditLog,
            ],
          }
        })
        showNotification('Bron tasdiqlandi', 'success')
      } catch {
        showNotification('Server bilan aloqa yo‘q', 'error')
      }
    },
    [showNotification],
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
          showNotification(payload?.message || 'Bronni rad etishda xatolik', 'error')
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
              c.id === current?.computerId ? { ...c, status: 'available' } : c,
            ),
            auditLog: [
              {
                id: uid('au'),
                action: `Bron rad etildi: ${id}`,
                by: s.currentUser?.name ?? 'system',
                at: nowStamp(),
              },
              ...s.auditLog,
            ],
          }
        })
        showNotification('Bron rad etildi', 'warning')
      } catch {
        showNotification('Server bilan aloqa yo‘q', 'error')
      }
    },
    [showNotification],
  )

  const setMaintenanceMode = useCallback((id: string, on: boolean) => {
    setState((s) => ({
      ...s,
      computers: s.computers.map((c) =>
        c.id === id ? { ...c, status: on ? 'maintenance' : 'available' } : c,
      ),
    }))
    showNotification(on ? 'Texnik rejim yoqildi' : 'Texnik rejim o‘chirildi', 'info')
  }, [showNotification])

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
    showNotification('Sotuv amalga oshirildi', 'success')
  }, [showNotification])

  const addBarProduct = useCallback((data: Omit<BarProduct, 'id'>) => {
    setState((s) => ({
      ...s,
      barProducts: [...s.barProducts, { ...data, id: uid('bp') }],
    }))
    showNotification("Mahsulot qo'shildi", 'success')
  }, [showNotification])

  const addExpense = useCallback((data: Omit<Expense, 'id'>) => {
    setState((s) => ({
      ...s,
      expenses: [{ ...data, id: uid('e') }, ...s.expenses],
    }))
    showNotification("Xarajat qo'shildi", 'success')
  }, [showNotification])

  const addPromoCode = useCallback((data: Omit<Promo, 'id' | 'uses' | 'active'>) => {
    setState((s) => ({
      ...s,
      promos: [{ ...data, id: uid('p'), uses: 0, active: true }, ...s.promos],
    }))
    showNotification('Promo kod yaratildi', 'success')
  }, [showNotification])

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
    showNotification('Bonus ballar balansga aylantirildi', 'success')
  }, [showNotification])

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
    showNotification('Narx yangilandi', 'success')
  }, [showNotification])

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
    sellBarProduct,
    addBarProduct,
    addExpense,
    addPromoCode,
    togglePromo,
    redeemBonusPoints,
    toggleFavorite,
    updatePrice,
    showNotification,
    pendingCount,
  }

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>
}

export function useApp() {
  const ctx = useContext(AppContext)
  if (!ctx) throw new Error('useApp must be used within AppProvider')
  return ctx
}
