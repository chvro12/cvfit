import { Router } from 'express'
import { z } from 'zod'
import { requireAuth, type AuthedRequest } from '../lib/auth'
import { analyzeOfferAndCv, applyOptimizations, completeMissingSections, estimateOptimizedScore, findUncoveredSections, generateCoverLetter, generateInterviewPrep, generateOptimizations, reinforceMissingKeywords, structureCv, translateCvToEnglish } from '../lib/kimi'
import { prisma } from '../lib/prisma'

export const generationsRouter = Router()

const createSchema = z.object({
  documentId: z.string().min(1),
  jobOffer: z.string().min(50),
  mode: z.string().default('preserve'),
  experienceLevel: z.string().optional(),
  situation: z.string().optional(),
})

generationsRouter.post('/', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) return
    const input = createSchema.parse(req.body)

    const document = await prisma.document.findFirst({
      where: { id: input.documentId, userId: req.user.id },
    })
    if (!document?.extractedText) {
      res.status(404).json({ error: 'Document introuvable ou texte inexploitable.' })
      return
    }

    const generation = await prisma.generation.create({
      data: {
        userId: req.user.id,
        documentId: document.id,
        mode: input.mode,
        jobOffer: input.jobOffer,
        status: 'PENDING',
      },
    })

    try {
      // 1. En parallele : analyse combinee (mots-cles + audit ATS) et structuration du CV.
      const [analysis, structuredCv] = await Promise.all([
        analyzeOfferAndCv(document.extractedText, input.jobOffer),
        structureCv(document.extractedText),
      ])
      const keywords = analysis.keywords

      // 2. Optimisations guidees par les mots-cles cibles et ceux manquants du CV.
      const optimizations = await generateOptimizations(document.extractedText, input.jobOffer, {
        keywords,
        missingKeywords: analysis.missingKeywords,
        experienceLevel: input.experienceLevel,
        situation: input.situation,
      })

      let finalOptimizations = optimizations

      // 2b. Controle de couverture : garantit que CHAQUE section du CV structure
      //     (chaque experience, chaque diplome, langues, certifs, passions...) a bien
      //     recu une optimisation ; passe ciblee pour completer les sections oubliees.
      try {
        const uncovered = findUncoveredSections(structuredCv, finalOptimizations)
        if (uncovered.length > 0) {
          const completed = await completeMissingSections(document.extractedText, input.jobOffer, uncovered, {
            keywords,
            experienceLevel: input.experienceLevel,
            situation: input.situation,
          })
          const extras = completed.filter(item =>
            !finalOptimizations.some(opt => opt.section.toLowerCase() === item.section.toLowerCase()))
          finalOptimizations = [...finalOptimizations, ...extras]
        }
      } catch {
        // passe optionnelle : on garde le resultat de la premiere passe
      }

      // 3. Score "apres" : matching exact des mots-cles dans le texte optimise
      //    (deterministe et instantane, comme un vrai ATS — aucun appel IA).
      let optimizedText = applyOptimizations(document.extractedText, finalOptimizations)
      let estimate = estimateOptimizedScore(analysis, optimizedText, finalOptimizations.length)

      // 4. Passe de verification : s'il reste des mots-cles non couverts,
      //    une mini-passe ciblee les integre dans Profil / Competences quand c'est credible.
      if (estimate.missingAfter.length > 0) {
        try {
          const reinforced = await reinforceMissingKeywords(document.extractedText, input.jobOffer, estimate.missingAfter)
          if (reinforced.length > 0) {
            const replaced = finalOptimizations.map(opt =>
              reinforced.find(item => item.section.toLowerCase() === opt.section.toLowerCase()) ?? opt)
            const extras = reinforced.filter(item =>
              !finalOptimizations.some(opt => opt.section.toLowerCase() === item.section.toLowerCase()))
            finalOptimizations = [...replaced, ...extras]
            optimizedText = applyOptimizations(document.extractedText, finalOptimizations)
            estimate = estimateOptimizedScore(analysis, optimizedText, finalOptimizations.length)
          }
        } catch {
          // passe optionnelle : on garde le resultat de la premiere passe
        }
      }

      const atsScore = estimate.score
      const missingAfter = estimate.missingAfter
      const atsScoreBefore = analysis.score

      const completed = await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'COMPLETED',
          keywords,
          optimizations: finalOptimizations,
          structuredCv,
          atsScore,
          atsScoreBefore,
          atsMissingKeywords: missingAfter,
        },
      })

      await prisma.usageEvent.create({
        data: {
          userId: req.user.id,
          generationId: completed.id,
          type: 'generation',
          quantity: 1,
        },
      })

      res.status(201).json({ generation: completed })
    } catch (error) {
      const failed = await prisma.generation.update({
        where: { id: generation.id },
        data: {
          status: 'FAILED',
          errorMessage: error instanceof Error ? error.message : 'Generation impossible.',
        },
      })
      res.status(502).json({ error: failed.errorMessage, generation: failed })
    }
  } catch (error) {
    next(error)
  }
})

