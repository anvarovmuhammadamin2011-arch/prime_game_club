'use client'

import { useApp } from '@/context/app-context'
import {
  Card,
  PageHeader,
  Button,
  Badge,
  Input,
  StatCard,
} from '@/components/ui/primitives'
import { formatSom } from '@/lib/format'
import { useState } from 'react'
import {
  Coffee,
  Plus,
  Minus,
  ShoppingCart,
  Package,
  TrendingUp,
  X,
} from 'lucide-react'
import type { BarProduct } from '@/lib/types'

const CATEGORIES = [
  { id: 'all', labelKey: 'all' },
  { id: 'drink', labelKey: 'drinks' },
  { id: 'snack', labelKey: 'snacks' },
]

export default function BarPage() {
  const { t, barProducts, barSales, sellBarProduct, addBarProduct } = useApp()
  const [cat, setCat] = useState('all')
  const [cart, setCart] = useState<Record<string, number>>({})
  const [showAdd, setShowAdd] = useState(false)
  const [form, setForm] = useState({
    name: '',
    category: 'drink',
    price: '',
    stock: '',
  })

  const filtered =
    cat === 'all' ? barProducts : barProducts.filter((p) => p.category === cat)

  const cartItems = Object.entries(cart).filter(([, q]) => q > 0)
  const cartTotal = cartItems.reduce((sum, [id, q]) => {
    const p = barProducts.find((x) => x.id === id)
    return sum + (p ? p.price * q : 0)
  }, 0)

  const todayRevenue = barSales.reduce((s, x) => s + x.total, 0)
  const lowStock = barProducts.filter((p) => p.stock < 15).length

  const updateCart = (id: string, delta: number) => {
    setCart((c) => {
      const next = Math.max(0, (c[id] ?? 0) + delta)
      return { ...c, [id]: next }
    })
  }

  const checkout = () => {
    cartItems.forEach(([id, q]) => sellBarProduct(id, q))
    setCart({})
  }

  const submitProduct = () => {
    if (!form.name || !form.price) return
    addBarProduct({
      name: form.name,
      category: form.category as BarProduct['category'],
      price: Number(form.price),
      stock: Number(form.stock) || 0,
    })
    setForm({ name: '', category: 'drink', price: '', stock: '' })
    setShowAdd(false)
  }

  return (
    <div>
      <PageHeader
        title={t('barManagement')}
        subtitle={t('posSystem')}
        action={
          <Button variant="outline" onClick={() => setShowAdd((s) => !s)}>
            <Plus className="h-4 w-4" />
            {t('addProduct')}
          </Button>
        }
      />

      <div className="grid grid-cols-2 gap-3 sm:gap-4 lg:grid-cols-4">
        <StatCard
          label={t('todayRevenue')}
          value={formatSom(todayRevenue)}
          icon={<TrendingUp className="h-5 w-5" />}
          tone="success"
        />
        <StatCard
          label={t('totalProducts')}
          value={String(barProducts.length)}
          icon={<Package className="h-5 w-5" />}
          tone="primary"
        />
        <StatCard
          label={t('lowStock')}
          value={String(lowStock)}
          icon={<Coffee className="h-5 w-5" />}
          tone="warning"
        />
        <StatCard
          label={t('salesCount')}
          value={String(barSales.length)}
          icon={<ShoppingCart className="h-5 w-5" />}
          tone="info"
        />
      </div>

      {showAdd && (
        <Card className="mt-4 p-5">
          <h3 className="mb-4 font-medium">{t('addProduct')}</h3>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Input
              placeholder={t('productName')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
            <select
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              className="h-11 rounded-lg border border-input bg-background px-3 text-sm"
            >
              <option value="drink">{t('drinks')}</option>
              <option value="snack">{t('snacks')}</option>
            </select>
            <Input
              type="number"
              placeholder={t('price')}
              value={form.price}
              onChange={(e) => setForm({ ...form, price: e.target.value })}
            />
            <Input
              type="number"
              placeholder={t('stock')}
              value={form.stock}
              onChange={(e) => setForm({ ...form, stock: e.target.value })}
            />
          </div>
          <div className="mt-4 flex justify-end">
            <Button onClick={submitProduct}>{t('save')}</Button>
          </div>
        </Card>
      )}

      <div className="mt-6 grid gap-4 lg:grid-cols-3">
        {/* Products */}
        <div className="lg:col-span-2">
          <div className="mb-4 flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button
                key={c.id}
                onClick={() => setCat(c.id)}
                className={`rounded-full px-4 py-1.5 text-sm font-medium transition-colors ${
                  cat === c.id
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-secondary text-muted-foreground hover:text-foreground'
                }`}
              >
                {t(c.labelKey)}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {filtered.map((p) => (
              <Card key={p.id} className="flex flex-col p-4">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-medium leading-tight">{p.name}</p>
                  {p.stock < 15 && <Badge tone="warning">{p.stock}</Badge>}
                </div>
                <p className="mt-1 text-xs text-muted-foreground">
                  {t('stock')}: <span className="text-mono-num">{p.stock}</span>
                </p>
                <p className="text-mono-num mt-2 font-semibold">
                  {formatSom(p.price)}
                </p>
                <div className="mt-3 flex items-center justify-between gap-2">
                  <button
                    onClick={() => updateCart(p.id, -1)}
                    disabled={!cart[p.id]}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-secondary disabled:opacity-40"
                  >
                    <Minus className="h-4 w-4" />
                  </button>
                  <span className="text-mono-num w-6 text-center font-semibold">
                    {cart[p.id] ?? 0}
                  </span>
                  <button
                    onClick={() => updateCart(p.id, 1)}
                    disabled={(cart[p.id] ?? 0) >= p.stock}
                    className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground disabled:opacity-40"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Cart */}
        <Card className="h-fit p-5 lg:sticky lg:top-20">
          <h3 className="mb-4 flex items-center gap-2 font-medium">
            <ShoppingCart className="h-4 w-4 text-primary" />
            {t('cart')}
          </h3>
          {cartItems.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              {t('cartEmpty')}
            </p>
          ) : (
            <>
              <div className="flex flex-col gap-2">
                {cartItems.map(([id, q]) => {
                  const p = barProducts.find((x) => x.id === id)!
                  return (
                    <div
                      key={id}
                      className="flex items-center justify-between rounded-lg bg-secondary/50 px-3 py-2"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm">{p.name}</p>
                        <p className="text-xs text-muted-foreground text-mono-num">
                          {q} × {formatSom(p.price)}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-mono-num text-sm font-semibold">
                          {formatSom(p.price * q)}
                        </span>
                        <button
                          onClick={() => updateCart(id, -q)}
                          className="text-muted-foreground hover:text-destructive"
                          aria-label={t('remove')}
                        >
                          <X className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="mt-4 flex items-center justify-between border-t border-border pt-4">
                <span className="font-medium">{t('total')}</span>
                <span className="text-mono-num text-lg font-bold text-primary">
                  {formatSom(cartTotal)}
                </span>
              </div>
              <Button className="mt-4 w-full" variant="gold" onClick={checkout}>
                {t('completeSale')}
              </Button>
            </>
          )}
        </Card>
      </div>
    </div>
  )
}
