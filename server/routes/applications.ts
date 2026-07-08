import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthedRequest } from '../lib/auth'
import { prisma } from '../lib/prisma'

export const applicationsRouter = Router()

const statusSchema = z.enum(['TO_APPLY', 'APPLIED', 'FOLLOW_UP', 'INTERVIEW', 'OFFER', 'REJECTED', 'ARCHIVED'])

const applicationSchema = z.object({
  generationId: z.string().optional().nullable(),
  company: z.string().trim().min(1).max(160),
  role: z.string().trim().min(1).max(180),
  status: statusSchema.default('TO_APPLY'),
  jobUrl: z.string().trim().max(500).optional().nullable(),
  notes: z.string().trim().max(5000).optional().nullable(),
  followUpAt: z.string().datetime().optional().nullable(),
})

const updateSchema = applicationSchema.partial().extend({
  status: statusSchema.optional(),
})

function parseFollowUp(value?: string | null) {
  return value ? new Date(value) : null
}

applicationsRouter.get('/', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) return
    const applications = await prisma.jobApplication.findMany({
      where: { userId: req.user.id },
      orderBy: [{ updatedAt: 'desc' }],
      include: {
        generation: {
          select: {
            id: true,
            atsScore: true,
            atsScoreBefore: true,
            document: { select: { originalName: true } },
          },
        },
      },
    })
    res.json({ applications })
  } catch (error) {
    next(error)
  }
})

applicationsRouter.post('/', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) return
    const input = applicationSchema.parse(req.body)

    if (input.generationId) {
      const generation = await prisma.generation.findFirst({
        where: { id: input.generationId, userId: req.user.id },
        select: { id: true },
      })
      if (!generation) {
        res.status(404).json({ error: 'Adaptation introuvable.' })
        return
      }
    }

    const application = await prisma.jobApplication.create({
      data: {
        userId: req.user.id,
        generationId: input.generationId || null,
        company: input.company,
        role: input.role,
        status: input.status,
        jobUrl: input.jobUrl || null,
        notes: input.notes || null,
        followUpAt: parseFollowUp(input.followUpAt),
      },
    })
    res.status(201).json({ application })
  } catch (error) {
    next(error)
  }
})

applicationsRouter.patch('/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) return
    const id = String(req.params.id)
    const input = updateSchema.parse(req.body)
    const existing = await prisma.jobApplication.findFirst({ where: { id, userId: req.user.id } })
    if (!existing) {
      res.status(404).json({ error: 'Candidature introuvable.' })
      return
    }

    const application = await prisma.jobApplication.update({
      where: { id },
      data: {
        ...(input.company !== undefined ? { company: input.company } : {}),
        ...(input.role !== undefined ? { role: input.role } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.jobUrl !== undefined ? { jobUrl: input.jobUrl || null } : {}),
        ...(input.notes !== undefined ? { notes: input.notes || null } : {}),
        ...(input.followUpAt !== undefined ? { followUpAt: parseFollowUp(input.followUpAt) } : {}),
      },
    })
    res.json({ application })
  } catch (error) {
    next(error)
  }
})

applicationsRouter.delete('/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) return
    const id = String(req.params.id)
    await prisma.jobApplication.deleteMany({ where: { id, userId: req.user.id } })
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})
