import { z } from 'zod'
import { env } from '../env'

const keywordSchema = z.object({
  technical: z.array(z.string()).default([]),
  softSkills: z.array(z.string()).default([]),
  experience: z.array(z.string()).default([]),
})

const optimizationItemSchema = z.object({
  section: z.string().catch('Section'),
  avant: z.string().optional().default(''),
  apres: z.string().catch(''),
})

const optimizationSchema = z.array(optimizationItemSchema)
const optimizationResponseSchema = z.object({
  optimizations: optimizationSchema.default([]),
})

const structuredCvSchema = z.object({
  fullName: z.string().default(''),
  title: z.string().default(''),
  profile: z.string().default(''),
  contact: z.object({
    email: z.string().default(''),
    phone: z.string().default(''),
    location: z.string().default(''),
    linkedin: z.string().default(''),
    portfolio: z.string().default(''),
  }).default({ email: '', phone: '', location: '', linkedin: '', portfolio: '' }),
  experiences: z.array(z.object({
    title: z.string().default(''),
    company: z.string().default(''),
    period: z.string().default(''),
    location: z.string().default(''),
    bullets: z.array(z.string()).default([]),
  })).default([]),
  education: z.array(z.object({
    degree: z.string().default(''),
    school: z.string().default(''),
    location: z.string().default(''),
    period: z.string().default(''),
    description: z.string().default(''),
  })).default([]),
  skills: z.array(z.string()).default([]),
  languages: z.array(z.object({
    language: z.string().default(''),
    level: z.string().default(''),
  })).default([]),
  certifications: z.array(z.string()).default([]),
  interests: z.array(z.string()).default([]),
})

export type KeywordSet = z.infer<typeof keywordSchema>
export type OptimizationResult = z.infer<typeof optimizationItemSchema>
export type StructuredCv = z.infer<typeof structuredCvSchema>

/* Fournisseur unique : OpenAI. Pas de bascule vers un autre fournisseur. */
async function callAI(systemPrompt: string, userPrompt: string, options: { json?: boolean; maxTokens?: number } = {}) {
  return callOpenAI(systemPrompt, userPrompt, options)
}

async function callOpenAI(systemPrompt: string, userPrompt: string, options: { json?: boolean; maxTokens?: number } = {}) {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY est requis : configurez-le dans le fichier .env.')
  }

  const body: Record<string, unknown> = {
    model: env.OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: options.maxTokens ?? 12000,
    temperature: 0.2,
  }

  if (options.json) {
    body.response_format = { type: 'json_object' }
  }

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`OpenAI API error (${response.status}): ${text}`)
  }

  const data = await response.json() as { choices?: Array<{ finish_reason?: string; message?: { content?: string } }> }
  const choice = data.choices?.[0]
  const content = choice?.message?.content ?? ''
  if (!content.trim() && choice?.finish_reason === 'length') {
    throw new Error('OpenAI response truncated before content. Increase max_tokens or use a smaller input.')
  }
  return content
}

function parseJsonObject(content: string) {
  const match = content.match(/\{[\s\S]*\}/)
  if (!match) throw new Error('JSON object not found')
  return JSON.parse(match[0])
}

function parseJsonArray(content: string) {
  const match = content.match(/\[[\s\S]*\]/)
  if (!match) throw new Error('JSON array not found')
  return JSON.parse(match[0])
}

function normalizeOptimizations(items: OptimizationResult[]) {
  return items
    .map(item => ({
      section: item.section.trim() || 'Section',
      avant: item.avant.trim(),
      apres: item.apres.trim(),
    }))
    .filter(item => item.apres.length > 0)
}

export async function extractKeywordsFromOffer(offerText: string): Promise<KeywordSet> {
  const content = await callAI(
    `Tu es un expert RH et ATS. Retourne uniquement un JSON valide, sans markdown.
Classe uniquement les mots-cles explicitement presents ou clairement requis dans l'offre.
{"technical":[""],"softSkills":[""],"experience":[""]}`,
    `Extrais les mots-cles de cette offre:\n\n${offerText.slice(0, 12000)}`,
    { json: true, maxTokens: 3000 },
  )
  return keywordSchema.parse(parseJsonObject(content))
}

