import { Router } from 'express'
import { requireAdmin } from '../lib/auth'
import { prisma } from '../lib/prisma'

export const adminRouter = Router()

adminRouter.use(requireAdmin)

adminRouter.get('/stats', async (_req, res, next) => {
  try {
    const dayStart = new Date()
    dayStart.setHours(0, 0, 0, 0)
    const [totalUsers, totalCVs, totalOptimizations, activeTodayGroups] = await Promise.all([
      prisma.user.count(),
      prisma.document.count(),
      prisma.generation.count(),
      prisma.usageEvent.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: dayStart } },
      }),
    ])
    const activeToday = activeTodayGroups.length
    res.json({ stats: { totalUsers, totalCVs, totalOptimizations, activeToday } })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/users', async (_req, res, next) => {
  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        createdAt: true,
        _count: { select: { documents: true, generations: true } },
      },
    })
    res.json({ users })
  } catch (error) {
    next(error)
  }
})

adminRouter.get('/generations', async (_req, res, next) => {
  try {
    const generations = await prisma.generation.findMany({
      orderBy: { createdAt: 'desc' },
      take: 100,
      include: {
        user: { select: { email: true, name: true } },
        document: { select: { originalName: true, type: true } },
      },
    })
    res.json({ generations })
  } catch (error) {
    next(error)
  }
})
