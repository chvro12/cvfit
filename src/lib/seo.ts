export type SeoPage = {
  title: string
  description: string
  path: string
  robots?: string
  faqs?: Array<{ question: string; answer: string }>
}

export const siteUrl = 'https://cvfit.fr'

export const seoPages: Record<string, SeoPage> = {
  '/': {
    path: '/',
    title: 'CVFit - Adapter son CV à chaque offre avec l’IA',
    description: 'CVFit analyse une offre d’emploi, extrait les mots-clés importants et adapte votre CV avec l’IA pour améliorer sa lisibilité ATS.',
  },
  '/optimiser-cv-ats': {
    path: '/optimiser-cv-ats',
    title: 'Optimiser un CV ATS - Méthode et outil IA | CVFit',
    description: 'Comprenez comment optimiser un CV pour les ATS : mots-clés, structure, expériences ciblées et export propre avec CVFit.',
    faqs: [
      {
        question: 'Qu’est-ce qu’un CV compatible ATS ?',
        answer: 'Un CV compatible ATS est un CV lisible par les logiciels de recrutement, avec une structure claire, des intitulés simples et des mots-clés cohérents avec l’offre.',
      },
      {
        question: 'CVFit garantit-il un score ATS de 100 % ?',
        answer: 'Non. CVFit améliore la correspondance entre le CV et l’offre, mais un score dépend aussi du contenu réel du parcours, du fichier exporté et de l’ATS utilisé par l’entreprise.',
      },
    ],
  },
  '/adapter-cv-offre-emploi': {
    path: '/adapter-cv-offre-emploi',
    title: 'Adapter son CV à une offre d’emploi | CVFit',
    description: 'Apprenez à adapter votre CV à une offre d’emploi sans inventer votre parcours : mots-clés, résumé, expériences et compétences.',
    faqs: [
      {
        question: 'Faut-il modifier son CV pour chaque candidature ?',
        answer: 'Oui, il est utile d’ajuster les formulations, l’ordre des informations et les mots-clés pour répondre précisément aux attentes de l’offre.',
      },
      {
        question: 'L’IA peut-elle inventer des expériences ?',
        answer: 'CVFit est conçu pour reformuler et prioriser les informations existantes, pas pour créer des diplômes, entreprises ou missions fictives.',
      },
    ],
  },
  '/score-ats-cv': {
    path: '/score-ats-cv',
    title: 'Score ATS CV - Comprendre et améliorer son score | CVFit',
    description: 'Découvrez les critères qui influencent un score ATS et comment améliorer la correspondance entre votre CV et une offre.',
    faqs: [
      {
        question: 'Pourquoi mon score ATS n’est-il pas à 100 % ?',
        answer: 'Un score peut rester inférieur à 100 % si certains prérequis de l’offre ne figurent pas réellement dans votre parcours ou si le format du CV limite la lecture automatique.',
      },
      {
        question: 'Un bon score ATS suffit-il pour obtenir un entretien ?',
        answer: 'Non. Le score aide au filtrage, mais la pertinence du parcours, la clarté du CV et les critères du recruteur restent déterminants.',
      },
    ],
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

export function getSeoPage(pathname: string) {
  return seoPages[pathname] ?? seoPages['/']
}

export function canonicalFor(pathname: string) {
  return `${siteUrl}${pathname === '/' ? '/' : pathname}`
}

export function buildJsonLd(page: SeoPage) {
  const baseGraph: unknown[] = [
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
  ]

  if (page.faqs?.length) {
    baseGraph.push({
      '@type': 'FAQPage',
      '@id': `${canonicalFor(page.path)}#faq`,
      mainEntity: page.faqs.map((faq) => ({
        '@type': 'Question',
        name: faq.question,
        acceptedAnswer: {
          '@type': 'Answer',
          text: faq.answer,
        },
      })),
    })
  }

  return {
    '@context': 'https://schema.org',
    '@graph': baseGraph,
  }
}