export interface OptimizationContext {
  keywords?: KeywordSet
  missingKeywords?: string[]
}

export async function generateOptimizations(
  cvText: string,
  offerText: string,
  context: OptimizationContext = {},
): Promise<OptimizationResult[]> {
  const keywordLines: string[] = []
  if (context.keywords) {
    const flat = [
      ...context.keywords.technical,
      ...context.keywords.softSkills,
      ...context.keywords.experience,
    ].filter(Boolean)
    if (flat.length > 0) {
      keywordLines.push(`Mots-cles cibles de l'offre (reprendre la formulation exacte): ${flat.join(', ')}`)
    }
  }
  if (context.missingKeywords && context.missingKeywords.length > 0) {
    keywordLines.push(`Mots-cles actuellement ABSENTS du CV (a integrer en priorite dans les sections concernees): ${context.missingKeywords.join(', ')}`)
  }

  const content = await callAI(
    `Tu es un expert CV/ATS senior. Objectif prioritaire: AMELIORER fortement la correspondance entre le CV et ce poste, sans inventer le parcours.
Passe en revue CHAQUE section du CV, dans cet ordre: Titre, Profil, chaque Experience professionnelle (TOUTES, une par une), Competences, Formation, Langues, Certifications, Passions/Centres d'interet.
Retourne une optimisation pour CHAQUE section presente dans le CV. Ne saute une section que si elle est deja PARFAITEMENT alignee sur l'offre (cas exceptionnel).
IMPORTANT: les sections Langues, Certifications et Passions doivent TOUJOURS etre optimisees quand elles existent dans le CV — leur reformulation orientee poste apporte systematiquement de la valeur ATS.
Ne cree pas de section absente du CV.

Nommage OBLIGATOIRE du champ "section":
- "Titre" pour le titre du CV
- "Profil" pour le resume/profil
- "Experience — <intitule du poste> | <nom EXACT de l'entreprise tel qu'ecrit dans le CV>" pour chaque experience
- "Competences" pour la section competences
- "Formation — <intitule exact du diplome>" pour CHAQUE diplome de la formation
- "Langues" pour les langues
- "Certifications" pour les certifications
- "Passions" pour les passions/centres d'interet/hobbies

Regles d'optimisation:
- Integre un MAXIMUM de mots-cles de l'offre, avec la formulation EXACTE de l'offre (les ATS matchent sur les termes exacts) — y compris les competences implicites ou adjacentes au parcours.
- Titre: aligne-le sur l'intitule EXACT du poste de l'offre, complete par 2-4 competences cles.
- Profil: 2-3 phrases denses reliant le parcours aux exigences de l'offre, avec les mots-cles majeurs.
- Experiences: reecris chaque contenu en 3 a 5 bullets percutants. Verbes d'action forts en debut de bullet. Conserve uniquement les chiffres, volumes, delais, budgets ou resultats deja presents dans le CV; n'en invente jamais. Dans "apres": intitule du poste sur la premiere ligne, puis une ligne par bullet commencant par "• ". Tu peux ajuster l'intitule s'il reste credible.
- Competences: liste enrichie separee par " · ", integrant tous les mots-cles manquants compatibles avec le parcours.
- Formation: pour CHAQUE diplome, retourne une optimisation "Formation — <intitule exact du diplome>" dont "apres" est UNE ligne de description du contenu de la formation orientee vers l'offre (domaines, technologies, methodes vus pendant la formation). Ex: "Formation approfondie en architecture Big Data, Machine Learning et visualisation de donnees avancee." Ne modifie jamais l'intitule du diplome, l'ecole ni les dates.
- Langues: transforme chaque niveau en capacite professionnelle utile pour CE poste, une ligne par langue au format "Langue : niveau — capacite". Ex: "Anglais : Professionnel (B2) — Capacite a presenter des insights en equipe". Garde le niveau reel (B2 reste B2).
- Certifications: reordonne et reformule pour mettre en avant celles pertinentes pour l'offre, avec les mots-cles exacts, une ligne par certification au format "Nom : apport pour le poste".
- Passions: reformule chaque centre d'interet au format "Passion : qualite utile au poste", une ligne par passion. Ex: "Resolution de problemes : Passion pour l'analyse de mecanismes complexes et la transformation de donnees brutes en solutions actionnables."
- Pour les acronymes, ecris les deux formes: acronyme + forme complete (ex: "SEO (Search Engine Optimization)").
- Reformulations orientees poste autorisees, mais LIMITES ABSOLUES: n'invente jamais de diplome, d'employeur, de certification nominative, de date, de chiffre, de resultat, d'outil ou de competence non soutenue par le CV. Entreprises et periodes restent inchangees.
- Dans "avant", recopie le texte original exact de la section (ou son resume fidele).
- Retourne uniquement un JSON object valide, sans markdown:
{"optimizations":[{"section":"Titre","avant":"texte original","apres":"texte optimise"},{"section":"Experience — Poste | Entreprise","avant":"texte original","apres":"Intitule du poste\\n• bullet 1\\n• bullet 2"},{"section":"Formation — Master Big Data","avant":"Master Big Data - ESGI","apres":"Formation approfondie en architecture Big Data, Machine Learning et visualisation de donnees avancee."},{"section":"Langues","avant":"Anglais (B2)","apres":"Anglais : Professionnel (B2) — Capacite a presenter des insights en equipe"},{"section":"Passions","avant":"Football","apres":"Football : esprit d'equipe et regularite dans l'effort"}]}`,
    `CV:\n${cvText.slice(0, 14000)}\n\nOffre:\n${offerText.slice(0, 8000)}\n${keywordLines.length > 0 ? `\n${keywordLines.join('\n')}\n` : ''}
Analyse chaque section du CV et propose les ameliorations necessaires par rapport a l'offre.
RAPPEL: si le CV contient des sections Langues, Certifications ou Passions/Centres d'interet, tu DOIS retourner une optimisation pour chacune d'elles.`,
    { json: true, maxTokens: 9000 },
  )
  try {
    return normalizeOptimizations(optimizationResponseSchema.parse(parseJsonObject(content)).optimizations)
  } catch {
    return normalizeOptimizations(optimizationSchema.parse(parseJsonArray(content)))
  }
}