generationsRouter.get('/', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) return
    const generations = await prisma.generation.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: 'desc' },
      take: 100,
      select: {
        id: true,
        status: true,
        atsScore: true,
        atsScoreBefore: true,
        createdAt: true,
        jobOffer: true,
        coverLetter: true,
        interviewPrep: true,
        document: {
          select: { originalName: true, type: true },
        },
        applications: {
          select: {
            id: true,
            company: true,
            role: true,
            status: true,
            jobUrl: true,
            updatedAt: true,
          },
          orderBy: { updatedAt: 'desc' },
        },
      },
    })
    res.json({
      generations: generations.map(generation => ({
        ...generation,
        jobOffer: generation.jobOffer.slice(0, 220),
        hasCoverLetter: Boolean(generation.coverLetter),
        hasInterviewPrep: Boolean(generation.interviewPrep),
        coverLetter: undefined,
        interviewPrep: undefined,
      })),
    })
  } catch (error) {
    next(error)
  }
})

generationsRouter.post('/:id/interview-prep', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) return
    const id = String(req.params.id)
    const generation = await prisma.generation.findFirst({
      where: { id, userId: req.user.id },
      include: { document: true },
    })
    if (!generation?.document.extractedText) {
      res.status(404).json({ error: 'Generation introuvable ou CV inexploitable.' })
      return
    }

    const regenerate = req.body?.regenerate === true
    if (generation.interviewPrep && !regenerate) {
      res.json({ interviewPrep: generation.interviewPrep })
      return
    }

    const interviewPrep = await generateInterviewPrep(generation.document.extractedText, generation.jobOffer)
    await prisma.generation.update({ where: { id: generation.id }, data: { interviewPrep } })
    await prisma.usageEvent.create({
      data: { userId: req.user.id, generationId: generation.id, type: 'interview_prep', quantity: 1 },
    })
    res.json({ interviewPrep })
  } catch (error) {
    next(error)
  }
})

generationsRouter.post('/:id/translate-en', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) return
    const generation = await prisma.generation.findFirst({
      where: { id: String(req.params.id), userId: req.user.id },
    })
    if (!generation?.structuredCv) {
      res.status(404).json({ error: 'Generation introuvable ou CV non structure.' })
      return
    }
    const translated = await translateCvToEnglish(
      generation.structuredCv as Parameters<typeof translateCvToEnglish>[0],
      (generation.optimizations ?? []) as Parameters<typeof translateCvToEnglish>[1],
      generation.jobOffer,
    )
    await prisma.usageEvent.create({
      data: { userId: req.user.id, generationId: generation.id, type: 'translate_en', quantity: 1 },
    })
    res.json(translated)
  } catch (error) {
    next(error)
  }
})

generationsRouter.post('/:id/cover-letter', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) return
    const id = String(req.params.id)
    const generation = await prisma.generation.findFirst({
      where: { id, userId: req.user.id },
      include: { document: true },
    })
    if (!generation?.document.extractedText) {
      res.status(404).json({ error: 'Generation introuvable ou CV inexploitable.' })
      return
    }

    const regenerate = req.body?.regenerate === true
    if (generation.coverLetter && !regenerate) {
      res.json({ coverLetter: generation.coverLetter })
      return
    }

    const coverLetter = await generateCoverLetter(generation.document.extractedText, generation.jobOffer)
    await prisma.generation.update({ where: { id: generation.id }, data: { coverLetter } })
    await prisma.usageEvent.create({
      data: { userId: req.user.id, generationId: generation.id, type: 'cover_letter', quantity: 1 },
    })
    res.json({ coverLetter })
  } catch (error) {
    next(error)
  }
})

generationsRouter.patch('/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) return
    const id = String(req.params.id)
    const editorState = req.body?.editorState
    if (typeof editorState !== 'object' || editorState === null || Array.isArray(editorState)) {
      res.status(400).json({ error: 'editorState invalide.' })
      return
    }
    const generation = await prisma.generation.findFirst({ where: { id, userId: req.user.id } })
    if (!generation) {
      res.status(404).json({ error: 'Generation introuvable.' })
      return
    }
    await prisma.generation.update({ where: { id }, data: { editorState } })
    res.json({ ok: true })
  } catch (error) {
    next(error)
  }
})

generationsRouter.get('/:id', requireAuth, async (req: AuthedRequest, res, next) => {
  try {
    if (!req.user) return
    const id = String(req.params.id)
    const generation = await prisma.generation.findFirst({
      where: { id, userId: req.user.id },
      include: { document: true },
    })
    if (!generation) {
      res.status(404).json({ error: 'Generation introuvable.' })
      return
    }
    res.json({ generation })
  } catch (error) {
    next(error)
  }
})
