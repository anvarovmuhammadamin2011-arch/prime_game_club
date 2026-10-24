'use client'

import { useApp } from '@/context/app-context'
import { useRouter } from 'next/navigation'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AuthBrand } from '@/components/auth-brand'
import { Notifications } from '@/components/notifications'
import { Button, Input } from '@/components/ui/primitives'
import { BOT_URL, BOT_USERNAME } from '@/lib/bot-link'
import { phoneKey } from '@/lib/phone'
import { Gamepad2, Loader2, ShieldCheck, Smartphone, UserPlus } from 'lucide-react'

export default function RegisterPage() {
  const { registerVerified, users, currentUser, hydrated, t } = useApp()
  const router = useRouter()

  const [name, setName] = useState('')
  const [phone, setPhone] = useState('')
  const [pin, setPin] = useState('')
  const [pinConfirm, setPinConfirm] = useState('')
  const [error, setError] = useState('')
  const [alreadyExists, setAlreadyExists] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (hydrated && currentUser) router.replace('/home')
  }, [hydrated, currentUser, router])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    setError('')
    setAlreadyExists(false)

    const cleanName = name.trim().replace(/\s+/g, ' ')
    const digits = phone.replace(/\D/g, '')

    if (cleanName.length < 2) {
      setError('Ismingizni to‘liq kiriting.')
      return
    }
    if (!/^\d{9}$/.test(digits) && !/^998\d{9}$/.test(digits)) {
      setError('Telefon raqamini to‘g‘ri kiriting. Masalan: +998 90 123 45 67')
      return
    }
    if (!/^\d{4}$/.test(pin)) {
      setError('4 xonali kod kiriting.')
      return
    }
    if (pin !== pinConfirm) {
      setError('Kodlar mos kelmadi. Qayta tekshirib ko‘ring.')
      return
    }
    if (users.some((u) => phoneKey(u.phone) === phoneKey(phone))) {
      setError('Bu telefon raqami allaqachon ro‘yxatdan o‘tgan.')
      setAlreadyExists(true)
      return
    }

    setLoading(true)

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: cleanName, phone, pin }),
      })
      const data = await res.json().catch(() => ({}))

      if (!res.ok || !data.ok) {
        setError(data.message || 'Ro‘yxatdan o‘tishda xatolik yuz berdi. Qayta urinib ko‘ring.')
        setAlreadyExists(data.error === 'already_exists')
        return
      }

      if (registerVerified(data.user?.name || cleanName, data.user?.phone || phone)) {
        router.replace('/home')
      }
    } catch {
      setError('Server bilan aloqa yo‘q. Internetni tekshiring.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-2">
      <Notifications />
      <AuthBrand />

      <div className="flex flex-col items-center justify-center px-4 py-10 sm:px-8">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 lg:hidden">
            <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <Gamepad2 className="h-5 w-5" />
            </span>
            <span className="font-heading text-lg font-bold">Prime Game Club</span>
          </div>

          <h1 className="font-heading text-2xl font-bold tracking-tight">{t('register')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Hisob yarating — ism, telefon raqami va 4 xonali kod kiriting.
          </p>

          <form onSubmit={submit} className="mt-6 space-y-4">
            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="name">
                Ism va familiya
              </label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Aziz Karimov"
                autoComplete="name"
                required
                autoFocus
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-sm font-medium" htmlFor="phone">
                {t('phone')}
              </label>
              <Input
                id="phone"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+998 90 123 45 67"
                inputMode="tel"
                autoComplete="tel"
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="pin">
                  4 xonali kod
                </label>
                <Input
                  id="pin"
                  type="password"
                  value={pin}
                  onChange={(e) => setPin(e.target.value.replace(/\D/g, '').slice(0, 4))}
                  placeholder="••••"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={4}
                  className="text-center text-lg tracking-[0.4em]"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-sm font-medium" htmlFor="pin-confirm">
                  Kodni takrorlang
                </label>
                <Input
                  id="pin-confirm"
                  type="password"
                  value={pinConfirm}
                  onChange={(e) =>
                    setPinConfirm(e.target.value.replace(/\D/g, '').slice(0, 4))
                  }
                  placeholder="••••"
                  inputMode="numeric"
                  autoComplete="new-password"
                  maxLength={4}
                  className="text-center text-lg tracking-[0.4em]"
                  required
                />
              </div>
            </div>

            <p className="text-xs text-muted-foreground">
              Bu 4 xonali kod saytga kirishda parolingiz bo‘ladi. Uni eslab qoling.
            </p>

            {error && (
              <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                {error}
                {alreadyExists && (
                  <Link href="/" className="mt-1 block font-medium underline">
                    Kirish sahifasiga o‘tish →
                  </Link>
                )}
              </div>
            )}

            <Button type="submit" size="lg" className="w-full" disabled={loading}>
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <UserPlus className="h-4 w-4" />
              )}
              {loading ? 'Yaratilmoqda...' : "Ro‘yxatdan o‘tish"}
            </Button>
          </form>

          <div className="mt-6 flex items-start gap-3 rounded-xl border border-primary/20 bg-primary/10 p-3">
            <Smartphone className="mt-0.5 h-5 w-5 flex-shrink-0 text-primary" />
            <div className="text-sm">
              <p className="font-medium">Mini App orqali ham ro‘yxatdan o‘tish mumkin</p>
              <p className="mt-1 text-muted-foreground">
                Botga o‘tib Mini App’ni oching va shu yerda telefon raqamingiz
                hamda 4 xonali kodni kiriting.
              </p>
              <a
                href={BOT_URL}
                target="_blank"
                rel="noreferrer"
                className="mt-1 inline-flex items-center gap-1 font-medium text-primary hover:underline"
              >
                @{BOT_USERNAME} ga o‘tish →
              </a>
            </div>
          </div>

          <p className="mt-6 text-center text-sm text-muted-foreground">
            Hisobingiz bormi?{' '}
            <Link href="/" className="font-medium text-primary hover:underline">
              {t('login')}
            </Link>
          </p>

          <div className="mt-4 flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="h-3.5 w-3.5" />
            Ma’lumotlaringiz xavfsiz saqlanadi
          </div>
        </div>
      </div>
    </div>
  )
}