export async function structureCv(cvText: string): Promise<StructuredCv> {
  const content = await callAI(
    `Tu es un parseur de CV. Retourne uniquement un JSON valide, sans markdown, au format exact:
{"fullName":"","title":"","profile":"","contact":{"email":"","phone":"","location":"","linkedin":"","portfolio":""},"experiences":[{"title":"","company":"","period":"","location":"","bullets":[""]}],"education":[{"degree":"","school":"","location":"","period":"","description":""}],"skills":[""],"languages":[{"language":"","level":""}],"certifications":[""],"interests":[""]}
Regles strictes:
- EXHAUSTIVITE ABSOLUE: recopie TOUTES les informations presentes dans le CV, sans en omettre AUCUNE. Tous les bullets de chaque experience (integralement, pas de resume), tous les diplomes, toutes les competences, toutes les langues, toutes les certifications, tous les liens.
- N'invente rien qui ne soit pas dans le CV.
- education[].description: la description ou le contenu de la formation si mentionne dans le CV.
- interests: les passions, centres d'interet ou hobbies mentionnes dans le CV.
- Laisse vide ("" ou []) tout champ absent du CV.
- Conserve les periodes et intitules tels quels.`,
    `Structure ce CV:\n\n${cvText.slice(0, 18000)}`,
    { json: true, maxTokens: 9000 },
  )
  return structuredCvSchema.parse(parseJsonObject(content))
}

const translatedCvSchema = z.object({
  structuredCv: structuredCvSchema,
  optimizations: optimizationSchema.default([]),
})

