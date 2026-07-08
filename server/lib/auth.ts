import { createHash, randomBytes } from 'node:crypto'
import type { Request, Response, NextFunction } from 'express'
import bcrypt from 'bcryptjs'
import { env } from '../env'
import { prisma } from './prisma'

export const SESSION_COOKIE = 'cvfit_session'
const SESSION_DAYS = 30

export type AuthedRequest = Request & {
  user?: {
    id: string
    email: string
    name: string | null
    role: 'USER' | 'ADMIN'
    plan: 'FREE' | 'PRO'
  }
}

export function hashToken(token: string) {
  return createHash('sha256').update(`${token}.${env.SESSION_SECRET}`).digest('hex')
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash)
}

export async function createSession(res: Response, userId: string) {
  const token = randomBytes(32).toString('hex')
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 60 * 60 * 1000)

  await prisma.session.create({
    data: {
      tokenHash: hashToken(token),
      userId,
      expiresAt,
    },
  })

  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    expires: expiresAt,
  })
}

export async function destroySession(req: Request, res: Response) {
  const token = req.cookies?.[SESSION_COOKIE]
  if (token) {
    await prisma.session.deleteMany({ where: { tokenHash: hashToken(token) } })
  }
  res.clearCookie(SESSION_COOKIE, { path: '/' })
}

export async function getUserFromRequest(req: Request) {
  const token = req.cookies?.[SESSION_COOKIE]
  if (!token) return null

  const session = await prisma.session.findUnique({
    where: { tokenHash: hashToken(token) },
    include: { user: true },
  })

  if (!session || session.expiresAt < new Date()) {
    if (session) await prisma.session.delete({ where: { id: session.id } })
    return null
  }

  return session.user
}

export async function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const user = await getUserFromRequest(req)
  if (!user) {
    res.status(401).json({ error: 'Authentification requise.' })
    return
  }
  req.user = {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    plan: user.plan,
  }
  next()
}

export async function requireAdmin(req: AuthedRequest, res: Response, next: NextFunction) {
  await requireAuth(req, res, () => {
    if (req.user?.role !== 'ADMIN') {
      res.status(403).json({ error: 'Acces admin requis.' })
      return
    }
    next()
  })
}

export async function ensureAdminUser() {
  if (!env.ADMIN_EMAIL || !env.ADMIN_PASSWORD) return

  const existing = await prisma.user.findUnique({ where: { email: env.ADMIN_EMAIL.toLowerCase() } })
  if (existing) {
    if (existing.role !== 'ADMIN') {
      await prisma.user.update({ where: { id: existing.id }, data: { role: 'ADMIN' } })
    }
    return
  }

  await prisma.user.create({
    data: {
      email: env.ADMIN_EMAIL.toLowerCase(),
      name: 'Admin CVFIT',
      role: 'ADMIN',
      passwordHash: await hashPassword(env.ADMIN_PASSWORD),
    },
  })
}
