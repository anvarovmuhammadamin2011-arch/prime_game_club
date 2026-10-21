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
  login: (phone: string, password: string) => { success: boolean; role?: Role }
  logout: () => void
  register: (name: string, phone: string, password: string) => boolean
  registerVerified: (name: string, phone: string) => boolean
  createBooking: (data: Omit<Booking, 'id' | 'status' | 'createdAt' | 'userId' | 'userName'>) => boolean
  confirmBooking: (id: string) => void
  rejectBooking: (id: string) => void
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

const STORAGE_KEY = 'legion-game-club-state-v2'

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
      const raw = localStorage.getItem(STORAGE_KEY)
      if (raw) {
        const parsed = JSON.parse(raw)
        setState((s) => ({ ...s, ...parsed, notifications: [], hydrated: true }))
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
    (phone: string, password: string) => {
      const user = state.users.find(
        (u) => u.phone === phone.trim() && u.password === password,
      )
      if (!user) {
        showNotification("Telefon yoki parol noto'g'ri", 'error')
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

  const audit = (action: string): AuditEntry => ({    id: uid('au'),
    action,
    by: state.currentUser?.name ?? 'system',
    at: nowStamp(),
  })

  const createBooking = useCallback(
    (data: Omit<Booking, 'id' | 'status' | 'createdAt' | 'userId' | 'userName'>) => {
      const user = state.currentUser
      if (!user) return false
      if (data.paymentMethod !== 'cash') return false
      const booking: Booking = {
        ...data,
        id: uid('b'),
        userId: user.id,
        userName: user.name,
        status: 'pending',
        createdAt: new Date().toISOString().slice(0, 10),
      }
      const bonusEarned = Math.round(data.total * 0.01)
      setState((s) => {
        const updatedUsers = s.users.map((u) =>
          u.id === user.id ? { ...u, bonusPoints: u.bonusPoints + bonusEarned } : u,
        )
        const updatedCurrent = updatedUsers.find((u) => u.id === user.id) ?? null
        return {
          ...s,
          bookings: [booking, ...s.bookings],
          users: updatedUsers,
          currentUser: updatedCurrent,
          computers: s.computers.map((c) =>
            c.id === data.computerId ? { ...c, status: 'pending' } : c,
          ),
        }
      })
      showNotification('Bron yaratildi, tasdiqlash kutilmoqda', 'success')
      return true
    },
    [state.currentUser, showNotification],
  )

  const confirmBooking = useCallback((id: string) => {
    setState((s) => {
      const booking = s.bookings.find((b) => b.id === id)
      return {
        ...s,
        bookings: s.bookings.map((b) =>
          b.id === id ? { ...b, status: 'confirmed' } : b,
        ),
        computers: s.computers.map((c) =>
          c.id === booking?.computerId ? { ...c, status: 'booked' } : c,
        ),
        auditLog: [audit(`Bron tasdiqlandi: ${id}`), ...s.auditLog],
      }
    })
    showNotification('Bron tasdiqlandi', 'success')
  }, [showNotification, state.currentUser])

  const rejectBooking = useCallback((id: string) => {
    setState((s) => {
      const booking = s.bookings.find((b) => b.id === id)
      const users = s.users
      return {
        ...s,
        bookings: s.bookings.map((b) =>
          b.id === id ? { ...b, status: 'rejected' } : b,
        ),
        users,
        currentUser:
          s.currentUser && booking?.userId === s.currentUser.id
            ? users.find((u) => u.id === s.currentUser!.id) ?? s.currentUser
            : s.currentUser,
        computers: s.computers.map((c) =>
          c.id === booking?.computerId ? { ...c, status: 'available' } : c,
        ),
        auditLog: [audit(`Bron rad etildi: ${id}`), ...s.auditLog],
      }
    })
    showNotification('Bron rad etildi, pul qaytarildi', 'warning')
  }, [showNotification, state.currentUser])

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