export async function translateCvToEnglish(
  structuredCv: StructuredCv,
  optimizations: OptimizationResult[],
  offerText: string,
) {
  const content = await callAI(
    `You are a senior bilingual resume editor. Return only valid JSON, no markdown.
Translate this CV content into professional English for the target job context.
Rules:
- Do NOT translate literally. Adapt wording to natural English resume language.
- Preserve facts: employers, schools, dates, degrees, certifications, tools, URLs and contact details stay accurate.
- Keep metrics and numbers unchanged.
- Use concise action verbs and ATS-friendly English terms from the job offer when they are supported by the CV.
- Keep the exact same JSON shape:
{"structuredCv":{...},"optimizations":[{"section":"","avant":"","apres":""}]}
- Translate section names in optimizations too, but keep them understandable.`,
    `Target job offer context:\n${offerText.slice(0, 8000)}\n\nStructured CV JSON:\n${JSON.stringify(structuredCv).slice(0, 18000)}\n\nOptimizations JSON:\n${JSON.stringify(optimizations).slice(0, 14000)}`,
    { json: true, maxTokens: 10000 },
  )
  const translated = translatedCvSchema.parse(parseJsonObject(content))
  return {
    structuredCv: translated.structuredCv,
    optimizations: normalizeOptimizations(translated.optimizations),
  }
}

export function applyOptimizations(cvText: string, optimizations: OptimizationResult[]): string {
  let result = cvText
  const additions: string[] = []
  for (const opt of optimizations) {
    if (opt.avant && result.includes(opt.avant)) {
      result = result.replace(opt.avant, opt.apres)
    } else {
      additions.push(`${opt.section}:\n${opt.apres}`)
    }
  }
  return additions.length > 0 ? `${result}\n\n${additions.join('\n\n')}` : result
}

export async function generateCoverLetter(cvText: string, offerText: string): Promise<string> {
  const content = await callAI(
    `Tu es un expert en recrutement francophone. Redige une lettre de motivation professionnelle, adaptee a l'offre, basee UNIQUEMENT sur le parcours reel du CV.
Regles strictes:
- N'invente aucune experience, diplome, entreprise ou competence absente du CV.
- Structure: accroche liee au poste et a l'entreprise, 2 paragraphes reliant les experiences du CV aux besoins de l'offre (avec resultats concrets du CV), un paragraphe de motivation/projection, formule de politesse.
- Ton professionnel, direct, sans cliches creux ("dynamique et motive") ni flatterie excessive.
- Si le nom de l'entreprise apparait dans l'offre, utilise-le EXPLICITEMENT dans l'accroche et le paragraphe de projection (jamais de "votre entreprise" quand le nom est connu).
- Reprends naturellement les mots-cles importants de l'offre quand le CV les prouve.
- 250 a 350 mots. En francais.
- Retourne uniquement le texte de la lettre, sans objet, sans coordonnees d'en-tete, sans markdown ni commentaires.`,
    `CV:\n${cvText.slice(0, 15000)}\n\nOffre d'emploi:\n${offerText.slice(0, 10000)}\n\nRedige la lettre de motivation.`,
    { maxTokens: 2500 },
  )
  const letter = content.trim()
  if (!letter) throw new Error('Lettre de motivation vide.')
  return letter
}

const interviewPrepSchema = z.object({
  pitch: z.string().default(''),
  questions: z.array(z.object({
    question: z.string().default(''),
    answer: z.string().default(''),
  })).default([]),
  objections: z.array(z.object({
    risk: z.string().default(''),
    response: z.string().default(''),
  })).default([]),
  questionsToAsk: z.array(z.string()).default([]),
})

export type InterviewPrep = z.infer<typeof interviewPrepSchema>

