import path from 'node:path'
import { readFile } from 'node:fs/promises'
import cookieParser from 'cookie-parser'
import express, { type ErrorRequestHandler } from 'express'
import { MulterError } from 'multer'
import { ZodError } from 'zod'
import { env } from './env'
import { ensureAdminUser } from './lib/auth'
import { ApiError } from './lib/errors'
import { authRouter } from './routes/auth'
import { aiRouter } from './routes/ai'
import { documentsRouter } from './routes/documents'
import { generationsRouter } from './routes/generations'
import { adminRouter } from './routes/admin'
import { applicationsRouter } from './routes/applications'

const app = express()

type SeoPage = {
  title: string
  description: string
  path: string
  robots?: string
}

const siteUrl = 'https://cvfit.fr'
const seoPages: Record<string, SeoPage> = {
  '/': {
    path: '/',
    title: 'CVFit - Adapter son CV à chaque offre avec l’IA',
    description: 'CVFit analyse une offre d’emploi, extrait les mots-clés importants et adapte votre CV avec l’IA pour améliorer sa lisibilité ATS.',
  },
  '/optimiser-cv-ats': {
    path: '/optimiser-cv-ats',
    title: 'Optimiser un CV ATS - Méthode et outil IA | CVFit',
    description: 'Comprenez comment optimiser un CV pour les ATS : mots-clés, structure, expériences ciblées et export propre avec CVFit.',
  },
  '/adapter-cv-offre-emploi': {
    path: '/adapter-cv-offre-emploi',
    title: 'Adapter son CV à une offre d’emploi | CVFit',
    description: 'Apprenez à adapter votre CV à une offre d’emploi sans inventer votre parcours : mots-clés, résumé, expériences et compétences.',
  },
  '/score-ats-cv': {
    path: '/score-ats-cv',
    title: 'Score ATS CV - Comprendre et améliorer son score | CVFit',
    description: 'Découvrez les critères qui influencent un score ATS et comment améliorer la correspondance entre votre CV et une offre.',
  },
  '/lettre-motivation-ia': {
    path: '/lettre-motivation-ia',
    title: 'Lettre de motivation IA contextualisée | CVFit',
    description: 'Générez une lettre de motivation cohérente avec votre CV et l’offre d’emploi, sans texte générique ni formulation hors contexte.',
  },
  '/preparation-entretien': {
    path: '/preparation-entretien',
    title: 'Préparation entretien à partir d’une offre | CVFit',
    description: 'Préparez vos entretiens avec des questions probables, angles de réponse et points forts issus de votre CV et de l’offre.',
  },
  '/analyse-offre-emploi': {
    path: '/analyse-offre-emploi',
    title: 'Analyse d’offre d’emploi et mots-clés CV | CVFit',
    description: 'Analysez une offre d’emploi pour identifier les compétences, mots-clés, missions et attentes à reprendre dans votre CV.',
  },
  '/tarifs': {
    path: '/tarifs',
    title: 'Tarifs CVFit - Optimisation CV IA',
    description: 'Consultez les options CVFit pour optimiser vos CV, générer des lettres de motivation et préparer vos candidatures.',
  },
  '/a-propos': {
    path: '/a-propos',
    title: 'À propos de CVFit',
    description: 'Découvrez la mission de CVFit : aider les candidats à adapter leur CV à chaque offre sans perdre la cohérence de leur parcours.',
  },
  '/cgu': {
    path: '/cgu',
    title: 'Conditions générales d’utilisation | CVFit',
    description: 'Conditions générales d’utilisation du service CVFit, outil d’aide à l’optimisation de CV et de candidatures.',
  },
  '/confidentialite': {
    path: '/confidentialite',
    title: 'Politique de confidentialité | CVFit',
    description: 'Politique de confidentialité de CVFit : données collectées, traitement IA, conservation, sécurité et droits des utilisateurs.',
  },
  '/mentions-legales': {
    path: '/mentions-legales',
    title: 'Mentions légales | CVFit',
    description: 'Mentions légales du site CVFit, informations d’édition, hébergement, propriété intellectuelle et contact.',
  },
  '/connexion': {
    path: '/connexion',
    title: 'Connexion | CVFit',
    description: 'Connectez-vous à votre espace CVFit.',
    robots: 'noindex, nofollow',
  },
  '/app': {
    path: '/app',
    title: 'Nouvelle adaptation CV | CVFit',
    description: 'Importez un CV et adaptez-le à une offre d’emploi.',
    robots: 'noindex, nofollow',
  },
  '/espace': {
    path: '/espace',
    title: 'Mon espace | CVFit',
    description: 'Retrouvez vos CV, adaptations et candidatures.',
    robots: 'noindex, nofollow',
  },
  '/adaptations': {
    path: '/adaptations',
    title: 'Mes adaptations CV | CVFit',
    description: 'Retrouvez l’historique de vos adaptations de CV.',
    robots: 'noindex, nofollow',
  },
  '/bibliotheque-cv': {
    path: '/bibliotheque-cv',
    title: 'Bibliothèque CV | CVFit',
    description: 'Retrouvez les CV importés et téléchargez vos documents.',
    robots: 'noindex, nofollow',
  },
  '/lettres-motivation': {
    path: '/lettres-motivation',
    title: 'Lettres de motivation | CVFit',
    description: 'Retrouvez l’historique de vos lettres de motivation générées avec CVFit.',
    robots: 'noindex, nofollow',
  },
  '/candidatures': {
    path: '/candidatures',
    title: 'Candidatures | CVFit',
    description: 'Suivez vos candidatures, relances et entretiens.',
    robots: 'noindex, nofollow',
  },
  '/admin': {
    path: '/admin',
    title: 'Administration | CVFit',
    description: 'Administration CVFit.',
    robots: 'noindex, nofollow',
  },
}

