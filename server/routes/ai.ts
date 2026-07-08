import { lookup } from 'node:dns/promises'
import net from 'node:net'
import { Router } from 'express'
import { z } from 'zod'
import { extractKeywordsFromOffer } from '../lib/kimi'
import { requireAuth } from '../lib/auth'
import { ApiError } from '../lib/errors'

export const aiRouter = Router()

/* ── protection SSRF : plages IP non routables interdites ── */
function isPrivateIPv4(ip: string) {
  const parts = ip.split('.').map(Number)
  if (parts.length !== 4 || parts.some(part => !Number.isInteger(part) || part < 0 || part > 255)) return true
  const [a, b] = parts
  return a === 0 || a === 10 || a === 127
    || (a === 100 && b >= 64 && b <= 127) // CGNAT 100.64.0.0/10
    || (a === 169 && b === 254) // link-local
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
    || (a === 192 && b === 0) // 192.0.0.0/24 reserve
    || (a === 198 && (b === 18 || b === 19)) // benchmarking
    || a >= 224 // multicast + reserve + broadcast
}

function isPrivateIp(ip: string) {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip)
  if (!net.isIPv6(ip)) return true // format inconnu → on refuse par prudence
  const lower = ip.toLowerCase()
  if (lower === '::' || lower === '::1') return true
  if (/^fe[89ab]/.test(lower)) return true // link-local fe80::/10
  if (/^f[cd]/.test(lower)) return true // ULA fc00::/7
  // IPv4-mapped ::ffff:a.b.c.d en forme pointee OU hexadecimale (::ffff:xxxx:xxxx)
  const dotted = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/)
  if (dotted) return isPrivateIPv4(dotted[1])
  const hex = lower.match(/^::ffff:([0-9a-f]{1,4}):([0-9a-f]{1,4})$/)
  if (hex) {
    const high = parseInt(hex[1], 16)
    const low = parseInt(hex[2], 16)
    const v4 = `${(high >> 8) & 255}.${high & 255}.${(low >> 8) & 255}.${low & 255}`
    return isPrivateIPv4(v4)
  }
  return false
}

/* Valide le protocole ET resout le DNS : toutes les adresses retournees
   doivent etre publiques (bloque localhost, RFC1918, link-local, CGNAT,
   ULA, IPv6 mappees, et les noms DNS pointant vers du prive). */
async function assertPublicUrl(raw: string): Promise<URL> {
  let target: URL
  try {
    target = new URL(raw)
  } catch {
    throw new ApiError(400, 'URL invalide.')
  }
  if (!/^https?:$/.test(target.protocol)) throw new ApiError(400, 'URL invalide.')
  const hostname = target.hostname.replace(/^\[|\]$/g, '')
  if (net.isIP(hostname)) {
    if (isPrivateIp(hostname)) throw new ApiError(400, 'URL invalide.')
    return target
  }
  const addresses = await lookup(hostname, { all: true, verbatim: true }).catch(() => [])
  if (addresses.length === 0 || addresses.some(addr => isPrivateIp(addr.address))) {
    throw new ApiError(400, 'URL invalide.')
  }
  return target
}

const FETCH_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
  Accept: 'text/html,application/xhtml+xml',
  'Accept-Language': 'fr-FR,fr;q=0.9,en;q=0.7',
}

aiRouter.post('/fetch-offer', requireAuth, async (req, res, next) => {
  try {
    const input = z.object({ url: z.string().url() }).parse(req.body)

    /* redirections suivies manuellement : chaque saut est re-valide
       contre les plages privees (anti allowlist-bypass via redirect) */
    let current = await assertPublicUrl(input.url)
    let response: globalThis.Response | null = null
    for (let hop = 0; hop < 4; hop++) {
      response = await fetch(current, {
        headers: FETCH_HEADERS,
        redirect: 'manual',
        signal: AbortSignal.timeout(15000),
      })
      if ([301, 302, 303, 307, 308].includes(response.status)) {
        const location = response.headers.get('location')
        if (!location) break
        current = await assertPublicUrl(new URL(location, current).toString())
        continue
      }
      break
    }
    if (!response || [301, 302, 303, 307, 308].includes(response.status)) {
      throw new ApiError(422, "Trop de redirections. Copiez-collez le texte de l'offre.")
    }
    if (!response.ok) {
      throw new ApiError(422, `Impossible de récupérer l'offre (HTTP ${response.status}). Copiez-collez le texte directement.`)
    }

    const html = await response.text()
    const text = html
      .replace(/<script[\s\S]*?<\/script>/gi, ' ')
      .replace(/<style[\s\S]*?<\/style>/gi, ' ')
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
      .replace(/<(?:br|\/p|\/div|\/li|\/h[1-6]|\/tr)[^>]*>/gi, '\n')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&#39;|&apos;|&rsquo;/g, "'")
      .replace(/&quot;/g, '"')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .split('\n')
      .map(line => line.replace(/\s+/g, ' ').trim())
      .filter(Boolean)
      .join('\n')

    if (text.length < 200) {
      throw new ApiError(422, "Le contenu de la page n'a pas pu être extrait (site protégé ou dynamique). Copiez-collez le texte de l'offre.")
    }
    res.json({ text: text.slice(0, 6000) })
  } catch (error) {
    if (error instanceof Error && (error.name === 'TimeoutError' || error.name === 'AbortError')) {
      next(new ApiError(422, 'Le site met trop de temps à répondre. Copiez-collez le texte de l\'offre.'))
      return
    }
    next(error)
  }
})

aiRouter.post('/keywords', requireAuth, async (req, res, next) => {
  try {
    const input = z.object({ jobOffer: z.string().min(20) }).parse(req.body)
    const keywords = await extractKeywordsFromOffer(input.jobOffer)
    res.json({ keywords })
  } catch (error) {
    next(error)
  }
})
