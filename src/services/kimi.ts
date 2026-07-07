/**
 * Kimi AI Service — Moonshot AI API
 *
 * IMPORTANT: En production, cette cle doit etre stockee cote serveur
 * et jamais exposee dans le frontend. Cette approche est temporaire
 * pour le MVP.
 */

const KIMI_API_KEY = 'sk-8GE7fwPyvA1PLyto7xLxLJoHo8p29B6KSBhq9kpV04wKwVGZ'
const KIMI_BASE_URL = 'https://api.moonshot.cn/v1'
const KIMI_MODEL = 'moonshot-v1-32k'  // 32K context for long CVs + job offers

/* ───────── types ───────── */
export interface KimiResponse {
  choices: Array<{
    message: {
      content: string
    }
  }>
}

export interface OptimizationResult {
  section: string
  avant: string
  apres: string
}

export interface KeywordSet {
  technical: string[]
  softSkills: string[]
  experience: string[]
}

/* ───────── core API call ───────── */
async function callKimi(systemPrompt: string, userPrompt: string): Promise<string> {
  const response = await fetch(`${KIMI_BASE_URL}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${KIMI_API_KEY}`,
    },
    body: JSON.stringify({
      model: KIMI_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 4000,
    }),
  })

  if (!response.ok) {
    const errorText = await response.text()
    throw new Error(`Kimi API error (${response.status}): ${errorText}`)
  }

  const data = (await response.json()) as KimiResponse
  return data.choices[0]?.message?.content || ''
}

/**
 * Extract keywords from a job offer using Kimi AI.
 * Falls back to basic parsing if the API response is not valid JSON.
 */
export async function extractKeywordsFromOffer(offerText: string): Promise<KeywordSet> {
  const systemPrompt = `Tu es un expert en analyse d'offres d'emploi. Extrais les mots-cles et competences d'une offre d'emploi.
Reponds UNIQUEMENT en JSON avec ce format exact:
{
  "technical": ["competence1", "competence2"],
  "softSkills": ["soft1", "soft2"],
  "experience": ["exp1", "exp2"]
}
Ne mets aucun texte avant ou apres le JSON.`

  const content = await callKimi(
    systemPrompt,
    `Analyse cette offre d'emploi et extrais les mots-cles:\n\n${offerText}`
  )

  try {
    // Try to extract JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      return {
        technical: Array.isArray(parsed.technical) ? parsed.technical : [],
        softSkills: Array.isArray(parsed.softSkills) ? parsed.softSkills : [],
        experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      }
    }
  } catch {
    // JSON parsing failed, fall through to manual parsing
  }

  // Fallback: extract keywords manually from the text
  const allKeywords = content
    .split(/[\n,;]/)
    .map((k) => k.trim().replace(/^[-\u2022*]/, '').trim())
    .filter((k) => k.length > 2 && k.length < 50)
    .slice(0, 20)

  return {
    technical: allKeywords.filter((_, i) => i % 3 === 0),
    softSkills: allKeywords.filter((_, i) => i % 3 === 1),
    experience: allKeywords.filter((_, i) => i % 3 === 2),
  }
}

/**
 * Generate CV optimization diffs using Kimi AI.
 * Returns an empty array if parsing fails — caller should handle with mock fallback.
 */
export async function generateOptimizations(
  cvText: string,
  offerText: string
): Promise<OptimizationResult[]> {
  const systemPrompt = `Tu es un expert en redaction de CV et optimisation ATS. Tu aides les candidats a adapter leur CV pour une offre d'emploi specifique.

Pour chaque section du CV, propose une version amelioree qui:
1. Integre les mots-cles de l'offre d'emploi
2. Utilise des verbes d'action percutants
3. Quantifie les resultats quand c'est possible
4. Respecte les normes ATS (texte simple, pas de graphiques)

Reponds UNIQUEMENT en JSON avec ce format exact:
[
  {
    "section": "Nom de la section",
    "avant": "texte original",
    "apres": "texte optimise"
  }
]
Ne mets aucun texte avant ou apres le JSON. Sois concis et professionnel.`

  const content = await callKimi(
    systemPrompt,
    `Voici mon CV:\n\n${cvText}\n\n---\n\nVoici l'offre d'emploi:\n\n${offerText}\n\nPropose des ameliorations section par section.`
  )

  try {
    const jsonMatch = content.match(/\[[\s\S]*\]/)
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0])
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.map((opt: Record<string, unknown>) => ({
          section: String(opt.section || 'Section'),
          avant: String(opt.avant || ''),
          apres: String(opt.apres || ''),
        }))
      }
    }
  } catch {
    // JSON parsing failed
  }

  // Return empty — caller should handle with mock fallback
  return []
}

/**
 * Calculate ATS compatibility score (0-100) using Kimi AI.
 */
export async function calculateATSScore(cvText: string, offerText: string): Promise<number> {
  const systemPrompt = `Tu es un expert en systemes ATS (Applicant Tracking System). Evalue la correspondance entre un CV et une offre d'emploi.
Reponds UNIQUEMENT avec un nombre entre 0 et 100, rien d'autre.`

  const content = await callKimi(
    systemPrompt,
    `CV:\n${cvText}\n\n---\n\nOffre:\n${offerText}\n\nDonne un score de correspondance sur 100.`
  )

  const match = content.match(/\d+/)
  if (match) {
    const score = parseInt(match[0], 10)
    return Math.min(100, Math.max(0, score))
  }
  return 50
}

/**
 * Rewrite a single bullet point for better impact.
 */
export async function rewriteBullet(bullet: string, context: string): Promise<string> {
  const systemPrompt = `Tu es un expert en redaction de CV. Reformule les bullet points pour qu'ils soient percutants, quantifies et orientes resultats.`

  return await callKimi(
    systemPrompt,
    `Contexte: ${context}\n\nBullet point a reformuler:\n${bullet}\n\nPropose une version amelioree, concise et percutante.`
  )
}

/**
 * Generate a professional cover letter.
 */
export async function generateCoverLetter(cvText: string, offerText: string): Promise<string> {
  const systemPrompt = `Tu es un expert en redaction de lettres de motivation. Redige une lettre de motivation professionnelle, personnalisee et percutante.`

  return await callKimi(
    systemPrompt,
    `Mon CV:\n${cvText}\n\n---\n\nL'offre d'emploi:\n${offerText}\n\nRedige une lettre de motivation professionnelle.`
  )
}

/**
 * Translate a CV from French to English.
 * Keeps the same structure and formatting.
 */
export async function translateCVToEnglish(cvText: string): Promise<string> {
  const systemPrompt = `Tu es un expert en traduction de CV professionnels du francais vers l'anglais.
Traduis le CV en conservant EXACTEMENT la meme structure, format et mise en page.
Utilise des termes professionnels anglais standards pour le domaine.
Ne traduis pas les noms propres (noms de personnes, entreprises, ecoles, villes).`

  return await callKimi(
    systemPrompt,
    `Traduis ce CV du francais vers l'anglais:\n\n${cvText}`
  )
}