function canonicalFor(pathname: string) {
  return `${siteUrl}${pathname === '/' ? '/' : pathname}`
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function buildJsonLd(page: SeoPage) {
  return JSON.stringify({
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Organization',
        '@id': `${siteUrl}/#organization`,
        name: 'CVFit',
        url: siteUrl,
        email: 'contact@cvfit.fr',
        logo: `${siteUrl}/favicon.svg`,
      },
      {
        '@type': 'WebSite',
        '@id': `${siteUrl}/#website`,
        url: siteUrl,
        name: 'CVFit',
        publisher: { '@id': `${siteUrl}/#organization` },
        inLanguage: 'fr-FR',
      },
      {
        '@type': 'SoftwareApplication',
        '@id': `${siteUrl}/#software`,
        name: 'CVFit',
        applicationCategory: 'BusinessApplication',
        operatingSystem: 'Web',
        url: siteUrl,
        description: seoPages['/'].description,
        offers: {
          '@type': 'Offer',
          price: '0',
          priceCurrency: 'EUR',
        },
      },
      {
        '@type': 'WebPage',
        '@id': `${canonicalFor(page.path)}#webpage`,
        url: canonicalFor(page.path),
        name: page.title,
        description: page.description,
        isPartOf: { '@id': `${siteUrl}/#website` },
        inLanguage: 'fr-FR',
      },
    ],
  })
}

const prerenderedSections: Record<string, string[]> = {
  '/optimiser-cv-ats': [
    'Identifier les mots-clés importants de l’offre.',
    'Structurer le CV pour les logiciels ATS.',
    'Adapter les expériences sans inventer le parcours.',
  ],
  '/adapter-cv-offre-emploi': [
    'Analyser les missions et compétences demandées.',
    'Réécrire le résumé professionnel avec le bon contexte.',
    'Prioriser les expériences les plus pertinentes.',
  ],
  '/score-ats-cv': [
    'Comprendre les critères qui influencent le score ATS.',
    'Repérer les écarts entre le CV et l’offre.',
    'Améliorer les formulations et la lisibilité du fichier.',
  ],
  '/analyse-offre-emploi': [
    'Extraire les compétences, outils et responsabilités clés.',
    'Distinguer les critères obligatoires des signaux secondaires.',
    'Transformer l’analyse en actions concrètes sur le CV.',
  ],
  '/lettre-motivation-ia': [
    'Créer une lettre cohérente avec le CV et l’offre.',
    'Éviter les textes génériques.',
    'Garder une formulation naturelle et vérifiable.',
  ],
  '/preparation-entretien': [
    'Anticiper les questions probables.',
    'Préparer des exemples issus du CV.',
    'Relier les réponses aux attentes du poste.',
  ],
  '/tarifs': [
    'Démarrer gratuitement.',
    'Optimiser ses candidatures avec CVFit.',
    'Accéder aux fonctionnalités selon les options disponibles.',
  ],
  '/a-propos': [
    'Aider les candidats à mieux présenter leur parcours.',
    'Adapter le CV à chaque offre avec méthode.',
    'Garder l’utilisateur maître des contenus générés.',
  ],
  '/cgu': [
    'Conditions d’accès et d’utilisation du service.',
    'Responsabilités de l’utilisateur.',
    'Règles liées aux contenus générés par IA.',
  ],
  '/confidentialite': [
    'Données utilisées pour fournir le service.',
    'Traitement IA côté serveur.',
    'Droits d’accès, rectification et suppression.',
  ],
  '/mentions-legales': [
    'Informations relatives au site CVFit.',
    'Hébergement du service.',
    'Contact et propriété intellectuelle.',
  ],
}

