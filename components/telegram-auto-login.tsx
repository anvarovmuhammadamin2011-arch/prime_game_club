'use client'

import { useEffect, useRef } from 'react'
import { useApp } from '@/context/app-context'

type TelegramWebApp = {
  initData?: string
}

/**
 * Telegram Mini App ichida ochilganda initData orqali avtomatik kiradi.
 * Oddiy brauzerda hech narsa qilmaydi.
 */
export function TelegramAutoLogin() {
  const { registerVerified, currentUser, hydrated } = useApp()
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

      const tg = (
        window as unknown as { Telegram?: { WebApp?: TelegramWebApp } }
      ).Telegram?.WebApp

      if (!tg?.initData) {
        if (attempts >= 30) clearInterval(timer)
        return
      }

      clearInterval(timer)

      try {
        const res = await fetch('/api/auth/telegram', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ initData: tg.initData }),
        })
        const data = (await res.json().catch(() => null)) as
          | { ok?: boolean; user?: { name?: string; phone?: string } }
          | null

        if (!cancelled && res.ok && data?.ok && data.user?.phone) {
          latest.current.registerVerified(
            data.user.name || 'Mehmon',
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
  }, [hydrated, currentUser])

  return null
}
