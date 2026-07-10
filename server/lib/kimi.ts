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

type CallOptions = { json?: boolean; maxTokens?: number; deep?: boolean }

/* Fournisseur unique : OpenAI. Mode "deep" = modele plus puissant (approfondi). */
async function callAI(systemPrompt: string, userPrompt: string, options: CallOptions = {}) {
  return callOpenAI(systemPrompt, userPrompt, options)
}

async function callOpenAI(systemPrompt: string, userPrompt: string, options: CallOptions = {}) {
  if (!env.OPENAI_API_KEY) {
    throw new Error('OPENAI_API_KEY est requis : configurez-le dans le fichier .env.')
  }

  const body: Record<string, unknown> = {
    model: options.deep ? env.OPENAI_MODEL_DEEP : env.OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userPrompt },
    ],
    max_tokens: options.maxTokens ?? 12000,
    temperature: options.deep ? 0.35 : 0.2,
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
  experienceLevel?: string
  situation?: string
}

const EXPERIENCE_LEVEL_HINT: Record<string, string> = {
  etudiant: "Candidat etudiant/stagiaire: valorise projets academiques, stages et competences transferables; ton junior mais ambitieux.",
  junior: "Candidat junior (0-2 ans): met en avant l'apprentissage rapide, les premieres realisations concretes et le potentiel.",
  confirme: "Candidat confirme (3-5 ans): insiste sur l'autonomie, les resultats mesurables et la maitrise technique.",
  senior: "Candidat senior (6-10 ans): met en avant l'expertise, le pilotage de projets et l'impact business.",
  expert: "Candidat expert/lead (10+ ans): valorise le leadership, la vision strategique, l'encadrement et l'influence.",
}

