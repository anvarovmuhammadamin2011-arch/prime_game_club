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
}

export default nextConfig
