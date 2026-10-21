// Bot uchun klub ma'lumotlari.
// Narxlar va menyu lib/mock-data.ts bilan bir xil bo'lishi kerak.

export const CLUB = {
  name: 'Legion Game Club',
  tagline: 'Premium gaming klubi',
  phone: process.env.CLUB_PHONE || '+998 90 123 45 67',
  address:
    process.env.CLUB_ADDRESS ||
    "Toshkent shahri (manzilni bot/club-data.mjs yoki .env.local orqali o'zgartiring)",
  workHours: process.env.CLUB_WORK_HOURS || 'Har kuni 10:00 - 03:00',
  siteUrl: process.env.SITE_URL || 'http://localhost:3000',
}

export const ZONES = [
  {
    id: 'VIP',
    name: 'VIP',
    price: 25000,
    gpu: 'RTX 4090',
    ram: '64GB DDR5',
    display: '27" 4K 240Hz',
  },
  {
    id: 'GAMING_PRO',
    name: 'Gaming Pro',
    price: 25000,
    gpu: 'RTX 4080',
    ram: '32GB DDR5',
    display: '27" QHD 165Hz',
  },
  {
    id: 'STANDARD',
    name: 'Standard',
    price: 10000,
    gpu: 'RTX 3070',
    ram: '16GB DDR4',
    display: '24" FHD 144Hz',
  },
  {
    id: 'PS5',
    name: 'PS5 / Xbox',
    price: 20000,
    gpu: 'PS5 / Xbox Series X',
    ram: '—',
    display: '55" OLED 4K',
  },
]

export const EXTRAS = [
  { id: 'drink', name: 'Ichimlik', price: 8000 },
  { id: 'snack', name: 'Snack', price: 12000 },
  { id: 'headset', name: 'Premium naushnik', price: 5000 },
]

export const BAR_MENU = [
  { name: 'Pepsi 0.5L', category: 'drink', price: 8000 },
  { name: 'Red Bull', category: 'drink', price: 15000 },
  { name: 'Espresso', category: 'drink', price: 14000 },
  { name: 'Lays Chips', category: 'snack', price: 12000 },
  { name: 'Snickers', category: 'snack', price: 9000 },
  { name: 'Burger', category: 'hotfood', price: 32000 },
  { name: 'Hot-Dog', category: 'hotfood', price: 22000 },
  { name: 'Cheesecake', category: 'dessert', price: 25000 },
]

export const BAR_CATEGORIES = {
  drink: '🥤 Ichimliklar',
  snack: '🍿 Snacklar',
  hotfood: '🍔 Issiq taomlar',
  dessert: '🍰 Shirinliklar',
}

export const COMBOS = [
  { name: 'Gamer Combo', items: ['Burger', 'Pepsi 0.5L', 'Lays Chips'], price: 45000 },
  { name: 'Energy Pack', items: ['Red Bull', 'Snickers'], price: 21000 },
]

export const PROMOS = [
  { code: 'WELCOME15', discount: 15, desc: 'Birinchi tashrif uchun 15% chegirma' },
  { code: 'NIGHT20', discount: 20, desc: 'Tungi smenada 20% chegirma (23:00 dan keyin)' },
]

// Sayt xaritasidagi kompyuterlar bilan bir xil ro'yxat (lib/mock-data.ts).
export function makeComputers() {
  const list = []
  const config = [
    { type: 'VIP', count: 20, row: 0 },
    { type: 'PS5', count: 2, row: 1 },
  ]
  let idx = 1
  for (const c of config) {
    for (let i = 0; i < c.count; i++) {
      const status =
        idx % 5 === 0
          ? 'booked'
          : idx % 7 === 0
            ? 'maintenance'
            : idx % 11 === 0
              ? 'pending'
              : 'available'
      list.push({
        id: `pc-${idx}`,
        label: `${c.type}-${String(i + 1).padStart(2, '0')}`,
        type: c.type,
        status,
        row: c.row,
      })
      idx++
    }
  }
  return list
}

export const STATUS_LABELS = {
  available: "Bo'sh",
  booked: 'Band',
  maintenance: 'Texnik',
  pending: 'Kutilmoqda',
}
