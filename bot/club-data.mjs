// Bot uchun klub ma'lumotlari.
// Narxlar va menyu lib/mock-data.ts bilan bir xil bo'lishi kerak.

export const CLUB = {
  name: 'Prime Game Club',
  tagline: 'Premium gaming klubi',
  phone: process.env.CLUB_PHONE || '+998 93 095 19 96',
  address: process.env.CLUB_ADDRESS || 'Andijon viloyati, Baliqchi tumani, Chinobod shaharchasi',
  workHours: process.env.CLUB_WORK_HOURS || 'Har kuni 09:00 - 00:00',
  siteUrl: process.env.SITE_URL || 'http://localhost:3000',
}

export const ZONES = [
  {
    id: 'VIP',
    name: 'VIP',
    price: 10000,
    gpu: 'RTX 4090',
    ram: '64GB DDR5',
    display: '27" 4K 240Hz',
  },
  {
    id: 'GAMING_PRO',
    name: 'Gaming Pro',
    price: 10000,
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
  { id: 'water', name: 'Suv 0.5L', price: 5000 },
  { id: 'pepsi', name: 'Pepsi 0.5L', price: 8000 },
  { id: 'redbull', name: 'Red Bull', price: 15000 },
  { id: 'sandwich', name: 'Sendvich', price: 15000 },
]

export const BAR_MENU = [
  { name: 'Suv 0.5L', category: 'drink', price: 5000 },
  { name: 'Pepsi 0.5L', category: 'drink', price: 8000 },
  { name: 'Red Bull', category: 'drink', price: 15000 },
  { name: 'Sendvich', category: 'snack', price: 15000 },
]

export const BAR_CATEGORIES = {
  drink: '🥤 Ichimliklar',
  snack: '🥪 Sendvich',
}

export const COMBOS = [
  { name: 'Sendvich Combo', items: ['Sendvich', 'Pepsi 0.5L'], price: 20000 },
  { name: 'Energy Pack', items: ['Red Bull'], price: 15000 },
]

export const PROMOS = [
  { code: 'WELCOME15', discount: 15, desc: 'Birinchi tashrif uchun 15% chegirma' },
  { code: 'NIGHT20', discount: 20, desc: 'Tungi smenada 20% chegirma (23:00 dan keyin)' },
]

// Sayt xaritasidagi kompyuterlar bilan bir xil ro'yxat (lib/mock-data.ts).
export function makeComputers() {
  const list = []
  const config = [{ type: 'VIP', count: 20, row: 0 }]
  let idx = 1
  for (const c of config) {
    for (let i = 0; i < c.count; i++) {
      list.push({
        id: `pc-${idx}`,
        label: `${c.type}-${String(i + 1).padStart(2, '0')}`,
        type: c.type,
        status: 'available',
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
