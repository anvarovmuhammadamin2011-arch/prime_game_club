'use client'

import { useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useApp } from '@/context/app-context'
import { getTelegramInitData } from '@/lib/telegram'

/**
 * Telegram Mini App ichida ochilganda initData orqali avtomatik kiradi.
 * Oddiy brauzerda hech narsa qilmaydi.
 */
export function TelegramAutoLogin() {
  const { registerVerified, currentUser, hydrated, setLanguage } = useApp()
  const router = useRouter()
  const pathname = usePathname()
  const started = useRef(false)
  const latest = useRef({ registerVerified })
  latest.current.registerVerified = registerVerified

  useEffect(() => {
    if (!hydrated || currentUser || started.current) return
    started.current = true

    let cancelled = false
    let attempts = 0

    const timer = setInterval(async () => {
      attempts += 1

      const initData = getTelegramInitData()
      if (!initData) {
        if (attempts >= 100) clearInterval(timer)
        return
      }

      clearInterval(timer)

      try {
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData }),
        })
        const data = (await res.json().catch(() => null)) as
          | {
              ok?: boolean
              needs_password?: boolean
              user?: { name?: string; phone?: string }
              lang?: string | null
            }
          | null

        if (!cancelled && res.ok && data?.ok && data.user?.phone) {
          if (data.lang === 'ru' || data.lang === 'en' || data.lang === 'uz') {
            setLanguage(data.lang)
          }
          if (data.needs_password) {
            if (pathname !== '/set-password') router.replace('/set-password')
            return
          }
          latest.current.registerVerified(
            data.user.name || '',
            data.user.phone,
          )
        }
      } catch {
        /* keyingi safar qo'lda kirish mumkin */
      }
    }, 150)

    return () => {
      cancelled = true
      clearInterval(timer)
    }
  }, [hydrated, currentUser, setLanguage, pathname, router])

  return null
}
