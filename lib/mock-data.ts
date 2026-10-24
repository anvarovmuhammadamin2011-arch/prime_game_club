import type {
  BarProduct,
  BarSale,
  Booking,
  Combo,
  Computer,
  ComputerType,
  ComputerTypeInfo,
  Expense,
  Promo,
  Staff,
  User,
} from './types'

export const COMPUTER_TYPES: Record<ComputerType, ComputerTypeInfo> = {
  VIP: {
    id: 'VIP',
    name: 'VIP',
    pricePerHour: 25000,
    gpu: 'RTX 4090',
    ram: '64GB DDR5',
    display: '27" 4K 240Hz',
    zone: 'VIP',
  },
  GAMING_PRO: {
    id: 'GAMING_PRO',
    name: 'Gaming Pro',
    pricePerHour: 25000,
    gpu: 'RTX 4080',
    ram: '32GB DDR5',
    display: '27" QHD 165Hz',
    zone: 'Gaming Pro',
  },
  STANDARD: {
    id: 'STANDARD',
    name: 'Standard',
    pricePerHour: 10000,
    gpu: 'RTX 3070',
    ram: '16GB DDR4',
    display: '24" FHD 144Hz',
    zone: 'Standard',
  },
  PS5: {
    id: 'PS5',
    name: 'PS5 / Xbox',
    pricePerHour: 20000,
    gpu: 'PS5 / Xbox Series X',
    ram: '—',
    display: '55" OLED 4K',
    zone: 'Console',
  },
}

function makeComputers(): Computer[] {
  const list: Computer[] = []
  const config: { type: ComputerType; count: number; row: number }[] = [
    { type: 'VIP', count: 20, row: 0 },
  ]
  let idx = 1
  for (const c of config) {
    for (let i = 0; i < c.count; i++) {
      const status: Computer['status'] = 'available'
      list.push({
        id: `pc-${idx}`,
        label: `${COMPUTER_TYPES[c.type].name.split(' ')[0].toUpperCase()}-${String(i + 1).padStart(2, '0')}`,
        type: c.type,
        status,
        zone: COMPUTER_TYPES[c.type].zone,
        temp: 35 + ((idx * 3) % 10),
        uptimeHours: 100 + ((idx * 37) % 900),
        x: 4 + i * 8,
        y: 4 + c.row * 14,
      })
      idx++
    }
  }
  return list
}

export const INITIAL_COMPUTERS: Computer[] = makeComputers()

export const INITIAL_USERS: User[] = [
  {
    id: 'u1',
    name: 'Abdulloh Karimov',
    phone: '+998901234567',
    password: 'user123',
    role: 'user',
    bonusPoints: 240,
    referralCode: 'ABDU2024',
    favorites: ['pc-1', 'pc-5'],
    joinedAt: '2024-03-12',
    hoursPlayed: 184,
  },
  {
    id: 'u2',
    name: 'Malika Yusupova',
    phone: '+998907654321',
    password: 'user123',
    role: 'user',
    bonusPoints: 90,
    referralCode: 'MALI2024',
    favorites: [],
    joinedAt: '2024-06-01',
    hoursPlayed: 47,
  },
  {
    id: 'a1',
    name: 'Admin User',
    phone: '+998901111111',
    password: 'admin123',
    role: 'admin',
    bonusPoints: 0,
    referralCode: 'ADMIN',
    favorites: [],
    joinedAt: '2023-01-01',
    hoursPlayed: 0,
  },
  {
    id: 's1',
    name: 'Super Admin',
    phone: '+998900000000',
    password: 'super123',
    role: 'superadmin',
    bonusPoints: 0,
    referralCode: 'SUPER',
    favorites: [],
    joinedAt: '2022-01-01',
    hoursPlayed: 0,
  },
]

export const INITIAL_BOOKINGS: Booking[] = [
  {
    id: 'b1',
    userId: 'u1',
    userName: 'Abdulloh Karimov',
    computerId: 'pc-1',
    computerLabel: 'VIP-01',
    date: '2026-06-25',
    startTime: '18:00',
    hours: 3,
    extras: ['drink', 'headset'],
    total: 88000,
    paymentMethod: 'cash',
    status: 'confirmed',
    createdAt: '2026-06-23',
  },
  {
    id: 'b2',
    userId: 'u2',
    userName: 'Malika Yusupova',
    computerId: 'pc-4',
    computerLabel: 'GAMING-01',
    date: '2026-06-25',
    startTime: '20:00',
    hours: 2,
    extras: [],
    total: 36000,
    paymentMethod: 'cash',
    status: 'pending',
    createdAt: '2026-06-24',
  },
  {
    id: 'b3',
    userId: 'u1',
    userName: 'Abdulloh Karimov',
    computerId: 'pc-12',
    computerLabel: 'STANDARD-01',
    date: '2026-06-26',
    startTime: '14:00',
    hours: 4,
    extras: ['snack'],
    total: 52000,
    paymentMethod: 'cash',
    status: 'pending',
    createdAt: '2026-06-24',
  },
]

