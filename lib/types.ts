export type Role = 'user' | 'admin' | 'superadmin'

export type Lang = 'uz' | 'ru' | 'en'

export type ComputerType = 'VIP' | 'GAMING_PRO' | 'STANDARD' | 'PS5'

export type ComputerStatus = 'available' | 'booked' | 'maintenance' | 'pending'

export interface ComputerTypeInfo {
  id: ComputerType
  name: string
  pricePerHour: number
  gpu: string
  ram: string
  display: string
  zone: string
}

export interface Computer {
  id: string
  label: string
  type: ComputerType
  status: ComputerStatus
  zone: string
  temp: number
  uptimeHours: number
  x: number
  y: number
}

export interface User {
  id: string
  name: string
  phone: string
  password: string
  role: Role
  bonusPoints: number
  referralCode: string
  favorites: string[]
  joinedAt: string
  hoursPlayed: number
}

export interface Booking {
  id: string
  userId: string
  userName: string
  phone?: string
  code?: string
  computerId: string
  computerLabel: string
  date: string
  startTime: string
  hours: number
  seats?: number
  extras: string[]
  total: number
  paymentMethod: string
  status: 'pending' | 'confirmed' | 'rejected' | 'completed'
  createdAt: string
}

export interface BarProduct {
  id: string
  name: string
  category: 'drink' | 'snack' | 'hotfood' | 'dessert'
  price: number
  stock: number
}

export interface BarSale {
  id: string
  productId: string
  productName: string
  qty: number
  total: number
  at: string
}

export interface Combo {
  id: string
  name: string
  items: string[]
  price: number
}

export interface Staff {
  id: string
  name: string
  role: string
  shift: string
  salary: number
  revenueGenerated: number
}

export interface Promo {
  id: string
  code: string
  discount: number
  uses: number
  maxUses: number
  active: boolean
}

export interface Expense {
  id: string
  title: string
  category: string
  amount: number
  date: string
}

export interface AuditEntry {
  id: string
  action: string
  by: string
  at: string
}

export interface Notification {
  id: string
  message: string
  type: 'success' | 'error' | 'info' | 'warning'
}