export async function generateInterviewPrep(cvText: string, offerText: string): Promise<InterviewPrep> {
  const content = await callAI(
    `Tu es coach entretien senior. Retourne uniquement un JSON valide, sans markdown.
Prepare un candidat pour un entretien base sur son CV reel et l'offre.
N'invente aucune experience, diplome, employeur ni competence absente du CV.
Format exact:
{"pitch":"pitch de 30 secondes","questions":[{"question":"question probable","answer":"reponse conseillee en methode STAR, concise et concrete"}],"objections":[{"risk":"point faible ou doute recruteur","response":"reponse honnete et rassurante"}],"questionsToAsk":["question pertinente a poser au recruteur"]}
Contraintes:
- pitch: 70 a 100 mots. Si le nom de l'entreprise apparait dans l'offre, cite-le explicitement dans le pitch et les reponses.
- questions: 8 questions probables, avec reponses orientees preuves du CV.
- objections: 4 risques reels du profil par rapport a l'offre.
- questionsToAsk: 5 questions intelligentes sur le poste, l'equipe, les objectifs et les donnees/outils.`,
    `CV:\n${cvText.slice(0, 15000)}\n\nOffre d'emploi:\n${offerText.slice(0, 10000)}\n\nGenere la preparation entretien.`,
    { json: true, maxTokens: 5000 },
  )
  return interviewPrepSchema.parse(parseJsonObject(content))
}

/* ── passe de verification : integre les mots-cles encore manquants
      dans Profil et Competences pour viser la couverture totale ── */
export async function reinforceMissingKeywords(
  cvText: string,
  offerText: string,
  missingKeywords: string[],
): Promise<OptimizationResult[]> {
  const content = await callAI(
    `Tu es un expert CV/ATS. Des mots-cles de l'offre manquent encore dans le CV optimise.
Integre CHACUN de ces mots-cles, avec la formulation EXACTE fournie, dans une version enrichie des sections Profil et Competences — de facon naturelle et credible pour ce parcours.
Retourne uniquement un JSON valide, sans markdown:
{"optimizations":[{"section":"Profil","avant":"texte original","apres":"profil enrichi"},{"section":"Competences","avant":"texte original","apres":"liste enrichie separee par \\" · \\""}]}`,
    `CV:\n${cvText.slice(0, 8000)}\n\nOffre:\n${offerText.slice(0, 5000)}\n\nMots-cles a integrer IMPERATIVEMENT (formulation exacte): ${missingKeywords.join(', ')}`,
    { json: true, maxTokens: 2000 },
  )
  try {
    return normalizeOptimizations(optimizationResponseSchema.parse(parseJsonObject(content)).optimizations)
  } catch {
    return []
  }
}

const atsAuditSchema = z.object({
  score: z.coerce.number().catch(50),
  missingKeywords: z.array(z.string()).default([]),
  blockingIssues: z.array(z.string()).default([]),
})

export type AtsAudit = z.infer<typeof atsAuditSchema>

/* ── analyse combinee (1 seul appel) : mots-cles de l'offre + audit ATS du CV ── */
const offerAnalysisSchema = z.object({
  keywords: keywordSchema.default({ technical: [], softSkills: [], experience: [] }),
  score: z.coerce.number().catch(50),
  keywordCoverage: z.coerce.number().catch(15),
  missingKeywords: z.array(z.string()).default([]),
  blockingIssues: z.array(z.string()).default([]),
})

export type OfferAnalysis = z.infer<typeof offerAnalysisSchema>

export async function analyzeOfferAndCv(cvText: string, offerText: string): Promise<OfferAnalysis> {
  const content = await callAI(
    `Tu es un expert RH et auditeur ATS. En un seul passage, fais deux choses et retourne uniquement un JSON valide:
{"keywords":{"technical":[""],"softSkills":[""],"experience":[""]},"score":0,"keywordCoverage":0,"missingKeywords":[""],"blockingIssues":[""]}

1. keywords: les mots-cles explicitement presents ou clairement requis dans l'OFFRE (techniques, soft skills, experience).
2. Audit ATS du CV face a l'offre:
- keywordCoverage: 0-35, mots-cles de l'offre vraiment presents dans le CV (matching exact, comme un vrai ATS).
- score: total 0-100 = keywordCoverage (0-35) + adequation experience (0-25) + structure (0-15) + clarte (0-15) + lisibilite (0-10).
- missingKeywords: mots-cles importants de l'offre ABSENTS du CV, avec la formulation exacte de l'offre.
Sois rapide et direct, pas d'explication.`,
    `CV:\n${cvText.slice(0, 12000)}\n\nOffre:\n${offerText.slice(0, 8000)}`,
    { json: true, maxTokens: 2500 },
  )
  const parsed = offerAnalysisSchema.parse(parseJsonObject(content))
  return {
    ...parsed,
    score: Math.max(0, Math.min(100, Math.round(parsed.score))),
    keywordCoverage: Math.max(0, Math.min(35, Math.round(parsed.keywordCoverage))),
  }
}

