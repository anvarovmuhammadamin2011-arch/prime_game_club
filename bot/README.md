# Prime Game Club — Telegram bot

Botning yagona vazifasi — foydalanuvchiga **Mini App**'ni ochish tugmasini
berish. Bron qilish, ro'yxatdan o'tish, narxlar, bar menyusi va boshqa barcha
amallar Mini App ichida bajariladi.

Bot Node'ning o'z `fetch`'i bilan Telegram long polling ishlatadi — qo'shimcha
kutubxona kerak emas.

## Ishga tushirish

Doimiy ish uchun systemd servisi ishlatiladi (pastga qarang). Qo'lda test
qilish uchun:

```bash
pnpm bot
```

> `legion-bot` servisi ishlab turganida `pnpm bot` ni qo'lda ishga tushirmang —
> Telegram long polling ikki nusxada 409 xato beradi. Avval
> `systemctl --user stop legion-bot`.

`.env.local`:

```env
TELEGRAM_BOT_TOKEN=...
ADMIN_CHAT_ID=...          # yangi bron bildirishnomalari uchun
SITE_URL=https://...       # Mini App HTTPS manzili (tunnel yangilaydi)
```

## Foydalanuvchi uchun

- Botga `/start` yoki istalgan xabar yozilganda bitta **Mini App'ni ochish**
  tugmasi yuboriladi.
- Chatning pastki chap burchagidagi doimiy **Mini App** menyu tugmasi ham
  shu sahifani ochadi.
- Boshqa buyruqlar, menyular va bron qilish flow'lari botdan olib tashlangan.

## Admin uchun

Yangi bron haqidagi bildirishnoma `ADMIN_CHAT_ID` ga tasdiqlash/rad etish
tugmalari bilan keladi. Tugma bosilganda bron holati yangilanadi va mijozga
natija yuboriladi.

Bronni kod bo'yicha tekshirish, ro'yxat va boshqa boshqaruv ishlari saytning
admin panelida (`/admin`) bajariladi. Botda `/kod`, `/id`, `/register` kabi
buyruqlar yo'q.

## Mini App va tunnel

Mini App **Cloudflare quick tunnel** orqali HTTPS bilan ochiladi:

```bash
pnpm dev      # sayt
pnpm tunnel   # HTTPS URL + bot menyusini yangilash
pnpm bot      # bot
```

Quick tunnel URL har ishga tushirishda o'zgaradi. `pnpm tunnel` URL'ni
`.env.local` dagi `SITE_URL` ga yozadi, Telegram menyu tugmasini yangilaydi va
`legion-bot` servisini qayta ishga tushiradi.

## Doimiy ishlash (systemd)

| Servis | Vazifasi |
| --- | --- |
| `legion-web.service` | Next.js sayt (`localhost:3000`) |
| `legion-tunnel.service` | Cloudflare quick tunnel + URL'ni yangilash |
| `legion-bot.service` | Telegram bot (long polling) |

```bash
systemctl --user status legion-web legion-tunnel legion-bot
journalctl --user -u legion-bot -f        # bot loglari
systemctl --user restart legion-bot       # botni qayta ishga tushirish
systemctl --user stop legion-bot          # to'xtatish
```

Unit fayllar: `~/.config/systemd/user/legion-*.service` (fayl nomlari tarixiy,
ichki tavsif — Prime Game Club). Node yo'li unit fayllarda mutlaq ko'rsatilgan;
Node yangilansa, shu yo'lni yangilash kerak.

## Ma'lumotlar

- Bronlar: `bot/data/bookings.json` (sayt API'lari va bot uchun umumiy, git'ga tushmaydi)
- Foydalanuvchilar: `bot/data/users.json` (telefon + 4 xonali kod hash'i)
- Ro'yxatdan o'tish: Mini App yoki sayt orqali (`/register`)
- Narxlar/menyu: `bot/club-data.mjs` (`lib/mock-data.ts` bilan bir xil)
- Klub manzili/telefon: `.env.local` dagi `CLUB_*` o'zgaruvchilari