export const INITIAL_BAR_PRODUCTS: BarProduct[] = [
  { id: 'bp1', name: 'Pepsi 0.5L', category: 'drink', price: 8000, stock: 48 },
  { id: 'bp2', name: 'Red Bull', category: 'drink', price: 15000, stock: 30 },
  { id: 'bp3', name: 'Lays Chips', category: 'snack', price: 12000, stock: 25 },
  { id: 'bp4', name: 'Snickers', category: 'snack', price: 9000, stock: 40 },
  { id: 'bp5', name: 'Burger', category: 'hotfood', price: 32000, stock: 15 },
  { id: 'bp6', name: 'Hot-Dog', category: 'hotfood', price: 22000, stock: 18 },
  { id: 'bp7', name: 'Cheesecake', category: 'dessert', price: 25000, stock: 10 },
  { id: 'bp8', name: 'Espresso', category: 'drink', price: 14000, stock: 60 },
]

export const INITIAL_BAR_SALES: BarSale[] = [
  { id: 'bs1', productId: 'bp2', productName: 'Red Bull', qty: 2, total: 30000, at: '2026-06-24 19:24' },
  { id: 'bs2', productId: 'bp5', productName: 'Burger', qty: 1, total: 32000, at: '2026-06-24 20:10' },
  { id: 'bs3', productId: 'bp1', productName: 'Pepsi 0.5L', qty: 3, total: 24000, at: '2026-06-24 21:02' },
]

export const INITIAL_COMBOS: Combo[] = [
  { id: 'c1', name: 'Gamer Combo', items: ['Burger', 'Pepsi 0.5L', 'Lays Chips'], price: 45000 },
  { id: 'c2', name: 'Energy Pack', items: ['Red Bull', 'Snickers'], price: 21000 },
]

export const INITIAL_STAFF: Staff[] = [
  { id: 'st1', name: 'Jasur Toshmatov', role: 'Administrator', shift: '09:00 - 21:00', salary: 4500000, revenueGenerated: 18200000 },
  { id: 'st2', name: 'Dilnoza Rahimova', role: 'Bar menejeri', shift: '12:00 - 00:00', salary: 3800000, revenueGenerated: 9400000 },
  { id: 'st3', name: 'Sardor Aliyev', role: 'Texnik', shift: '21:00 - 09:00', salary: 4200000, revenueGenerated: 6100000 },
]

export const INITIAL_PROMOS: Promo[] = [
  { id: 'p1', code: 'WELCOME15', discount: 15, uses: 42, maxUses: 100, active: true },
  { id: 'p2', code: 'NIGHT20', discount: 20, uses: 88, maxUses: 200, active: true },
  { id: 'p3', code: 'OLDPROMO', discount: 10, uses: 50, maxUses: 50, active: false },
]

export const INITIAL_EXPENSES: Expense[] = [
  { id: 'e1', title: 'Elektr energiya', category: 'Kommunal', amount: 8200000, date: '2026-06-01' },
  { id: 'e2', title: 'Xodimlar maoshi', category: 'Maosh', amount: 12500000, date: '2026-06-05' },
  { id: 'e3', title: 'Internet (1Gbps)', category: 'Kommunal', amount: 1800000, date: '2026-06-03' },
  { id: 'e4', title: 'Bar mahsulotlari', category: 'Inventar', amount: 5600000, date: '2026-06-10' },
]

export const EXTRAS = [
  { id: 'drink', name: 'Ichimlik', price: 8000 },
  { id: 'snack', name: 'Snack', price: 12000 },
  { id: 'headset', name: 'Premium naushnik', price: 5000 },
]

export const MONTHLY_REVENUE = [
  { month: 'Yan', revenue: 38, expense: 24 },
  { month: 'Fev', revenue: 42, expense: 26 },
  { month: 'Mar', revenue: 51, expense: 28 },
  { month: 'Apr', revenue: 47, expense: 27 },
  { month: 'May', revenue: 58, expense: 30 },
  { month: 'Iyun', revenue: 64, expense: 31 },
]

export const PEAK_HOURS = [
  { hour: '12:00', load: 35 },
  { hour: '14:00', load: 48 },
  { hour: '16:00', load: 62 },
  { hour: '18:00', load: 81 },
  { hour: '20:00', load: 96 },
  { hour: '22:00', load: 88 },
  { hour: '00:00', load: 54 },
]