/* ── score "apres" deterministe et instantane : matching exact des mots-cles
      dans le texte optimise, comme le ferait un vrai ATS (0 appel IA) ── */
const normalizeForMatch = (t: string) => t
  .toLowerCase()
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/['\u2019\u00b4`-]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

export function estimateOptimizedScore(
  analysis: OfferAnalysis,
  optimizedText: string,
  optimizationsCount: number,
): { score: number; missingAfter: string[] } {
  const haystack = normalizeForMatch(optimizedText)
  const missingAfter = analysis.missingKeywords.filter(keyword => !haystack.includes(normalizeForMatch(keyword)))
  const total = analysis.missingKeywords.length
  const covered = total - missingAfter.length
  // Couverture des mots-cles : credite au minimum 12 points de marge quand
  // des mots-cles manquants ont ete integres (les ATS scorent sur le matching exact).
  const coverageHeadroom = Math.max(0, 35 - analysis.keywordCoverage)
  const coverageGain = total > 0
    ? Math.round((covered / total) * Math.max(coverageHeadroom, 12))
    : Math.min(6, Math.max(coverageHeadroom, 4))
  // Reecriture complete (titre aligne, verbes d'action, chiffres, sections standard) :
  // gains de clarte, structure et adequation d'experience.
  const improvementGain = Math.min(14, 4 + 2 * optimizationsCount)
  // Le score reste un indicateur interne : couvrir les mots-cles aide, mais ne
  // garantit pas une adequation parfaite au poste ni le comportement de chaque ATS.
  const criticalGapPenalty = missingAfter.length * 5
  const evidencePenalty = analysis.blockingIssues.length * 3
  const optimizedCeiling = 96 - criticalGapPenalty - evidencePenalty
  const score = Math.max(
    analysis.score,
    Math.min(98, Math.max(0, Math.max(optimizedCeiling, analysis.score + coverageGain + improvementGain))),
  )
  return { score, missingAfter }
}

export async function auditATS(cvText: string, offerText: string): Promise<AtsAudit> {
  const content = await callAI(
    `Tu es un auditeur ATS. Retourne uniquement un JSON valide:
{"score":0,"keywordCoverage":0,"experienceMatch":0,"structure":0,"clarity":0,"readability":0,"missingKeywords":[""],"blockingIssues":[""]}

Bareme:
- keywordCoverage: 0-35, mots-cles et competences obligatoires de l'offre vraiment presents dans le CV (matching sur les termes exacts, comme un vrai ATS).
- experienceMatch: 0-25, coherence entre responsabilites du poste et experiences prouvees.
- structure: 0-15, sections standard: titre, profil, experiences, competences, formation, contact.
- clarity: 0-15, formulation concrete, impact, verbes d'action, metriques presentes quand elles existent.
- readability: 0-10, texte lisible par ATS, pas de contenu confus ou trop generique.
Le score total est la somme de ces criteres.
missingKeywords: liste les mots-cles importants de l'offre ABSENTS du CV, avec la formulation exacte de l'offre.
Ne donne 100 que si tous les mots-cles critiques sont couverts, les responsabilites principales correspondent, les sections sont completes, et aucun probleme bloquant n'existe.
Si le CV ne prouve pas une exigence de l'offre, penalise au lieu d'inventer.`,
    `CV:\n${cvText.slice(0, 12000)}\n\nOffre:\n${offerText.slice(0, 8000)}`,
    { json: true, maxTokens: 3000 },
  )
  try {
    const audit = atsAuditSchema.parse(parseJsonObject(content))
    return { ...audit, score: Math.max(0, Math.min(100, Math.round(audit.score))) }
  } catch {
    const match = content.match(/\d+/)
    const score = match ? Math.max(0, Math.min(100, Number.parseInt(match[0], 10))) : 50
    return { score, missingKeywords: [], blockingIssues: [] }
  }
}