const SITUATION_HINT: Record<string, string> = {
  en_poste: "En poste, recherche discrete: ton mesure et professionnel.",
  recherche_active: "En recherche active: CV percutant et immediatement operationnel pour ce poste.",
  reconversion: "En reconversion: mets fortement en avant les competences TRANSFERABLES vers ce nouveau domaine, reformule le parcours passe dans le vocabulaire du poste vise.",
  jeune_diplome: "Jeune diplome: valorise la formation, les projets, stages et l'adaptabilite; compense le manque d'experience par les competences acquises.",
  premier_emploi: "Recherche premier emploi: met en avant formation, projets et motivation; ton enthousiaste et credible.",
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
  const levelHint = context.experienceLevel ? EXPERIENCE_LEVEL_HINT[context.experienceLevel] : undefined
  if (levelHint) keywordLines.push(`Profil candidat: ${levelHint}`)
  const situationHint = context.situation ? SITUATION_HINT[context.situation] : undefined
  if (situationHint) keywordLines.push(`Situation: ${situationHint}`)

  const content = await callAI(
    `Tu es un expert CV/ATS senior et redacteur de CV tres offensif. Objectif prioritaire ABSOLU: produire une adaptation type CVize, c'est-a-dire repositionner tout le CV autour de CETTE offre pour decrocher l'entretien. Sois ambitieux, concret et oriente matching ATS/recruteur — un candidat qualifie doit apparaitre comme le candidat IDEAL pour ce poste.
Passe en revue CHAQUE section du CV, dans cet ordre: Titre, Profil, chaque Experience professionnelle (TOUTES, une par une), Competences, Formation, Langues, Certifications, Passions/Centres d'interet.
Retourne une optimisation pour CHAQUE section presente dans le CV. Reformule TOUT, meme ce qui semble deja correct — il y a toujours moyen de mieux coller a l'offre.
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

Regles d'optimisation (mode offensif):
- Integre le MAXIMUM de mots-cles de l'offre, avec la formulation EXACTE de l'offre (les ATS matchent sur les termes exacts). Va au-dela de l'evident: revendique aussi les competences IMPLICITES, ADJACENTES ou DECOULANT logiquement du parcours (ex: Power BI/Tableau/Looker/Qlik = famille datavisualisation/BI; Snowflake/PostgreSQL/BigQuery = famille Data Warehouse/SQL; Python = scripting, automatisation, ETL, data quality). En cas de doute raisonnable, REVENDIQUE plutot que d'omettre.
- Strategie CVize observee a appliquer:
  1) Titre cible: transforme le titre en "Intitule vise | expertise principale & outil/secteur cle" ou "Intitule vise / role adjacent | Expert outil1, outil2 & domaine". Le titre doit contenir les 1-2 outils obligatoires de l'offre quand ils sont centraux.
  2) Profil: 2-3 phrases denses sans parentheses inutiles. Mentionne annees d'experience, secteurs proches de l'offre, outils obligatoires, missions fortes et resultat business. Le profil doit faire croire au recruteur que le CV a ete ecrit pour cette offre.
  3) Experiences: retitre chaque experience vers l'angle de l'offre sans changer employeur/date. Exemples de retitrage: "Data Analyst – BI & Modelisation", "Data Analyst – Gouvernance & Qualite des Donnees", "Data Engineer / Analyst", "Data Analyst – Retail, E-commerce & Supply Chain". Chaque bullet suit le schema "Angle metier : action forte + outil/methode + volume/resultat + impact".
  4) Competences: conserve la structure existante si elle est deja organisee (ex: Expert / Confirme / Formation et projets). Ne cree pas artificiellement ces blocs s'ils n'existent pas dans le CV. Enrichis, reclasses et reformules surtout les mots-cles dans les blocs existants; ajoute seulement des mini-blocs metier utiles (SQL, Python, Gouvernance & Qualite, BI / Datavisualisation) si cela clarifie vraiment le CV.
  5) Formation: ajoute 1-2 lignes par diplome qui rapprochent la formation des besoins de l'offre (architecture data, BI, modelisation, gouvernance, statistiques, cloud, pipelines), sans modifier diplome/ecole/date.
  6) Langues et passions: reformule en capacites utiles au poste (communication metier, autonomie, rigueur, adaptabilite, resolution de problemes).
- Titre: aligne-le sur l'intitule EXACT ou le role le plus proche de l'offre, complete par 2-4 competences cles de l'offre.
- Profil: positionne le candidat comme parfaitement aligne sur les exigences de l'offre, avec les mots-cles majeurs et un niveau de seniorite qui matche l'offre.
- Experiences: reecris chaque contenu en 3 a 5 bullets percutants et ambitieux. Verbes d'action forts (Pilote, Concu, Deploye, Optimise, Anime, Coordonne, Formalise...). Ajoute des indicateurs d'impact PLAUSIBLES et credibles pour le poste occupe quand l'experience implique une echelle mesurable (%, volumes, delais, gains) — reste realiste et defendable en entretien. Reformule les responsabilites vers le vocabulaire et les missions de l'offre. Dans "apres": intitule du poste sur la premiere ligne, puis une ligne par bullet commencant par "• ". Ajuste l'intitule du poste pour le rapprocher de l'offre tant qu'il reste credible pour cette experience.
- Competences: retourne une section riche, organisee et lisible en respectant au maximum la structure de depart. Integre TOUS les mots-cles de l'offre compatibles avec le parcours, y compris les outils/methodes standards du metier que le candidat peut crediblement revendiquer au vu de son experience. Utilise des separateurs " | " entre blocs et " · " dans les listes.
- Formation: pour CHAQUE diplome, retourne "Formation — <intitule exact du diplome>" dont "apres" contient 1-2 lignes orientees offre (domaines, technologies, methodes). Ne modifie jamais l'intitule du diplome, l'ecole ni les dates.
- Langues: transforme chaque niveau en capacite professionnelle utile pour CE poste, une ligne par langue "Langue : niveau — capacite". Garde le niveau reel (B2 reste B2).
- Certifications: reordonne et reformule pour mettre en avant celles pertinentes pour l'offre, une ligne "Nom : apport pour le poste".
- Passions: reformule chaque centre d'interet "Passion : qualite utile au poste", une ligne par passion.
- Pour les acronymes, ecris les deux formes: acronyme + forme complete (ex: "SEO (Search Engine Optimization)").
- Outils absents mais obligatoires dans l'offre: si le CV montre une competence equivalente ou adjacente, integre l'outil exact dans le titre/profil/competences comme competence BI/Data transferable ou environnement cible. Ne dis pas "certifie" ni "expert certifie" si ce n'est pas dans le CV, mais ne laisse pas le mot-cle absent.
- SEULES LIMITES (pour rester defendable en entretien et en verification d'antecedents) : ne fabrique JAMAIS un employeur, un intitule d'ecole, un diplome, une periode/date, ni une certification nommee qui n'existent pas dans le CV. Les noms d'entreprises et les periodes restent EXACTEMENT inchanges. Tout le reste (competences, outils, reformulations, impact quantifie plausible, niveau de seniorite) peut etre pousse au maximum credible.
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

/* ── controle de couverture : detecte les sections du CV structure qui n'ont
      recu AUCUNE optimisation, pour garantir que tout le CV est passe au crible ── */
export interface MissingSection {
  section: string
  original: string
}

const normSec = (s: string) => s.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/\s+/g, ' ').trim()

export function findUncoveredSections(cv: StructuredCv, optimizations: OptimizationResult[]): MissingSection[] {
  const secNames = optimizations.map(opt => normSec(opt.section))
  const hasSection = (predicate: (name: string) => boolean) => secNames.some(predicate)
  const missing: MissingSection[] = []

  if (cv.title && !hasSection(name => name.startsWith('titre') || name.startsWith('title'))) {
    missing.push({ section: 'Titre', original: cv.title })
  }
  if (cv.profile && !hasSection(name => name.startsWith('profil') || name.includes('resume'))) {
    missing.push({ section: 'Profil', original: cv.profile })
  }
  cv.experiences.forEach(exp => {
    if (!exp.title && exp.bullets.length === 0) return
    const company = normSec(exp.company)
    const title = normSec(exp.title)
    const covered = optimizations.some(opt => {
      const hay = `${normSec(opt.section)} ${normSec(opt.avant)}`
      const isExp = hay.includes('experience')
      return isExp && ((company.length > 2 && hay.includes(company)) || (title.length > 3 && normSec(opt.section).includes(title.slice(0, 20))))
    })
    if (!covered) {
      missing.push({
        section: `Experience — ${exp.title} | ${exp.company}`,
        original: `${exp.title}${exp.company ? ` — ${exp.company}` : ''}\n${exp.bullets.map(b => `• ${b}`).join('\n')}`,
      })
    }
  })
  if (cv.skills.length > 0 && !hasSection(name => name.includes('competence') || name.includes('skill'))) {
    missing.push({ section: 'Competences', original: cv.skills.join(' · ') })
  }
  cv.education.forEach(edu => {
    if (!edu.degree) return
    const degree = normSec(edu.degree)
    const covered = optimizations.some(opt => normSec(opt.section).startsWith('formation') && degree.length > 2 && normSec(opt.section).includes(degree.slice(0, 22)))
    if (!covered) {
      missing.push({ section: `Formation — ${edu.degree}`, original: [edu.degree, edu.school, edu.description].filter(Boolean).join(' — ') })
    }
  })
  if (cv.languages.length > 0 && !hasSection(name => name.includes('langue'))) {
    missing.push({ section: 'Langues', original: cv.languages.map(l => `${l.language} : ${l.level}`).join('\n') })
  }
  if (cv.certifications.length > 0 && !hasSection(name => name.includes('certification'))) {
    missing.push({ section: 'Certifications', original: cv.certifications.join('\n') })
  }
  if (cv.interests.length > 0 && !hasSection(name => name.includes('passion') || name.includes('centre'))) {
    missing.push({ section: 'Passions', original: cv.interests.join('\n') })
  }
  return missing
}

/* Passe ciblee : optimise UNIQUEMENT les sections non couvertes, meme regles agressives. */
export async function completeMissingSections(
  cvText: string,
  offerText: string,
  missing: MissingSection[],
  context: OptimizationContext = {},
): Promise<OptimizationResult[]> {
  if (missing.length === 0) return []
  const flat = context.keywords
    ? [...context.keywords.technical, ...context.keywords.softSkills, ...context.keywords.experience].filter(Boolean)
    : []
  const sectionsBlock = missing.map((m, i) => `${i + 1}. section EXACTE a renvoyer = "${m.section}"\nTexte original de la section:\n${m.original}`).join('\n\n')
  const content = await callAI(
    `Tu es un expert CV/ATS agressif. Optimise UNIQUEMENT les sections listees ci-dessous pour coller au maximum a l'offre.
Regles: revendique les competences implicites/adjacentes, integre les mots-cles EXACTS de l'offre, reformulations offensives et impact plausible. Ne fabrique jamais employeur, diplome, ecole, date ni certification nommee inexistants.
Format de sortie par section:
- Titre: intitule aligne sur l'offre + 2-4 competences cles.
- Profil: 2-3 phrases vendeuses.
- Experience: premiere ligne = intitule du poste, puis une ligne par bullet commencant par "• " (3 a 5 bullets).
- Competences: liste separee par " · ".
- Formation: une ligne de description orientee offre.
- Langues: "Langue : niveau — capacite", une par ligne.
- Certifications / Passions: "Nom : apport pour le poste", une par ligne.
IMPORTANT: retourne EXACTEMENT une optimisation par section demandee, avec le champ "section" STRICTEMENT IDENTIQUE a celui fourni.
Retourne uniquement un JSON object valide, sans markdown:
{"optimizations":[{"section":"...","avant":"texte original","apres":"texte optimise"}]}`,
    `CV complet (contexte):\n${cvText.slice(0, 10000)}\n\nOffre:\n${offerText.slice(0, 6000)}\n${flat.length > 0 ? `\nMots-cles cibles: ${flat.join(', ')}\n` : ''}
Sections a optimiser (et UNIQUEMENT celles-ci):\n${sectionsBlock}`,
    { json: true, maxTokens: 5000 },
  )
  try {
    return normalizeOptimizations(optimizationResponseSchema.parse(parseJsonObject(content)).optimizations)
  } catch {
    try {
      return normalizeOptimizations(optimizationSchema.parse(parseJsonArray(content)))
    } catch {
      return []
    }
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
    `Tu es un expert CV/ATS offensif. Des mots-cles de l'offre manquent encore dans le CV optimise.
Integre IMPERATIVEMENT CHACUN de ces mots-cles, avec la formulation EXACTE fournie, dans une version enrichie des sections Titre, Profil et Competences. Revendique ces competences avec assurance des lors qu'elles sont plausibles au vu du parcours — n'omets aucun mot-cle. Ajoute-les aussi dans la liste de competences meme si le lien est indirect mais credible.
Reste defendable en entretien: n'invente pas d'employeur, de diplome ni de date, mais pousse au maximum la revendication de competences et d'outils.
Retourne uniquement un JSON valide, sans markdown:
{"optimizations":[{"section":"Titre","avant":"texte original","apres":"titre cible enrichi"},{"section":"Profil","avant":"texte original","apres":"profil enrichi"},{"section":"Competences","avant":"texte original","apres":"competences enrichies en conservant la structure existante"}]}`,
    `CV:\n${cvText.slice(0, 8000)}\n\nOffre:\n${offerText.slice(0, 5000)}\n\nMots-cles a integrer IMPERATIVEMENT (formulation exacte, AUCUN ne doit rester absent): ${missingKeywords.join(', ')}`,
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
