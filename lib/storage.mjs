// Bronlar va foydalanuvchilar uchun umumiy saqlash qatlami.
//
// BLOB_READ_WRITE_TOKEN bo'lsa — Vercel Blob (server va lokal bot bir xil bazani ko'radi),
// bo'lmasa — bot/data/ ichidagi oddiy fayl (lokal ish uchun).
//
// Eslatma: o'qish-yozish butun JSON faylni oladi. Bir vaqtda ikki yozuv bo'lsa,
// keyingisi oldingisini bosib ketadi — klub hajmi uchun bu yetarli.

import { mkdir, readFile, rename, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const LOCAL_DIR = path.join(
  path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'),
  'bot',
  'data',
)

const token = () => process.env.BLOB_READ_WRITE_TOKEN

export async function readJson(name, fallback) {
  if (!token()) {
    try {
      const raw = await readFile(path.join(LOCAL_DIR, name), 'utf8')
      if (!raw.trim()) return fallback
      const parsed = JSON.parse(raw)
      return parsed ?? fallback
    } catch (e) {
      if (e && e.code === 'ENOENT') return fallback
      throw e
    }
  }

  const { get } = await import('@vercel/blob')
  try {
    const res = await get(name, { access: 'private', token: token() })
    // Blob hali yaratilmagan bo'lsa null qaytadi.
    if (!res) return fallback
    return JSON.parse(await new Response(res.stream).text())
  } catch (e) {
    if (e && /not found|404/i.test(String(e.message))) return fallback
    throw e
  }
}

export async function writeJson(name, data) {
  const body = JSON.stringify(data, null, 2)

  if (!token()) {
    await mkdir(LOCAL_DIR, { recursive: true })
    const file = path.join(LOCAL_DIR, name)
    const tmp = `${file}.${process.pid}.tmp`
    await writeFile(tmp, body, 'utf8')
    await rename(tmp, file)
    return
  }

  const { put } = await import('@vercel/blob')
  await put(name, body, {
    access: 'private',
    token: token(),
    addRandomSuffix: false,
    allowOverwrite: true,
    contentType: 'application/json',
  })
}
