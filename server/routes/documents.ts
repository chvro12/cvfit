import { Router } from 'express'
import { access } from 'node:fs/promises'
import multer from 'multer'
import { requireAuth, type AuthedRequest } from '../lib/auth'
import { detectDocumentType, extractText, storeUpload } from '../lib/files'
import { prisma } from '../lib/prisma'

export const documentsRouter = Router()

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
})

documentsRouter.get('/', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) return
    const documents = await prisma.document.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      select: {
        id: true,
        type: true,
        originalName: true,
        size: true,
        createdAt: true,
        _count: { select: { generations: true } },
        generations: {
          orderBy: { createdAt: 'desc' },
          select: { id: true, jobOffer: true, createdAt: true, atsScore: true, atsScoreBefore: true },
          take: 5,
        },
      },
    })
    res.json({
      documents: documents.map(document => ({
        ...document,
        offers: document.generations.map(generation => ({
          id: generation.id,
          jobOffer: generation.jobOffer,
          createdAt: generation.createdAt,
          atsScore: generation.atsScore,
          atsScoreBefore: generation.atsScoreBefore,
        })),
        generations: undefined,
      })),
    })
  } catch (error) {
    next(error)
  }
})

documentsRouter.get('/:id/download', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) return
    const document = await prisma.document.findFirst({
      where: { id: String(req.params.id), userId: req.user.id },
    })
    if (!document) {
      res.status(404).json({ error: 'CV introuvable.' })
      return
    }
    await access(document.path)
    res.download(document.path, document.originalName)
  } catch (error) {
    next(error)
  }
})

documentsRouter.post('/upload', requireAuth, upload.fields([
  { name: 'cv', maxCount: 1 },
  { name: 'photo', maxCount: 1 },
]), async (req: AuthedRequest, res, next) => {
  try {
    const files = req.files as Record<string, Express.Multer.File[]> | undefined
    const cv = files?.cv?.[0]
    const photo = files?.photo?.[0]
    if (!req.user || !cv) {
      res.status(400).json({ error: 'CV manquant.' })
      return
    }

    const type = detectDocumentType(cv)
    const filePath = await storeUpload(req.user.id, cv, 'documents')
    const photoPath = photo ? await storeUpload(req.user.id, photo, 'photos') : null
    const extractedText = await extractText(filePath, type)

    const document = await prisma.document.create({
      data: {
        userId: req.user.id,
        type,
        originalName: cv.originalname,
        mimeType: cv.mimetype,
        size: cv.size,
        path: filePath,
        photoPath,
        extractedText,
      },
    })

    res.status(201).json({
      document: {
        id: document.id,
        type: document.type,
        originalName: document.originalName,
        extractedText: document.extractedText,
        createdAt: document.createdAt,
      },
    })
  } catch (error) {
    next(error)
  }
})