function renderPrerenderedRoot(page: SeoPage) {
  if (page.robots || page.path === '/') {
    return '<div id="root"></div>'
  }

  const sections = prerenderedSections[page.path] ?? []
  const items = sections.map((item) => `<li>${escapeHtml(item)}</li>`).join('')

  return `<div id="root"><main style="font-family:Inter,Arial,sans-serif;background:#FAFAFA;color:#374151;min-height:100vh;padding:96px 24px 56px"><section style="max-width:920px;margin:0 auto"><p style="color:#F85A3E;font-weight:700;text-transform:uppercase;letter-spacing:.08em;font-size:13px;margin:0 0 16px">CVFit</p><h1 style="color:#0B1D3A;font-size:42px;line-height:1.08;margin:0 0 20px">${escapeHtml(page.title)}</h1><p style="font-size:19px;line-height:1.65;margin:0 0 28px;max-width:760px">${escapeHtml(page.description)}</p><ul style="display:grid;gap:12px;font-size:16px;line-height:1.55;margin:0 0 32px;padding-left:22px">${items}</ul><a href="/app" style="display:inline-block;background:#F85A3E;color:#fff;text-decoration:none;font-weight:700;border-radius:12px;padding:13px 18px">Commencer avec CVFit</a></section></main></div>`
}

function injectSeo(html: string, pathname: string) {
  const normalizedPath = pathname.endsWith('/') && pathname !== '/' ? pathname.slice(0, -1) : pathname
  const page = seoPages[normalizedPath] ?? seoPages['/']
  const canonical = canonicalFor(page.path)
  const robots = page.robots ?? 'index, follow'

  return html
    .replace(/<title>.*?<\/title>/, `<title>${escapeHtml(page.title)}</title>`)
    .replace(/<meta name="description" content="[^"]*" \/>/, `<meta name="description" content="${escapeHtml(page.description)}" />`)
    .replace(/<meta name="robots" content="[^"]*" \/>/, `<meta name="robots" content="${escapeHtml(robots)}" />`)
    .replace(/<link rel="canonical" href="[^"]*" \/>/, `<link rel="canonical" href="${canonical}" />`)
    .replace(/<meta property="og:title" content="[^"]*" \/>/, `<meta property="og:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta property="og:description" content="[^"]*" \/>/, `<meta property="og:description" content="${escapeHtml(page.description)}" />`)
    .replace(/<meta property="og:url" content="[^"]*" \/>/, `<meta property="og:url" content="${canonical}" />`)
    .replace(/<meta name="twitter:title" content="[^"]*" \/>/, `<meta name="twitter:title" content="${escapeHtml(page.title)}" />`)
    .replace(/<meta name="twitter:description" content="[^"]*" \/>/, `<meta name="twitter:description" content="${escapeHtml(page.description)}" />`)
    .replace(
      /<script id="cvfit-jsonld" type="application\/ld\+json">[\s\S]*?<\/script>/,
      `<script id="cvfit-jsonld" type="application/ld+json">${buildJsonLd(page)}</script>`,
    )
    .replace('<div id="root"></div>', renderPrerenderedRoot(page))
}

app.use(express.json({ limit: '2mb' }))
app.use(cookieParser())

app.get('/api/health', (_req, res) => {
  res.json({ ok: true })
})

app.use('/api/auth', authRouter)
app.use('/api/ai', aiRouter)
app.use('/api/documents', documentsRouter)
app.use('/api/generations', generationsRouter)
app.use('/api/applications', applicationsRouter)
app.use('/api/admin', adminRouter)

if (process.env.NODE_ENV === 'production') {
  const appRoot = process.env.APP_ROOT || process.cwd()
  const distPath = path.resolve(appRoot, 'dist')
  app.use(express.static(distPath))
  // Express 5 : le wildcard '*' seul n'est plus supporte par path-to-regexp,
  // on utilise un middleware de fallback SPA.
  app.use(async (req, res, next) => {
    if (req.method !== 'GET' || req.path.startsWith('/api/')) {
      next()
      return
    }
    try {
      const html = await readFile(path.join(distPath, 'index.html'), 'utf8')
      res.type('html').send(injectSeo(html, req.path))
    } catch (error) {
      next(error)
    }
  })
}

const errorHandler: ErrorRequestHandler = (error, _req, res, _next) => {
  if (error instanceof ZodError) {
    res.status(400).json({ error: 'Donnees invalides.', details: error.flatten() })
    return
  }
  if (error instanceof ApiError) {
    res.status(error.status).json({ error: error.message })
    return
  }
  if (error instanceof MulterError) {
    const status = error.code === 'LIMIT_FILE_SIZE' ? 413 : 400
    const message = error.code === 'LIMIT_FILE_SIZE'
      ? 'Fichier trop volumineux (10 Mo maximum).'
      : 'Fichier invalide.'
    res.status(status).json({ error: message })
    return
  }
  console.error('API error:', error)
  res.status(500).json({ error: 'Erreur serveur. Reessayez plus tard.' })
}

app.use(errorHandler)

try {
  await ensureAdminUser()
} catch (error) {
  console.warn('Admin bootstrap skipped:', error instanceof Error ? error.message : error)
}

app.listen(env.PORT, () => {
  console.log(`CVFIT API listening on http://localhost:${env.PORT}`)
})
