/** @type {import('next').NextConfig} */
const nextConfig = {
  // Next.js dev rejimidagi burchakdagi logo/indikatorni yashiramiz.
  devIndicators: false,
  // Mini App cloudflared quick tunnel orqali ochiladi; Next dev
  // cross-origin dev resurslarini bloklamasligi uchun ruxsat beramiz.
  allowedDevOrigins: ['*.trycloudflare.com'],
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // API javoblari CDN'da eskirib qolmasin (bronlar darhol ko'rinsin).
  async headers() {
    return [
      {
        source: '/api/:path*',
        headers: [{ key: 'Cache-Control', value: 'no-store, max-age=0' }],
      },
    ]
  },
  // Mini App Vercel'da, API va bronlar alohida serverda bo'lsa:
  // Vercel'da API_PROXY_URL=https://api.example.uz qo'yiladi, /api/* o'sha yerga ketadi.
  // O'zgaruvchi bo'lmasa — hech narsa o'zgarmaydi (lokal ish rejimi).
  async rewrites() {
    const api = process.env.API_PROXY_URL?.trim().replace(/\/+$/, '')
    if (!api) return { beforeFiles: [], afterFiles: [], fallback: [] }
    return {
      beforeFiles: [{ source: '/api/:path*', destination: `${api}/api/:path*` }],
      afterFiles: [],
      fallback: [],
    }
  },
}

export default nextConfig
