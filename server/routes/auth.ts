import { Router } from 'express'
import { z } from 'zod'
import { createSession, destroySession, hashPassword, requireAuth, verifyPassword, type AuthedRequest } from '../lib/auth'
import { prisma } from '../lib/prisma'

export const authRouter = Router()

const registerSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: z.string().email(),
  password: z.string().min(8),
})

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
})

function publicUser(user: { id: string; email: string; name: string | null; role: string; plan: string }) {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    plan: user.plan,
  }
}

authRouter.post('/register', async (req, res, next) => {
  try {
    const input = registerSchema.parse(req.body)
    const email = input.email.toLowerCase()
    const exists = await prisma.user.findUnique({ where: { email } })
    if (exists) {
      res.status(409).json({ error: 'Un compte existe deja avec cet email.' })
      return
    }

    const user = await prisma.user.create({
      data: {
        name: input.name,
        email,
        passwordHash: await hashPassword(input.password),
      },
    })
    await createSession(res, user.id)
    res.status(201).json({ user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/login', async (req, res, next) => {
  try {
    const input = loginSchema.parse(req.body)
    const user = await prisma.user.findUnique({ where: { email: input.email.toLowerCase() } })
    if (!user || !(await verifyPassword(input.password, user.passwordHash))) {
      res.status(401).json({ error: 'Email ou mot de passe incorrect.' })
      return
    }

    await createSession(res, user.id)
    res.json({ user: publicUser(user) })
  } catch (error) {
    next(error)
  }
})

authRouter.post('/logout', async (req, res, next) => {
  try {
    await destroySession(req, res)
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

authRouter.get('/me', requireAuth, async (req: AuthedRequest, res) => {
  res.json({ user: req.user })
})
