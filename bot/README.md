# Telegram bot (@legionclubrobot)

Klub sayti uchun lokal bot. Hech qanday qo'shimcha kutubxona talab qilmaydi —
Node'ning o'z `fetch`'i bilan Telegram long polling ishlatadi.

## Ishga tushirish

```bash
pnpm bot
```

Token `.env.local` faylidan o'qiladi:

```env
TELEGRAM_BOT_TOKEN=...
```

## Buyruqlar

| Buyruq | Vazifasi |
| --- | --- |
| `/start` | Asosiy menyu |
| `/book` | 4 bosqichli bron qilish |
| `/prices` | Zonalar narxlari |
| `/status` | Bo'sh kompyuterlar |
| `/bar` | Bar menyusi |
| `/promo` | Aksiyalar |
| `/mybookings` | Mening bronlarim |
| `/contact` | Kontakt |
| `/id` | Chat ID (admin sozlash uchun) |
| `/cancel` | Jarayonni bekor qilish |

## Mini App va ro'yxatdan o'tish

Bot Mini App sifatida **lokal saytni Cloudflare tunnel orqali** ochadi:

```bash
pnpm dev      # 1-terminal
pnpm tunnel   # 2-terminal: HTTPS URL yaratadi + bot menyusini yangilaydi
pnpm bot      # 3-terminal
```

Quick tunnel URL har ishga tushirishda o'zgaradi, shuning uchun `pnpm tunnel`
uni `.env.local` ga yozadi va Telegram menyu tugmasini yangilaydi. `/start`
ichidagi tugmalar yangilanishi uchun `pnpm bot` ni qayta ishga tushiring.

### Ro'yxatdan o'tish oqimi

1. Foydalanuvchi botga `/start` bosadi va **telefon raqamini yuboradi**
   (`request_contact`) — raqam `bot/data/users.json` ga yoziladi.
2. Mini App'da `/register` sahifasida shu raqam kiritiladi.
3. `POST /api/auth/lookup` raqamni qidiradi:
   - topilsa — 4 xonali kod Telegram chatiga yuboriladi (5 daqiqa amal qiladi);
   - topilmasa — "botga start bosing" xabari qaytadi.
4. Foydalanuvchi kodni kiritadi → `POST /api/auth/verify` tekshiradi →
   profil ochiladi.

Xavfsizlik: 3 ta kod so'rovi / 10 daqiqa, 5 ta noto'g'ri urinish, kod bir marta
ishlatiladi. Kodlar xotirada saqlanadi (server qayta ishga tushsa o'chadi).

> Vercel'dagi eski build bu API'larni bilmaydi. Uni yangilash uchun saytni qayta
> deploy qilish va doimiy (faylga emas) ma'lumot bazasini ulash kerak.

## Admin ulash

1. Botga `/id` yuboring — chat ID ni olasiz.
2. `.env.local` ga yozing: `ADMIN_CHAT_ID=123456789`
3. Botni qayta ishga tushiring.

Shundan keyin har bir yangi bron admin chat'iga tasdiqlash/rad etish
tugmalari bilan keladi, foydalanuvchiga esa natija avtomatik yuboriladi.

## Ma'lumotlar

- Bronlar: `bot/data/bookings.json` (git'ga tushmaydi)
- Narxlar/menyu: `bot/club-data.mjs` (`lib/mock-data.ts` bilan bir xil)
- Klub manzili/telefon: `.env.local` dagi `CLUB_*` o'zgaruvchilari
