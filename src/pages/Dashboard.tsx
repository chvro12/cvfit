import { useState, useEffect, useCallback, useMemo } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { useNavigate, useSearchParams } from 'react-router'
import type { Paragraph as DocxParagraph } from 'docx'
import {
  UploadCloud, FileText, X, Check, ArrowLeft,
  Loader2, Circle, CheckCircle2,
  Download, RotateCcw, Save, Link2, ArrowUp, ArrowDown,
  GripVertical, ChevronDown, Pencil, Minimize2, Undo2, Languages, Library,
} from 'lucide-react'
import { createGeneration, extractKeywordsFromOffer, fetchOfferFromUrl, getGeneration, listDocuments, saveEditorState, translateGenerationToEnglish, uploadCvDocument, type DocumentSummary, type EditorState, type GenerationResult, type StructuredCv, type UploadedDocument } from '../services/kimi'
import { getMe } from '../services/api'

/* ───────── easing ───────── */
const easeSmooth = [0.4, 0, 0.2, 1] as [number, number, number, number]
const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]
const easeSpring = [0.34, 1.56, 0.64, 1] as [number, number, number, number]

/* ───────── types ───────── */
type Step = 1 | 2 | 3 | 4
type Template = 'essentiel' | 'pro' | 'moderne' | 'prestige' | 'chronologique'
type Police = 'Inter' | 'Playfair' | 'Roboto' | 'Open Sans' | 'Lato' | 'Montserrat' | 'Merriweather'
type Densite = 'ultra-compact' | 'compact' | 'normal' | 'aere'
type Interligne = 'serre' | 'normal' | 'espace'
type Marges = 'etroites' | 'normales' | 'larges'
type AccentColor = 'coral' | 'bleu' | 'vert' | 'violet' | 'noir'
type TailleTexte = 10 | 10.5 | 11 | 12 | 13
type DiffStatus = 'pending' | 'approved' | 'rejected' | 'modifying'

interface FitSnapshot {
  cvSections: CVSection[]
  densite: Densite
  interligne: Interligne
  marges: Marges
  tailleTexte: TailleTexte
  sectionSpacing: 'serre' | 'normal' | 'aere'
  onePageMode: boolean
}

interface KeywordSet {
  technical: string[]
  softSkills: string[]
  experience: string[]
}

interface DiffItem {
  id: string
  section: string
  avant: string
  apres: string
  status: DiffStatus
  modifiedText?: string
}

interface CVSection {
  id: string
  type: 'contact' | 'profil' | 'experience' | 'formation' | 'competences' | 'langues' | 'certifications' | 'passions'
  label: string
  visible: boolean
}

interface ContactInfo {
  email?: string
  phone?: string
  location?: string
  linkedin?: string
  portfolio?: string
  links: string[]
}

/* ───────── accent color map ───────── */
const ACCENT_MAP: Record<AccentColor, string> = {
  coral: '#F85A3E',
  bleu: '#3B82F6',
  vert: '#10B981',
  violet: '#8B5CF6',
  noir: '#1A1A1A',
}

const FONT_FAMILY_MAP: Record<Police, string> = {
  Inter: "'Inter', sans-serif",
  Playfair: "'Playfair Display', serif",
  Roboto: "'Roboto', sans-serif",
  'Open Sans': "'Open Sans', sans-serif",
  Lato: "'Lato', sans-serif",
  Montserrat: "'Montserrat', sans-serif",
  Merriweather: "'Merriweather', serif",
}

const ANALYSIS_STEPS = [
  {
    title: "Lecture de l'offre",
    detail: 'Identification du poste, des missions, des outils et des mots-clés ATS.',
  },
  {
    title: 'Parcours du CV',
    detail: 'Extraction du profil, des expériences, des compétences, formations et liens.',
  },
  {
    title: 'Correspondance offre / CV',
    detail: 'Comparaison des exigences avec les preuves présentes dans votre parcours.',
  },
  {
    title: 'Réécriture ciblée',
    detail: 'Adaptation des textes, du titre, du profil, des expériences et compétences.',
  },
  {
    title: 'Score ATS et finalisation',
    detail: 'Calcul avant / après et préparation du CV optimisé.',
  },
]

const wait = (ms: number) => new Promise(resolve => window.setTimeout(resolve, ms))

/* ───────── helpers ───────── */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 octets'
  const k = 1024
  const sizes = ['octets', 'Ko', 'Mo']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function ensureHttps(link: string) {
  const cleaned = link.trim().replace(/[.,;:]+$/, '')
  if (/^https?:\/\//i.test(cleaned)) return cleaned
  if (/^www\./i.test(cleaned)) return `https://${cleaned}`
  return `https://${cleaned}`
}

function normalizeContactLink(link: string) {
  return link
    .trim()
    .replace(/^(linkedin|portfolio|site|github|behance|dribbble)\s*[:\-–]\s*/i, '')
    .replace(/[.,;:]+$/, '')
}

function isValidContactLink(link: string) {
  return /^(https?:\/\/|www\.)/i.test(link) || /(?:[a-z0-9-]+\.)+[a-z]{2,}(?:\/\S*)?$/i.test(link)
}

function getContactLinkLabel(link: string) {
  const cleaned = normalizeContactLink(link)
  if (/linkedin\.com/i.test(cleaned)) return 'LinkedIn'
  if (/github\.com/i.test(cleaned)) return 'GitHub'
  if (/behance\.net/i.test(cleaned)) return 'Behance'
  if (/dribbble\.com/i.test(cleaned)) return 'Dribbble'
  return 'Portfolio'
}

function parseCvContactInfo(text: string): ContactInfo {
  const email = text.match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i)?.[0]
  const phone = text.match(/(?:\+?\d[\d\s().-]{7,}\d)/)?.[0]?.trim()
  const rawLinks = text.match(/(?:https?:\/\/|www\.)[^\s<>)]+|(?:linkedin\.com|github\.com|behance\.net|dribbble\.com|[a-z0-9-]+\.[a-z]{2,})(?:\/[^\s<>)]+)?/gi) ?? []
  const links = Array.from(new Set(
    rawLinks
      .map(link => link.replace(/[.,;:]+$/, ''))
      .filter(link => !email || !link.includes(email.split('@')[1])),
  ))
  const linkedin = links.find(link => /linkedin\.com/i.test(link))
  const portfolio = links.find(link => !/linkedin\.com/i.test(link))
  const cityLine = text
    .split('\n')
    .map(line => line.trim())
    .find(line => /\b(France|Paris|Lyon|Marseille|Dakar|Senegal|Sénégal|Remote|Télétravail)\b/i.test(line) && line.length <= 80)

  return { email, phone, location: cityLine, linkedin, portfolio, links }
}

/* Decoupe une ligne "Label : texte" (ou "Label — texte") pour afficher
   le label en gras et le texte sur la meme ligne. */
function splitLabelLine(line: string): { label: string; rest: string } | null {
  const cleaned = line.replace(/^[•\-–\s]+/, '').trim()
  const match = cleaned.match(/^(.{1,42}?)\s*[:—]\s+(.+)$/)
  if (!match) return null
  return { label: match[1].trim(), rest: match[2].trim() }
}

function getAtsColor(value: number) {
  if (value < 55) return '#EF4444'
  if (value < 78) return '#F59E0B'
  return '#10B981'
}

function getAtsLabel(value: number) {
  if (value < 55) return 'A corriger'
  if (value < 78) return 'Solide'
  if (value < 92) return 'Tres bon'
  return 'Excellent'
}

/* ───────── ATS gauge component ───────── */
function AtsGauge({ value, label }: { value: number; label: string; isAfter?: boolean }) {
  const radius = 36
  const strokeWidth = 8
  const circumference = Math.PI * radius
  const safeValue = Math.max(0, Math.min(100, value))
  const color = getAtsColor(safeValue)
  const strokeDashoffset = circumference - (safeValue / 100) * circumference
  const angle = Math.PI - (safeValue / 100) * Math.PI
  const dotX = 48 + radius * Math.cos(angle)
  const dotY = 48 - radius * Math.sin(angle)

  return (
    <div className="flex flex-col items-center" style={{ width: 96 }}>
      <div className="relative" style={{ width: 96, height: 58 }}>
        <svg width="96" height="58" viewBox="0 0 96 58" className="overflow-visible">
          <defs>
            <linearGradient id={`ats-grad-${label}`} x1="12" y1="48" x2="84" y2="48" gradientUnits="userSpaceOnUse">
              <stop offset="0%" stopColor="#EF4444" />
              <stop offset="48%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
          </defs>
          <path
            d={`M 12 48 A ${radius} ${radius} 0 0 1 84 48`}
            fill="none"
            stroke="#E5E7EB"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          <path
            d={`M 12 48 A ${radius} ${radius} 0 0 1 84 48`}
            fill="none"
            stroke={`url(#ats-grad-${label})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
          <circle cx={dotX} cy={dotY} r="5.5" fill="white" stroke={color} strokeWidth="3" />
        </svg>
        <div className="absolute left-0 right-0 top-[20px] flex items-center justify-center">
          <span className="text-[22px] font-bold leading-none" style={{ color }}>{safeValue}</span>
        </div>
      </div>
      <span className="text-[13px] font-extrabold uppercase tracking-[0.08em] leading-none" style={{ color: '#64748B' }}>{label}</span>
      <span className="sr-only">{getAtsLabel(safeValue)}</span>
    </div>
  )
}

/* ───────── mini CV template thumbnail : vrai CV miniature ───────── */
const THUMB_SAMPLE = {
  name: 'Hugo Manson',
  title: 'Analyste Financier Corporate',
  contact: 'hugo.manson@mail.com  \u00b7  06 12 34 56 78  \u00b7  Paris',
  profile: "5 ans d'exp\u00e9rience en analyse financi\u00e8re, pilotage de la performance et reporting aupr\u00e8s de directions g\u00e9n\u00e9rales.",
  experiences: [
    {
      title: 'Analyste Financier Senior',
      company: 'Deloitte \u2014 Paris',
      period: '2021 \u2013 2024',
      bullets: [
        'Automatisation du reporting mensuel, d\u00e9lai r\u00e9duit de 40%',
        'Mod\u00e8les de pr\u00e9visions budg\u00e9taires sur 3 business units',
        'Analyses de rentabilit\u00e9 pr\u00e9sent\u00e9es au COMEX',
      ],
    },
    {
      title: 'Analyste Corporate Finance',
      company: 'BNP Paribas \u2014 Paris',
      period: '2019 \u2013 2021',
      bullets: [
        'Due diligence financi\u00e8re sur 12 op\u00e9rations M&A',
        'Valorisations DCF et multiples comparables',
      ],
    },
  ],
  skills: 'Excel \u00b7 SQL \u00b7 Power BI \u00b7 SAP \u00b7 Mod\u00e9lisation financi\u00e8re \u00b7 Anglais courant',
  education: { degree: 'Master Finance \u2014 emlyon', period: '2019' },
}

function TemplateThumb({ id, accent }: { id: Template; accent: string }) {
  const acc = id === 'essentiel' ? '#3F3D39' : accent
  const centered = id !== 'moderne' && id !== 'chronologique'
  const chrono = id === 'chronologique'
  const serif = id === 'prestige'
  const fontFamily = serif ? "'Playfair Display', Georgia, serif" : "'Inter', sans-serif"

  const sectionTitleStyle: React.CSSProperties = {
    fontSize: 6,
    fontWeight: 700,
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    color: '#1A1A1A',
    marginBottom: 3,
    ...(id === 'moderne'
      ? { borderLeft: `2px solid ${acc}`, paddingLeft: 4 }
      : id === 'essentiel'
        ? { borderBottom: '0.5px solid #C9C7C0', paddingBottom: 1.5 }
        : id === 'prestige'
          ? { borderBottom: `2px double ${acc}`, textAlign: 'center' as const, paddingBottom: 1.5 }
          : { borderBottom: `1px solid ${acc}`, paddingBottom: 1.5 }),
  }

  return (
    <div className="bg-white" style={{ width: 128, height: 176, overflow: 'hidden', position: 'relative' }}>
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: 210,
          height: 289,
          transform: 'scale(0.61)',
          transformOrigin: 'top left',
          padding: '10px 11px',
          fontFamily,
          color: '#1A1A1A',
          lineHeight: 1.35,
        }}
      >
        {/* header */}
        <div
          style={{
            textAlign: centered ? 'center' : 'left',
            marginBottom: 7,
            ...(id === 'moderne' ? { borderBottom: `2px solid ${acc}`, paddingBottom: 5 }
              : id === 'prestige' ? { borderBottom: `2px double ${acc}`, paddingBottom: 5 }
                : id === 'essentiel' ? { borderBottom: '0.5px solid #C9C7C0', paddingBottom: 5 }
                  : id === 'chronologique' ? { borderBottom: `1.5px solid ${acc}`, paddingBottom: 5 }
                    : {}),
          }}
        >
          <div
            style={{
              fontSize: id === 'moderne' ? 12 : 11,
              fontWeight: 700,
              letterSpacing: id === 'prestige' ? '0.1em' : '-0.01em',
              textTransform: id === 'prestige' ? 'uppercase' : undefined,
              color: '#111',
            }}
          >
            {THUMB_SAMPLE.name}
          </div>
          <div style={{ fontSize: 6.5, fontWeight: 600, color: id === 'essentiel' ? '#555' : acc, marginTop: 1 }}>{THUMB_SAMPLE.title}</div>
          <div style={{ fontSize: 5, color: '#777', marginTop: 1.5 }}>{THUMB_SAMPLE.contact}</div>
        </div>

        {/* profil */}
        <div style={{ marginBottom: 6 }}>
          <div style={sectionTitleStyle}>Profil</div>
          <p style={{ fontSize: 5.2, color: '#444', margin: 0 }}>{THUMB_SAMPLE.profile}</p>
        </div>

        {/* experiences */}
        <div style={{ marginBottom: 6 }}>
          <div style={sectionTitleStyle}>Expérience professionnelle</div>
          {THUMB_SAMPLE.experiences.map((exp, i) => (
            <div key={i} style={{ marginBottom: 4 }}>
              <div style={{ display: 'flex', gap: 3, alignItems: 'baseline', justifyContent: chrono ? 'flex-start' : 'space-between' }}>
                {chrono && <span style={{ fontSize: 4.8, color: acc, fontWeight: 600, minWidth: 26, flexShrink: 0 }}>{exp.period}</span>}
                <span style={{ fontSize: 5.8, fontWeight: 700, color: '#111' }}>{exp.title}</span>
                {!chrono && <span style={{ fontSize: 4.8, color: '#888', flexShrink: 0 }}>{exp.period}</span>}
              </div>
              <div style={{ fontSize: 5, fontWeight: 600, color: '#555', marginBottom: 1, marginLeft: chrono ? 29 : 0 }}>{exp.company}</div>
              <ul style={{ margin: 0, paddingLeft: chrono ? 32 : 6, listStyle: 'none' }}>
                {exp.bullets.map((bullet, bi) => (
                  <li key={bi} style={{ fontSize: 5, color: '#444', position: 'relative', paddingLeft: 5, marginBottom: 0.5 }}>
                    <span style={{ position: 'absolute', left: 0, color: acc }}>•</span>
                    {bullet}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* competences */}
        <div style={{ marginBottom: 6 }}>
          <div style={sectionTitleStyle}>Compétences</div>
          <p style={{ fontSize: 5.2, color: '#444', margin: 0 }}>{THUMB_SAMPLE.skills}</p>
        </div>

        {/* formation */}
        <div>
          <div style={sectionTitleStyle}>Formation</div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
            <span style={{ fontSize: 5.5, fontWeight: 700, color: '#111' }}>{THUMB_SAMPLE.education.degree}</span>
            <span style={{ fontSize: 4.8, color: '#888' }}>{THUMB_SAMPLE.education.period}</span>
          </div>
        </div>
      </div>
    </div>
  )
}

/* ───────── mini page density thumbnail ───────── */
function DensiteThumb({ lines, active, accent }: { lines: number; active: boolean; accent: string }) {
  return (
    <div
      className="rounded-[4px] border bg-white flex flex-col px-1.5 py-1.5"
      style={{ width: 42, height: 56, borderColor: active ? accent : '#E5E5E0', gap: lines >= 7 ? 2 : lines >= 5 ? 3.5 : 6 }}
    >
      <div style={{ height: 3, width: '65%', borderRadius: 1, background: active ? accent : '#B8B6AF' }} />
      {Array.from({ length: lines }).map((_, i) => (
        <div
          key={i}
          style={{
            height: 2,
            borderRadius: 1,
            background: active ? `${accent}99` : '#DDDBD4',
            width: i % 3 === 2 ? '72%' : '100%',
          }}
        />
      ))}
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════
   Dashboard Page
   ═════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  const navigate = useNavigate()

  /* ── step state ── */
  const [currentStep, setCurrentStep] = useState<Step>(1)

  /* ── step 1: CV ── */
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)
  const [savedDocuments, setSavedDocuments] = useState<DocumentSummary[]>([])
  const [selectedDocumentId, setSelectedDocumentId] = useState<string | null>(null)
  const [isLoadingDocuments, setIsLoadingDocuments] = useState(false)

  /* ── step 2: job offer ── */
  const [jobOffer, setJobOffer] = useState('')
  const [keywords, setKeywords] = useState<KeywordSet>({ technical: [], softSkills: [], experience: [] })
  const [showKeywords, setShowKeywords] = useState(false)
  const [isExtractingKeywords, setIsExtractingKeywords] = useState(false)

  /* ── step 2b: personnalisation (avant generation) ── */
  const [experienceLevel, setExperienceLevel] = useState<string>('confirme')
  const [situation, setSituation] = useState<string>('recherche_active')

  /* ── liens editables (LinkedIn / Portfolio / GitHub / perso) ── */
  const [links, setLinks] = useState<Array<{ id: string; label: string; url: string }> | null>(null)

  /* ── step 3: revue section par section ── */
  const [reviewSection, setReviewSection] = useState(0)

  /* ── step 3: AI diff review ── */
  const [diffItems, setDiffItems] = useState<DiffItem[]>([])
  const [isProcessingDiffs, setIsProcessingDiffs] = useState(false)
  const [processingSubStep, setProcessingSubStep] = useState(-1)
  const [optimizationError, setOptimizationError] = useState<string | null>(null)

  /* ── step 4: CV editor ── */
  const [cvSections, setCvSections] = useState<CVSection[]>([
    { id: 'contact', type: 'contact', label: 'Informations personnelles', visible: true },
    { id: 'profil', type: 'profil', label: 'Profil', visible: true },
    { id: 'experience', type: 'experience', label: 'Expérience professionnelle', visible: true },
    { id: 'competences', type: 'competences', label: 'Compétences', visible: true },
    { id: 'formation', type: 'formation', label: 'Formation', visible: true },
    { id: 'langues', type: 'langues', label: 'Langues', visible: true },
    { id: 'certifications', type: 'certifications', label: 'Certifications', visible: true },
    { id: 'passions', type: 'passions', label: 'Centres d\'intérêt', visible: true },
  ])
  const [template, setTemplate] = useState<Template>('pro')
  const [police, setPolice] = useState<Police>('Inter')
  const [densite, setDensite] = useState<Densite>('normal')
  const [interligne, setInterligne] = useState<Interligne>('normal')
  const [marges, setMarges] = useState<Marges>('normales')
  const [accentColor, setAccentColor] = useState<AccentColor>('noir')
  const [tailleTexte, setTailleTexte] = useState<TailleTexte>(12)
  const [photoPosition, setPhotoPosition] = useState<'none' | 'left' | 'center' | 'right'>('none')
  const [photoSize, setPhotoSize] = useState<'s' | 'm' | 'l'>('m')
  const [photoShape, setPhotoShape] = useState<'ronde' | 'carree'>('ronde')
  const [sectionSpacing, setSectionSpacing] = useState<'serre' | 'normal' | 'aere'>('normal')
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [cvName, setCvName] = useState('Mon CV')
  const [isRenaming, setIsRenaming] = useState(false)
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null)
  const [atsScore, setAtsScore] = useState<number | null>(null)
  const [atsScoreBefore, setAtsScoreBefore] = useState<number | null>(null)
  const [previewPageCount, setPreviewPageCount] = useState(1)
  const [pageHeightPx, setPageHeightPx] = useState(0)
  const [cvContact, setCvContact] = useState<ContactInfo | null>(null)
  const [cvData, setCvData] = useState<StructuredCv | null>(null)
  const [activeGenerationId, setActiveGenerationId] = useState<string | null>(null)
  const [isTranslatingEn, setIsTranslatingEn] = useState(false)
  const [isFitting, setIsFitting] = useState(false)
  const [hasAutoFit, setHasAutoFit] = useState(false)
  const [onePageMode, setOnePageMode] = useState(false)
  const [fitSnapshot, setFitSnapshot] = useState<FitSnapshot | null>(null)

  /* ── editions manuelles du canvas (persistees via Enregistrer) ── */
  const [edits, setEdits] = useState<Record<string, string>>({})
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle')
  const [experienceOrder, setExperienceOrder] = useState<number[] | null>(null)

  /* ── import d'offre par URL (etape 2) ── */
  const [offerUrl, setOfferUrl] = useState('')
  const [isFetchingOffer, setIsFetchingOffer] = useState(false)

  /* ── direction for slide animation ── */
  const [direction, setDirection] = useState(1)

  /* ── derived ── */
  const selectedDocument = savedDocuments.find(document => document.id === selectedDocumentId) ?? null
  const savedDocumentOptions = useMemo(() => {
    if (savedDocuments.length <= 1) return savedDocuments
    const original = savedDocuments[savedDocuments.length - 1]
    const others = savedDocuments.filter(document => document.id !== original.id)
    return [original, ...others]
  }, [savedDocuments])
  const canContinueStep1 = cvFile !== null || selectedDocumentId !== null
  const canContinueStep2 = jobOffer.trim().length >= 50
  const allDiffsReviewed = diffItems.every(d => d.status === 'approved' || d.status === 'rejected')

  /* ── unsaved-changes guard ── */
  useEffect(() => {
    getMe().catch(() => navigate('/connexion'))
  }, [navigate])

  useEffect(() => {
    let cancelled = false
    setIsLoadingDocuments(true)
    listDocuments()
      .then((documents) => {
        if (cancelled) return
        setSavedDocuments(documents)
        if (!cvFile && !selectedDocumentId && documents.length > 0) {
          setSelectedDocumentId(documents[documents.length - 1].id)
        }
      })
      .catch(() => {
        if (!cancelled) setSavedDocuments([])
      })
      .finally(() => {
        if (!cancelled) setIsLoadingDocuments(false)
      })
    return () => { cancelled = true }
  }, [cvFile, selectedDocumentId])

  /* ── application d'un resultat de generation (live ou rouvert) ── */
  const applyGenerationResult = useCallback((generation: GenerationResult) => {
    setActiveGenerationId(generation.id)
    if (generation.keywords) setKeywords(generation.keywords)
    const optimizations = generation.optimizations ?? []
    setDiffItems(optimizations.map((opt, i) => ({
      id: `diff-${i}`,
      section: opt.section,
      avant: opt.avant,
      apres: opt.apres,
      status: 'pending' as DiffStatus,
    })))
    setReviewSection(0)
    if (generation.structuredCv) {
      const structured = generation.structuredCv
      const hasDiffFor = (pattern: RegExp) => optimizations.some(opt => pattern.test(opt.section))
      setCvData(structured)
      setCvName(structured.title || structured.fullName || 'Mon CV')
      setCvSections(prev => prev.map(s => {
        if (s.id === 'langues') return { ...s, visible: structured.languages.length > 0 || hasDiffFor(/langue/i) }
        if (s.id === 'certifications') return { ...s, visible: structured.certifications.length > 0 || hasDiffFor(/certification/i) }
        if (s.id === 'passions') return { ...s, visible: (structured.interests ?? []).length > 0 || hasDiffFor(/passion|centre/i) }
        if (s.id === 'profil') return { ...s, visible: structured.profile.length > 0 || hasDiffFor(/profil/i) }
        return s
      }))
      /* liens editables initialises depuis le CV structure (+ regex de secours) */
      const seedLinks: Array<{ id: string; label: string; url: string }> = []
      const seen = new Set<string>()
      const pushLink = (label: string, raw: string) => {
        const url = normalizeContactLink(raw.trim())
        if (!url || !isValidContactLink(url) || seen.has(url.toLowerCase())) return
        seen.add(url.toLowerCase())
        seedLinks.push({ id: `link-${seedLinks.length}`, label, url })
      }
      if (structured.contact.linkedin) pushLink('LinkedIn', structured.contact.linkedin)
      if (structured.contact.portfolio) pushLink('Portfolio', structured.contact.portfolio)
      for (const raw of cvContact?.links ?? []) {
        pushLink(/linkedin/i.test(raw) ? 'LinkedIn' : /github/i.test(raw) ? 'GitHub' : 'Lien', raw)
      }
      setLinks(seedLinks)
    }
    setAtsScore(typeof generation.atsScore === 'number' ? generation.atsScore : null)
    setAtsScoreBefore(typeof generation.atsScoreBefore === 'number' ? generation.atsScoreBefore : null)
  }, [cvContact])

  /* ── reprise d'une generation depuis Mon espace (?generation=ID) ── */
  const [searchParams] = useSearchParams()
  useEffect(() => {
    const generationId = searchParams.get('generation')
    if (!generationId) return
    let cancelled = false
    ;(async () => {
      try {
        const generation = await getGeneration(generationId)
        if (cancelled || generation.status !== 'COMPLETED') return
        if (generation.document.extractedText) {
          setCvContact(parseCvContactInfo(generation.document.extractedText))
        }
        setJobOffer(generation.jobOffer)
        applyGenerationResult(generation)

        /* etat d'edition sauvegarde → restaure tout et retourne dans l'editeur */
        const saved = generation.editorState
        if (saved && typeof saved === 'object') {
          if (saved.edits) setEdits(saved.edits)
          if (saved.cvName) setCvName(saved.cvName)
          if (saved.template) setTemplate(saved.template as Template)
          if (saved.police) setPolice(saved.police as Police)
          if (saved.densite) setDensite(saved.densite as Densite)
          if (saved.interligne) setInterligne(saved.interligne as Interligne)
          if (saved.marges) setMarges(saved.marges as Marges)
          if (saved.accentColor) setAccentColor(saved.accentColor as AccentColor)
          if (saved.tailleTexte) setTailleTexte(saved.tailleTexte as TailleTexte)
          if (saved.sectionSpacing) setSectionSpacing(saved.sectionSpacing as 'serre' | 'normal' | 'aere')
          if (saved.photoPosition) setPhotoPosition(saved.photoPosition as 'none' | 'left' | 'center' | 'right')
          if (saved.photoSize) setPhotoSize(saved.photoSize as 's' | 'm' | 'l')
          if (saved.photoShape) setPhotoShape(saved.photoShape as 'ronde' | 'carree')
          if (Array.isArray(saved.sections) && saved.sections.length > 0) {
            setCvSections(saved.sections as CVSection[])
          }
          if (Array.isArray(saved.experienceOrder) && saved.experienceOrder.length > 0) {
            setExperienceOrder(saved.experienceOrder)
          }
          if (Array.isArray(saved.diffs)) {
            setDiffItems(prev => prev.map((diff, i) => saved.diffs[i]
              ? { ...diff, status: saved.diffs[i].status as DiffStatus, modifiedText: saved.diffs[i].modifiedText }
              : diff))
          }
          setHasAutoFit(true)
          setDirection(1)
          setCurrentStep(4)
          return
        }

        setDirection(1)
        setCurrentStep(3)
      } catch (err) {
        if (!cancelled) {
          setOptimizationError(err instanceof Error ? err.message : 'Chargement de la generation impossible.')
        }
      }
    })()
    return () => { cancelled = true }
  }, [searchParams, applyGenerationResult])

  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (cvFile || selectedDocumentId || jobOffer) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [cvFile, selectedDocumentId, jobOffer])

  /* ═══════ Step 1: Upload CV ═══════ */
  const onDropCv = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setCvFile(file)
      setSelectedDocumentId(null)
      setCvContact(null)
      setCvData(null)
      setActiveGenerationId(null)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropCv,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  })

  const onDropPhoto = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setPhotoFile(file)
      setPhotoPreviewUrl(prev => {
        if (prev) URL.revokeObjectURL(prev)
        return URL.createObjectURL(file)
      })
    }
  }, [])

  const { getRootProps: getPhotoRootProps, getInputProps: getPhotoInputProps } = useDropzone({
    onDrop: onDropPhoto,
    accept: { 'image/jpeg': ['.jpg', '.jpeg'], 'image/png': ['.png'] },
    maxSize: 5 * 1024 * 1024,
    multiple: false,
  })

  /* ═══════ Step 2: Job offer ═══════ */
  const handleJobOfferChange = (value: string) => {
    setJobOffer(value)
    setShowKeywords(false)
    setOptimizationError(null)
  }

  const extractKeywords = async () => {
    if (jobOffer.trim().length < 50) return
    setIsExtractingKeywords(true)
    try {
      const result = await extractKeywordsFromOffer(jobOffer)
      setKeywords(result)
      setShowKeywords(true)
    } catch (err) {
      console.error('Keyword extraction failed:', err)
      setOptimizationError(err instanceof Error ? err.message : 'Extraction des mots-clés impossible.')
      setShowKeywords(false)
    } finally {
      setIsExtractingKeywords(false)
    }
  }

  /* ═══════ Step 3: AI Diff (OpenAI) ═══════ */
  const startOptimization = async () => {
    if (!cvFile && !selectedDocumentId) return
    setIsProcessingDiffs(true)
    setProcessingSubStep(0)
    setOptimizationError(null)
    goToStep(3, 1)
    let completed = false

    try {
      setProcessingSubStep(0)
      let document: Pick<UploadedDocument, 'id' | 'extractedText'> | null = null
      if (selectedDocumentId) {
        document = { id: selectedDocumentId, extractedText: null }
      } else if (cvFile) {
        document = await uploadCvDocument(cvFile, photoFile)
      }
      if (!document) throw new Error('Aucun CV sélectionné.')
      if (document.extractedText) {
        setCvContact(parseCvContactInfo(document.extractedText))
      }

      setProcessingSubStep(1)
      await wait(350)
      setProcessingSubStep(2)
      const generation = await createGeneration(document.id, jobOffer, { experienceLevel, situation })

      setProcessingSubStep(3)
      if ((generation.optimizations ?? []).length === 0) {
        throw new Error("L'IA n'a propose aucune optimisation pour ce CV. Reessayez ou modifiez l'offre.")
      }
      applyGenerationResult(generation)

      setProcessingSubStep(4)
      await wait(350)
      setProcessingSubStep(5)
      await wait(250)
      completed = true

    } catch (err) {
      console.error('Optimization failed:', err)
      setOptimizationError(err instanceof Error ? err.message : 'Optimisation IA impossible.')
    } finally {
      setIsProcessingDiffs(false)
      if (!completed) setProcessingSubStep(-1)
    }
  }

  const translatePreviewToEnglish = async () => {
    if (!activeGenerationId || isTranslatingEn) return
    setIsTranslatingEn(true)
    setOptimizationError(null)
    try {
      const translated = await translateGenerationToEnglish(activeGenerationId)
      setCvData(translated.structuredCv)
      setDiffItems(translated.optimizations.map((opt, i) => ({
        id: `diff-en-${i}`,
        section: opt.section,
        avant: opt.avant,
        apres: opt.apres,
        status: 'approved' as DiffStatus,
      })))
      setCvName(translated.structuredCv.title || translated.structuredCv.fullName || 'My resume')
    } catch (err) {
      setOptimizationError(err instanceof Error ? err.message : 'Traduction en anglais impossible.')
    } finally {
      setIsTranslatingEn(false)
    }
  }

  const setDiffStatus = (id: string, status: DiffStatus) => {
    setDiffItems(prev => prev.map(d => d.id === id ? { ...d, status } : d))
  }

  const saveModifiedText = (id: string, text: string) => {
    setDiffItems(prev => prev.map(d => d.id === id ? { ...d, modifiedText: text, status: 'approved' as DiffStatus } : d))
  }

  /* ═══════ Step 4: CV Editor ═══════ */
  const toggleSectionVisibility = (id: string) => {
    setCvSections(prev => prev.map(s => s.id === id ? { ...s, visible: !s.visible } : s))
  }

  const handleDragStart = (e: React.DragEvent, sectionId: string) => {
    setDraggedSectionId(sectionId)
    e.dataTransfer.effectAllowed = 'move'
  }

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (!draggedSectionId || draggedSectionId === targetId) return
    setCvSections(prev => {
      const draggedIdx = prev.findIndex(s => s.id === draggedSectionId)
      const targetIdx = prev.findIndex(s => s.id === targetId)
      if (draggedIdx === -1 || targetIdx === -1) return prev
      const newSections = [...prev]
      const [removed] = newSections.splice(draggedIdx, 1)
      newSections.splice(targetIdx, 0, removed)
      return newSections
    })
    setDraggedSectionId(null)
  }

  const getCvSlug = () => {
    return (cvData?.fullName || cvName || 'mon-cv')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '') || 'mon-cv'
  }

  const measurePageCount = () => {
    const el = document.getElementById('cv-canvas')
    if (!el) return 1
    const rect = el.getBoundingClientRect()
    if (!rect.width) return 1
    const pageH = (rect.width / 210) * 297
    return Math.max(1, Math.ceil(el.scrollHeight / pageH))
  }

  /* Ajustement automatique sur 1 page : resserre progressivement
     jusqu'a ce que le contenu tienne. */
  const fitToOnePage = async () => {
    if (!fitSnapshot) {
      setFitSnapshot({
        cvSections,
        densite,
        interligne,
        marges,
        tailleTexte,
        sectionSpacing,
        onePageMode,
      })
    }
    setIsFitting(true)
    setOnePageMode(false)
    const steps: Array<() => void> = [
      () => setSectionSpacing('serre'),
      () => setInterligne('serre'),
      () => setMarges('etroites'),
      () => { setTailleTexte(11); setDensite('compact') },
      () => setOnePageMode(true),
    ]
    for (const applyStep of steps) {
      applyStep()
      await wait(200)
      if (measurePageCount() <= 1) break
    }
    setIsFitting(false)
  }

  const undoFitToOnePage = () => {
    if (!fitSnapshot) return
    setCvSections(fitSnapshot.cvSections)
    setDensite(fitSnapshot.densite)
    setInterligne(fitSnapshot.interligne)
    setMarges(fitSnapshot.marges)
    setTailleTexte(fitSnapshot.tailleTexte)
    setSectionSpacing(fitSnapshot.sectionSpacing)
    setOnePageMode(fitSnapshot.onePageMode)
    setFitSnapshot(null)
  }

  /* Objectif 1 page : ajustement automatique a la premiere arrivee dans l'editeur. */
  useEffect(() => {
    if (currentStep !== 4 || hasAutoFit) return
    setHasAutoFit(true)
    const timeout = window.setTimeout(() => {
      if (measurePageCount() > 1) fitToOnePage()
    }, 250)
    return () => window.clearTimeout(timeout)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentStep, hasAutoFit])

  /* Export DOCX : construit un vrai document Word depuis le DOM du canvas
     (conserve les editions contentEditable), texte reel lisible par les ATS. */
  const handleDownloadDocx = async () => {
    const el = document.getElementById('cv-canvas')
    if (!el) return

    const { Document, Packer, Paragraph, TextRun, BorderStyle, ImageRun } = await import('docx')
    const accent = activeAccentHex.replace('#', '').toUpperCase()
    const clean = (t: string) => t.replace(/\s+/g, ' ').trim()
    const children: DocxParagraph[] = []

    /* photo de profil en tete du document */
    if (photoPreviewUrl && photoPosition !== 'none') {
      try {
        const blob = await fetch(photoPreviewUrl).then(r => r.blob())
        const data = await blob.arrayBuffer()
        children.push(new Paragraph({
          children: [new ImageRun({
            data,
            transformation: { width: 96, height: 96 },
            type: blob.type === 'image/png' ? 'png' : 'jpg',
          })],
          spacing: { after: 120 },
        }))
      } catch {
        /* photo indisponible : on continue sans */
      }
    }

    const nodes = el.querySelectorAll<HTMLElement>('[data-pdf]')
    nodes.forEach(node => {
      const kind = node.dataset.pdf
      const raw = node.innerText ?? node.textContent ?? ''
      switch (kind) {
        case 'name':
          children.push(new Paragraph({
            children: [new TextRun({ text: clean(raw), bold: true, size: 40, color: '111111' })],
            spacing: { after: 60 },
          }))
          break
        case 'title':
          children.push(new Paragraph({
            children: [new TextRun({ text: clean(raw), bold: true, size: 23, color: accent })],
            spacing: { after: 120 },
          }))
          break
        case 'contact': {
          const contactParts = Array.from(node.children)
            .map(child => (child.textContent ?? '').replace(/\s+/g, ' ').replace(/^[|\s]+/, '').trim())
            .filter(Boolean)
          const contactSeparator = node.querySelector('a') !== null ? '  ·  ' : '  |  '
          children.push(new Paragraph({
            children: [new TextRun({ text: contactParts.length > 0 ? contactParts.join(contactSeparator) : clean(raw), size: 17, color: '666666' })],
            spacing: { after: 60 },
          }))
          break
        }
        case 'section':
          children.push(new Paragraph({
            children: [new TextRun({ text: clean(raw).toUpperCase(), bold: true, size: 21, color: '1A1A1A' })],
            spacing: { before: 220, after: 110 },
            border: { bottom: { style: BorderStyle.SINGLE, size: 8, color: accent, space: 2 } },
          }))
          break
        case 'row': {
          const titleText = clean(node.querySelector<HTMLElement>('[data-row-part="title"]')?.innerText ?? '')
          const periodText = clean(node.querySelector<HTMLElement>('[data-row-part="period"]')?.innerText ?? '')
          children.push(new Paragraph({
            children: [
              new TextRun({ text: titleText, bold: true, size: 20, color: '111111' }),
              ...(periodText ? [new TextRun({ text: `   ${periodText}`, size: 17, color: '888888' })] : []),
            ],
            spacing: { after: 40 },
          }))
          break
        }
        case 'heading':
          children.push(new Paragraph({
            children: [new TextRun({ text: clean(raw), bold: true, size: 20, color: '111111' })],
            spacing: { after: 40 },
          }))
          break
        case 'sub':
          children.push(new Paragraph({
            children: [new TextRun({ text: clean(raw), size: 18, color: '555555' })],
            spacing: { after: 60 },
          }))
          break
        case 'bullet':
          children.push(new Paragraph({
            children: [new TextRun({ text: clean(raw).replace(/^[•\-\s]+/, ''), size: 18, color: '444444' })],
            bullet: { level: 0 },
            spacing: { after: 40 },
          }))
          break
        case 'pair': {
          const parts = Array.from(node.children)
            .map(child => (child.textContent ?? '').trim())
            .filter(Boolean)
          children.push(new Paragraph({
            children: [new TextRun({ text: parts.join(' — '), size: 18, color: '444444' })],
            spacing: { after: 50 },
          }))
          break
        }
        case 'para':
        default:
          for (const part of raw.split('\n').map(clean).filter(Boolean)) {
            children.push(new Paragraph({
              children: [new TextRun({ text: part, size: 18, color: '444444' })],
              spacing: { after: 60 },
            }))
          }
          break
      }
    })

    const doc = new Document({ sections: [{ properties: {}, children }] })
    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `cv-${getCvSlug()}.docx`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleDownloadPdf = async () => {
    const el = document.getElementById('cv-canvas')
    if (!el) return

    const html2canvasModule = await import('html2canvas')
    const html2canvas = html2canvasModule.default
    const jsPDFModule = await import('jspdf')
    const jsPDF = jsPDFModule.default

    const canvas = await html2canvas(el, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: '#ffffff',
      logging: false,
      width: el.scrollWidth,
      height: el.scrollHeight,
      windowWidth: el.scrollWidth,
      windowHeight: el.scrollHeight,
    })

    const imgData = canvas.toDataURL('image/png')
    const imgWidth = 210
    const pageHeight = 297
    const imgHeight = (canvas.height * imgWidth) / canvas.width
    const pageCount = Math.max(1, Math.ceil((imgHeight - 1) / pageHeight))
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })

    /* metadonnees PDF (lues par les ATS et les recruteurs) */
    const pdfName = ov('name', fullName || cvName)
    pdf.setProperties({
      title: `CV ${pdfName}`.trim(),
      subject: ov('title', cvTitle),
      author: pdfName,
      creator: 'CVFit',
      keywords: (cvData?.skills ?? []).slice(0, 12).join(', '),
    })

    for (let pageIndex = 0; pageIndex < pageCount; pageIndex++) {
      if (pageIndex > 0) pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, -pageIndex * pageHeight, imgWidth, imgHeight)
    }

    /* couche de texte INVISIBLE : le rendu reste l'image fidele au preview,
       mais le PDF contient tout le texte reel — selectionnable et lisible
       par les logiciels ATS. Positionne par bloc via les rects du DOM. */
    const canvasRect = el.getBoundingClientRect()
    const mmPerPx = imgWidth / canvasRect.width
    const textNodes = el.querySelectorAll<HTMLElement>('[data-pdf]')
    const writeInvisible = (node: HTMLElement) => {
      const text = (node.innerText ?? '').replace(/\s+/g, ' ').trim()
      if (!text) return
      const rect = node.getBoundingClientRect()
      const yMm = (rect.top - canvasRect.top) * mmPerPx
      const pageIndex = Math.max(0, Math.min(pageCount - 1, Math.floor(yMm / pageHeight)))
      pdf.setPage(pageIndex + 1)
      pdf.setFontSize(Math.max(6, Math.min(24, rect.height * mmPerPx * 2.6)))
      const lines = pdf.splitTextToSize(text, Math.max(20, rect.width * mmPerPx)) as string[]
      pdf.text(lines, (rect.left - canvasRect.left) * mmPerPx, yMm - pageIndex * pageHeight + 3, { renderingMode: 'invisible' })
    }
    textNodes.forEach(writeInvisible)

    /* liens cliquables : email, LinkedIn, portfolio (positions reelles du DOM) */
    el.querySelectorAll<HTMLAnchorElement>('a[href]').forEach(anchor => {
      const href = anchor.getAttribute('href')
      if (!href) return
      const rect = anchor.getBoundingClientRect()
      if (!rect.width || !rect.height) return
      const yMm = (rect.top - canvasRect.top) * mmPerPx
      const pageIndex = Math.max(0, Math.min(pageCount - 1, Math.floor(yMm / pageHeight)))
      pdf.setPage(pageIndex + 1)
      pdf.link(
        (rect.left - canvasRect.left) * mmPerPx,
        yMm - pageIndex * pageHeight,
        rect.width * mmPerPx,
        rect.height * mmPerPx,
        { url: href },
      )
    })
    pdf.setPage(1)

    setPreviewPageCount(pageCount)
    pdf.save(`cv-${getCvSlug()}.pdf`)
  }

  const handleRestart = () => {
    setCvFile(null)
    setPhotoFile(null)
    setJobOffer('')
    setKeywords({ technical: [], softSkills: [], experience: [] })
    setShowKeywords(false)
    setIsExtractingKeywords(false)
    setDiffItems([])
    setIsProcessingDiffs(false)
    setProcessingSubStep(-1)
    setOptimizationError(null)
    setAtsScore(null)
    setAtsScoreBefore(null)
    setPreviewPageCount(1)
    setCvContact(null)
    setCvData(null)
    setActiveGenerationId(null)
    setCvName('Mon CV')
    setPhotoPosition('none')
    setPhotoSize('m')
    setPhotoShape('ronde')
    setSectionSpacing('normal')
    setAccentColor('noir')
    setOnePageMode(false)
    setFitSnapshot(null)
    setEdits({})
    setExperienceOrder(null)
    setSaveStatus('idle')
    setOfferUrl('')
    setLinks(null)
    setReviewSection(0)
    setExperienceLevel('confirme')
    setSituation('recherche_active')
    setPhotoPreviewUrl(prev => {
      if (prev) URL.revokeObjectURL(prev)
      return null
    })
    setCvSections([
      { id: 'contact', type: 'contact', label: 'Informations personnelles', visible: true },
      { id: 'profil', type: 'profil', label: 'Profil', visible: true },
      { id: 'experience', type: 'experience', label: 'Expérience professionnelle', visible: true },
      { id: 'competences', type: 'competences', label: 'Compétences', visible: true },
      { id: 'formation', type: 'formation', label: 'Formation', visible: true },
      { id: 'langues', type: 'langues', label: 'Langues', visible: true },
      { id: 'certifications', type: 'certifications', label: 'Certifications', visible: true },
      { id: 'passions', type: 'passions', label: 'Centres d\'intérêt', visible: true },
    ])
    setHasAutoFit(false)
    setCurrentStep(1)
    setDirection(1)
  }

  const goToStep = (step: Step, dir = 1) => {
    setDirection(dir)
    setCurrentStep(step)
  }

  const getSectionOrder = (id: string) => {
    const index = cvSections.findIndex(section => section.id === id)
    return index === -1 ? 99 : index
  }

  /* ── cv canvas style helpers ── */
  const getDensiteClasses = () => {
    switch (densite) {
      case 'ultra-compact': return 'cv-density-ultra'
      case 'compact': return 'cv-density-compact'
      case 'aere': return 'cv-density-airy'
      default: return 'cv-density-normal'
    }
  }

  const getDensityFontDelta = () => {
    switch (densite) {
      case 'ultra-compact': return -1.2
      case 'compact': return -0.6
      case 'aere': return 0.6
      default: return 0
    }
  }

  const getDensityLineDelta = () => {
    switch (densite) {
      case 'ultra-compact': return -0.18
      case 'compact': return -0.1
      case 'aere': return 0.18
      default: return 0
    }
  }

  const getInterligneValue = () => {
    const base = (() => {
      switch (interligne) {
      case 'serre': return 1.3
      case 'espace': return 1.8
      default: return 1.5
      }
    })()
    return Math.max(1.1, Number((base + getDensityLineDelta()).toFixed(2)))
  }

  const getFontFamily = () => FONT_FAMILY_MAP[police]

  const getMargesPadding = () => {
    switch (marges) {
      case 'etroites': return '18px 22px'
      case 'larges': return '40px 44px'
      default: return '28px 32px'
    }
  }

  const getTailleTextePx = () => Math.max(9, Number((tailleTexte + getDensityFontDelta()).toFixed(1)))

  const getSectionSpacingPx = () => {
    const base = (() => {
      switch (sectionSpacing) {
      case 'serre': return 8
      case 'aere': return 26
      default: return 16
      }
    })()
    const densityDelta = densite === 'ultra-compact' ? -5 : densite === 'compact' ? -3 : densite === 'aere' ? 5 : 0
    return Math.max(4, base + densityDelta)
  }

  const getPhotoDim = (position: 'center' | 'side') => {
    const sizes = position === 'center'
      ? { s: 64, m: 80, l: 100 }
      : { s: 48, m: 60, l: 76 }
    return sizes[photoSize]
  }

  const photoRadius = photoShape === 'ronde' ? '9999px' : '10px'

  /* ── active accent color hex ── */
  const activeAccentHex = ACCENT_MAP[accentColor]

  /* ── donnees CV reelles : structure IA en priorite, regex en secours ── */
  const contact = {
    email: cvData?.contact.email || cvContact?.email || '',
    phone: cvData?.contact.phone || cvContact?.phone || '',
    location: cvData?.contact.location || cvContact?.location || '',
    linkedin: cvData?.contact.linkedin || cvContact?.linkedin || '',
    portfolio: cvData?.contact.portfolio || cvContact?.portfolio || '',
  }
  const contactLine = [contact.phone, contact.email, contact.location].filter(Boolean)
  const derivedLinks = Array.from(new Set(
    [contact.linkedin, contact.portfolio, ...(cvContact?.links ?? [])]
      .filter(Boolean)
      .map(normalizeContactLink)
      .filter(isValidContactLink),
  ))
  /* liens edites par l'utilisateur (etape 3) prioritaires sur les liens detectes */
  const contactLinks = links !== null
    ? links.map(link => link.url.trim()).filter(Boolean).map(normalizeContactLink).filter(isValidContactLink)
    : derivedLinks
  const approvedDiffs = diffItems.filter(diff => diff.status === 'approved')
  const getApprovedSectionText = (patterns: string[]) => {
    const found = approvedDiffs.find(diff => patterns.some(pattern => diff.section.toLowerCase().includes(pattern)))
    return found?.modifiedText || found?.apres
  }

  /* ── revue section par section (etape 3) ── */
  const flatKeywords = Array.from(new Set(
    [...keywords.technical, ...keywords.softSkills, ...keywords.experience]
      .map(kw => kw.trim())
      .filter(kw => kw.length >= 2),
  ))
  const countAddedKeywords = (diff: DiffItem) => {
    const after = ` ${diff.apres.toLowerCase()} `
    const before = ` ${diff.avant.toLowerCase()} `
    return flatKeywords.filter(kw => {
      const k = kw.toLowerCase()
      return after.includes(k) && !before.includes(k)
    }).length
  }
  const reviewGroupOf = (section: string): string => {
    const s = section.toLowerCase()
    if (s.startsWith('titre') || s.startsWith('title')) return 'informations'
    if (s.startsWith('profil') || s.includes('resume') || s.includes('résumé')) return 'resume'
    if (s.includes('experience') || s.includes('expérience') || s.startsWith('xp')) return 'experience'
    if (s.startsWith('formation') || s.includes('education') || s.includes('éducation')) return 'formation'
    if (s.includes('competence') || s.includes('compétence') || s.includes('skill')) return 'competences'
    if (s.includes('langue')) return 'langues'
    if (s.includes('certification')) return 'certifications'
    if (s.includes('passion') || s.includes('centre')) return 'passions'
    return 'autres'
  }
  const REVIEW_GROUPS: Array<{ id: string; label: string }> = [
    { id: 'informations', label: 'Informations' },
    { id: 'resume', label: 'Résumé' },
    { id: 'experience', label: 'Expérience' },
    { id: 'formation', label: 'Formation' },
    { id: 'competences', label: 'Compétences' },
    { id: 'langues', label: 'Langues' },
    { id: 'certifications', label: 'Certifications' },
    { id: 'passions', label: 'Passions' },
    { id: 'autres', label: 'Autres' },
  ]
  const diffsByGroup = (groupId: string) => diffItems.filter(diff => reviewGroupOf(diff.section) === groupId)
  const visibleReviewGroups = REVIEW_GROUPS.filter(group => group.id === 'informations' || diffsByGroup(group.id).length > 0)
  const currentReviewGroup = visibleReviewGroups[Math.min(reviewSection, visibleReviewGroups.length - 1)]
  const reviewGroupReviewed = (groupId: string) => diffsByGroup(groupId).every(diff => diff.status === 'approved' || diff.status === 'rejected')
  const diffReasonFor = (diff: DiffItem): string => {
    const group = reviewGroupOf(diff.section)
    const added = countAddedKeywords(diff)
    const kw = added > 0 ? ` (${added} mot${added > 1 ? 's' : ''}-clé${added > 1 ? 's' : ''} de l'offre ajouté${added > 1 ? 's' : ''})` : ''
    switch (group) {
      case 'informations': return `Titre aligné sur l'intitulé du poste${kw}.`
      case 'resume': return `Profil reformulé pour refléter les exigences de l'offre${kw}.`
      case 'experience': return `Expérience repositionnée vers les missions du poste${kw}.`
      case 'formation': return `Formation orientée vers les compétences attendues${kw}.`
      case 'competences': return `Compétences enrichies des mots-clés de l'offre${kw}.`
      case 'langues': return `Niveaux traduits en atouts pour le poste${kw}.`
      case 'certifications': return `Certifications mises en avant selon leur pertinence${kw}.`
      case 'passions': return `Centres d'intérêt reformulés en qualités utiles au poste${kw}.`
      default: return `Reformulation orientée vers l'offre${kw}.`
    }
  }
  const truncateWords = (text: string, maxWords: number) => {
    const words = text.split(/\s+/).filter(Boolean)
    return words.length > maxWords ? `${words.slice(0, maxWords).join(' ')}...` : text
  }
  const fullName = cvData?.fullName || ''
  const cvTitle = getApprovedSectionText(['titre', 'title']) ?? cvData?.title ?? ''
  const rawProfileText = getApprovedSectionText(['profil', 'resume', 'résumé']) ?? cvData?.profile ?? ''
  const profileText = onePageMode ? truncateWords(rawProfileText, 48) : rawProfileText
  const rawCompetencesText = getApprovedSectionText(['competence', 'compétence', 'skills']) ?? (cvData?.skills ?? []).join(' · ')
  const competencesText = onePageMode ? rawCompetencesText.split(/·|,|\n/).map(s => s.trim()).filter(Boolean).slice(0, 16).join(' · ') : rawCompetencesText
  /* override generique 'Formation' uniquement en correspondance exacte
     (les diffs "Formation — <diplome>" sont fusionnes par diplome plus bas) */
  const formationGenericDiff = approvedDiffs.find(diff => {
    const section = diff.section.toLowerCase().trim()
    return section === 'formation' || section === 'education' || section === 'éducation'
  })
  const formationText = formationGenericDiff ? (formationGenericDiff.modifiedText || formationGenericDiff.apres) : undefined
  const languesText = getApprovedSectionText(['langue'])
  const certificationsText = getApprovedSectionText(['certification'])
  const passionsText = getApprovedSectionText(['passion', 'centre'])
  const approvedExperienceDiffs = approvedDiffs.filter(diff => {
    const section = diff.section.toLowerCase()
    return section.includes('experience') || section.includes('expérience') || section.includes('xp')
  })
  const experiences = cvData?.experiences ?? []

  /* Fusionne les diffs d'experience approuves DANS la structure (titre,
     entreprise, dates, lieu restent en place ; seuls les contenus changent). */
  const normalizeText = (t: string) => t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '')
  const parseDiffContent = (text: string) => {
    const lines = text.split('\n').map(line => line.trim()).filter(Boolean)
    const bulletLines = lines.filter(line => /^[•\-–▪]/.test(line)).map(line => line.replace(/^[•\-–▪]\s*/, ''))
    const headerLine = lines.find(line => !/^[•\-–▪]/.test(line))
    return { headerLine, bulletLines, lines }
  }
  const diffMatchesExperience = (diff: DiffItem, exp: { title: string; company: string }) => {
    const haystack = normalizeText(`${diff.section} ${diff.avant} ${diff.apres}`)
    return (exp.company.length > 2 && haystack.includes(normalizeText(exp.company)))
      || (exp.title.length > 2 && normalizeText(diff.section).includes(normalizeText(exp.title)))
  }
  const matchedDiffIds = new Set<string>()
  const displayExperiences = experiences.map(exp => {
    const match = approvedExperienceDiffs.find(diff => !matchedDiffIds.has(diff.id) && diffMatchesExperience(diff, exp))
    if (!match) return exp
    matchedDiffIds.add(match.id)
    const { headerLine, bulletLines, lines } = parseDiffContent(match.modifiedText || match.apres)
    const newTitle = headerLine && headerLine.length <= 110
      ? headerLine.split('|')[0].trim()
      : exp.title
    const newBullets = bulletLines.length > 0
      ? bulletLines
      : lines.length > 1
        ? lines.filter(line => line !== headerLine)
        : exp.bullets
    return { ...exp, title: newTitle || exp.title, bullets: newBullets }
  })
  /* Diffs d'experience approuves sans correspondance : ajoutes en fin de liste. */
  const extraExperiences = approvedExperienceDiffs
    .filter(diff => !matchedDiffIds.has(diff.id))
    .map(diff => {
      const { headerLine, bulletLines, lines } = parseDiffContent(diff.modifiedText || diff.apres)
      return {
        title: (headerLine ?? diff.section).split('|')[0].trim(),
        company: headerLine?.includes('|') ? headerLine.split('|')[1].trim() : '',
        period: '',
        location: '',
        bullets: bulletLines.length > 0 ? bulletLines : lines.filter(line => line !== headerLine),
      }
    })
  const allExperiencesRaw = [...displayExperiences, ...extraExperiences]
  const allExperiencesBase = onePageMode
    ? allExperiencesRaw.slice(0, 4).map(exp => ({ ...exp, bullets: exp.bullets.slice(0, 2).map(bullet => truncateWords(bullet, 24)) }))
    : allExperiencesRaw
  /* ordre personnalise des experiences (fleches ↑↓ dans l'editeur) */
  const validOrder = experienceOrder && experienceOrder.length === allExperiencesBase.length
    && experienceOrder.every(index => index >= 0 && index < allExperiencesBase.length)
  const allExperiences = validOrder
    ? experienceOrder.map(index => ({ exp: allExperiencesBase[index], origIndex: index }))
    : allExperiencesBase.map((exp, index) => ({ exp, origIndex: index }))

  const moveExperience = (position: number, delta: -1 | 1) => {
    const order = validOrder ? [...(experienceOrder as number[])] : allExperiencesBase.map((_, i) => i)
    const target = position + delta
    if (target < 0 || target >= order.length) return
    ;[order[position], order[target]] = [order[target], order[position]]
    setExperienceOrder(order)
  }

  /* ── editions manuelles : valeur editee prioritaire sur la valeur derivee ── */
  const ov = (key: string, fallback: string) => edits[key] ?? fallback

  const handleCanvasBlur = (e: React.FocusEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement
    const key = target.dataset?.ekey
    if (!key) return
    const text = (target.innerText ?? '').replace(/^[•\s]+/, '').trim()
    setEdits(prev => (prev[key] === text ? prev : { ...prev, [key]: text }))
    setSaveStatus('idle')
  }

  const handleSaveEdits = async () => {
    if (!activeGenerationId) return
    setSaveStatus('saving')
    try {
      const state: EditorState = {
        edits,
        cvName,
        template,
        police,
        densite,
        interligne,
        marges,
        accentColor,
        tailleTexte,
        sectionSpacing,
        photoPosition,
        photoSize,
        photoShape,
        sections: cvSections,
        diffs: diffItems.map(diff => ({ status: diff.status, modifiedText: diff.modifiedText })),
        experienceOrder: validOrder ? (experienceOrder as number[]) : allExperiencesBase.map((_, i) => i),
      }
      await saveEditorState(activeGenerationId, state)
      setSaveStatus('saved')
      window.setTimeout(() => setSaveStatus(prev => (prev === 'saved' ? 'idle' : prev)), 2500)
    } catch {
      setSaveStatus('error')
    }
  }
  const educations = cvData?.education ?? []
  const languages = cvData?.languages ?? []
  const certifications = cvData?.certifications ?? []
  const interests = cvData?.interests ?? []

  /* fusion des focus "Formation — <diplome>" approuves dans chaque diplome */
  const educationsDisplay = educations.map(edu => {
    const match = approvedDiffs.find(diff => {
      const section = normalizeText(diff.section)
      return section.startsWith('formation') && section !== 'formation'
        && edu.degree.length > 2 && section.includes(normalizeText(edu.degree).slice(0, 30))
    })
    if (!match) return edu
    const focus = (match.modifiedText || match.apres).split('\n').map(l => l.replace(/^[•\-–\s]+/, '').trim()).filter(Boolean).join(' ')
    return { ...edu, description: focus || edu.description }
  })

  /* lignes affichables Langues / Passions (texte optimise prioritaire) */
  const languesLinesRaw = (languesText
    ? languesText.split('\n')
    : languages.map(lang => [lang.language, lang.level].filter(Boolean).join(' : ')))
    .map(line => line.replace(/^[•\-–\s]+/, '').trim())
    .filter(Boolean)
  const passionsLinesRaw = (passionsText ? passionsText.split('\n') : interests)
    .map(line => line.replace(/^[•\-–\s]+/, '').trim())
    .filter(Boolean)
  const languesLines = onePageMode ? languesLinesRaw.slice(0, 3) : languesLinesRaw
  const passionsLines = onePageMode ? passionsLinesRaw.slice(0, 4) : passionsLinesRaw
  const certificationsDisplay = onePageMode ? certifications.slice(0, 3) : certifications

  /* ── en-tete : style distinct par template ── */
  const headerLeftAligned = photoPosition === 'left' || photoPosition === 'right' || template === 'moderne' || template === 'chronologique'
  const titleColor = '#2F3A4A'
  const getNameStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = {
      fontSize: '1.65em',
      color: '#111',
      letterSpacing: '0',
      textTransform: 'uppercase',
      fontWeight: 800,
    }
    switch (template) {
      case 'prestige':
        return { ...base, letterSpacing: '0.08em', fontSize: '1.45em' }
      case 'moderne':
        return { ...base, fontSize: '1.8em' }
      case 'essentiel':
        return { ...base, fontSize: '1.5em' }
      default:
        return base
    }
  }
  const getHeaderRule = (): React.CSSProperties => {
    switch (template) {
      case 'moderne':
        return { borderBottom: `3px solid ${activeAccentHex}`, paddingBottom: 12 }
      case 'prestige':
        return { borderBottom: `4px double ${activeAccentHex}`, paddingBottom: 12 }
      case 'essentiel':
        return { borderBottom: '1px solid #D5D5D0', paddingBottom: 12 }
      case 'chronologique':
        return { borderBottom: `2px solid ${activeAccentHex}`, paddingBottom: 12 }
      default:
        return {}
    }
  }

  /* ── styles de titre de section selon le template ── */
  const sectionAccent = template === 'essentiel' ? '#1A1A1A' : activeAccentHex
  const getSectionTitleStyle = (): React.CSSProperties => {
    const base: React.CSSProperties = { fontSize: '0.85em', color: '#1A1A1A', letterSpacing: '0.06em', paddingBottom: 4 }
    switch (template) {
      case 'moderne':
        return { ...base, borderLeft: `3px solid ${sectionAccent}`, paddingLeft: 8, paddingBottom: 0 }
      case 'essentiel':
        return { ...base, borderBottom: '1px solid #D5D5D0' }
      case 'prestige':
        return { ...base, borderBottom: `4px double ${sectionAccent}`, textAlign: 'center' }
      default:
        return { ...base, borderBottom: `2px solid ${sectionAccent}` }
    }
  }

  useEffect(() => {
    if (currentStep !== 4) return
    const updatePageCount = () => {
      const el = document.getElementById('cv-canvas')
      if (!el) return
      const rect = el.getBoundingClientRect()
      if (!rect.width) return
      const pxPerMm = rect.width / 210
      const pageH = 297 * pxPerMm
      setPageHeightPx(pageH)
      setPreviewPageCount(Math.max(1, Math.ceil(el.scrollHeight / pageH)))
    }
    const timeout = window.setTimeout(updatePageCount, 80)
    window.addEventListener('resize', updatePageCount)
    return () => {
      window.clearTimeout(timeout)
      window.removeEventListener('resize', updatePageCount)
    }
  }, [currentStep, cvSections, densite, interligne, tailleTexte, photoPosition, photoPreviewUrl, template, accentColor, marges, cvData, sectionSpacing, photoSize, diffItems, onePageMode])

  /* ═══════ Sidebar step items ═══════ */
  const stepItems = [
    { num: 1, label: 'Votre CV' },
    { num: 2, label: "L'offre d'emploi" },
    { num: 3, label: 'Optimisation IA' },
    { num: 4, label: 'Éditeur CV' },
  ]

  const progressPercent = (currentStep / 4) * 100

  /* ════════════════════════════════════════════════════════════
     RENDER
     ════════════════════════════════════════════════════════════ */
  return (
    <div className="min-h-[100dvh] flex flex-col lg:flex-row" style={{ background: 'var(--off-white)' }}>

      {/* ═══════ Mobile Progress Bar ═══════ */}
      {currentStep !== 4 && (
        <div className="lg:hidden sticky top-[68px] z-40 bg-white border-b border-mid-gray px-6 py-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-caption text-navy font-semibold">Votre adaptation</span>
            <span className="text-small text-text-gray">Etape {currentStep} sur 4</span>
          </div>
          <div className="w-full h-1.5 bg-light-gray rounded-full overflow-hidden mb-3">
            <motion.div
              className="h-full rounded-full"
              style={{ background: 'var(--coral)' }}
              initial={{ width: 0 }}
              animate={{ width: `${progressPercent}%` }}
              transition={{ duration: 0.4, ease: easeSmooth }}
            />
          </div>
          <div className="flex items-center justify-between">
            {stepItems.map((s, i) => {
              const completed = currentStep > s.num
              const active = currentStep === s.num
              return (
                <div key={s.num} className="flex items-center flex-1 last:flex-none">
                  <motion.div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0"
                    animate={{
                      backgroundColor: completed ? 'var(--success)' : active ? 'var(--coral)' : 'var(--light-gray)',
                      color: completed || active ? '#fff' : 'var(--text-gray)',
                    }}
                    transition={{ duration: 0.3 }}
                  >
                    {completed ? <Check size={16} /> : <span className="text-small font-semibold">{s.num}</span>}
                  </motion.div>
                  {i < stepItems.length - 1 && (
                    <div className="flex-1 h-0.5 mx-2 bg-light-gray overflow-hidden rounded-full">
                      <motion.div
                        className="h-full rounded-full"
                        style={{ background: 'var(--success)' }}
                        initial={{ width: 0 }}
                        animate={{ width: completed ? '100%' : '0%' }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  )}
                </div>
              )
            })}
          </div>
        </div>
      )}

      {/* ═══════ Main Content ═══════ */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className={`flex-1 ${currentStep === 4 ? 'px-0 py-0' : 'px-6 lg:px-12 py-8 lg:py-12'}`}>
          <div className={currentStep === 4 ? 'h-full' : currentStep === 3 ? 'max-w-[1200px] mx-auto' : 'max-w-[720px] mx-auto'}>
            <AnimatePresence mode="wait" initial={false}>
              <motion.div
                key={currentStep}
                initial={{ opacity: 0, x: direction > 0 ? 20 : -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction > 0 ? -20 : 20 }}
                transition={{ duration: 0.35, ease: easeOutExpo }}
                className={currentStep === 4 ? 'h-full' : ''}
              >

                {/* ════════════════ STEP 1: Upload CV ════════════════ */}
                {currentStep === 1 && (
                  <div>
                    <h2 className="text-section text-navy mb-2">Uploadez votre CV</h2>
                    <p className="text-body-large text-text-gray mb-8">
                      Sélectionnez un CV déjà importé ou ajoutez un nouveau fichier PDF/DOCX. Votre contenu sera restructuré dans un modèle optimisé pour les ATS.
                    </p>

                    {isLoadingDocuments && (
                      <div className="mb-5 flex items-center gap-2 rounded-xl border border-mid-gray bg-white px-4 py-3 text-caption text-text-gray">
                        <Loader2 size={15} className="animate-spin" style={{ color: 'var(--coral)' }} />
                        Chargement de votre bibliothèque CV…
                      </div>
                    )}

                    {!isLoadingDocuments && savedDocuments.length > 0 && (
                      <div className="mb-6 rounded-2xl border border-mid-gray bg-white p-5">
                        <div className="mb-4 flex items-start gap-3">
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl" style={{ background: 'var(--coral-50)', color: 'var(--coral)' }}>
                            <Library size={19} />
                          </div>
                          <div>
                            <h3 className="text-card-title text-navy">Réutiliser un CV existant</h3>
                            <p className="text-caption text-text-gray">
                              Votre CV original reste en mémoire dans votre bibliothèque. Choisissez-le ici pour éviter de le réuploader.
                            </p>
                          </div>
                        </div>
                        <div className="grid max-h-[360px] gap-3 overflow-y-auto pr-1">
                          {savedDocumentOptions.map((document, index) => {
                            const selected = selectedDocumentId === document.id
                            const isOriginal = index === 0
                            return (
                              <button
                                key={document.id}
                                type="button"
                                onClick={() => {
                                  setSelectedDocumentId(document.id)
                                  setCvFile(null)
                                  setPhotoFile(null)
                                  setCvContact(null)
                                  setCvData(null)
                                  setActiveGenerationId(null)
                                }}
                                className="flex items-center gap-3 rounded-xl border px-4 py-3 text-left transition-colors"
                                style={{
                                  borderColor: selected ? 'var(--coral)' : 'var(--mid-gray)',
                                  background: selected ? 'var(--coral-50)' : '#fff',
                                }}
                              >
                                <FileText size={20} className="shrink-0 text-navy" />
                                <div className="min-w-0 flex-1">
                                  <p className="truncate text-caption font-semibold text-navy">
                                    {document.originalName}
                                    {isOriginal && <span className="ml-2 text-small font-bold" style={{ color: 'var(--coral)' }}>CV originel</span>}
                                  </p>
                                  <p className="text-small text-text-gray">
                                    {document.type} · {formatFileSize(document.size)} · {document._count.generations} adaptation{document._count.generations > 1 ? 's' : ''}
                                  </p>
                                </div>
                                <span
                                  className="shrink-0 rounded-full px-2.5 py-1 text-small font-bold"
                                  style={{
                                    color: selected ? 'var(--coral)' : 'var(--text-gray)',
                                    background: selected ? '#fff' : 'var(--navy-50)',
                                  }}
                                >
                                  {selected ? 'Sélectionné' : 'Utiliser'}
                                </span>
                              </button>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    {/* Dropzone */}
                    <div
                      {...getRootProps()}
                      className="border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 outline-none"
                      style={{
                        borderColor: isDragActive ? 'var(--coral)' : 'var(--mid-gray)',
                        background: isDragActive ? 'var(--coral-50)' : 'var(--off-white)',
                        minHeight: 240,
                      }}
                    >
                      <input {...getInputProps()} />
                      <UploadCloud
                        size={64}
                        className="mx-auto mb-4 transition-colors duration-200"
                        style={{ color: isDragActive ? 'var(--coral)' : 'var(--text-gray)' }}
                      />
                      <p className="text-subsection text-navy mb-2">
                        {selectedDocument ? 'Uploader un autre CV' : 'Glissez-déposez votre CV ici'}
                      </p>
                      <p className="text-body-large mb-3">
                        <span style={{ color: 'var(--coral)' }}>ou cliquez pour parcourir</span>
                      </p>
                      <p className="text-caption text-text-gray">
                        PDF ou DOCX — max 10 Mo
                      </p>
                    </div>

                    {selectedDocument && !cvFile && (
                      <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, ease: easeOutExpo }}
                        className="mt-5 bg-white border rounded-xl px-5 py-4 flex items-center gap-4"
                        style={{ borderColor: 'var(--coral)' }}
                      >
                        <FileText size={40} className="text-navy shrink-0" />
                        <div className="flex-1 min-w-0">
                          <p className="text-caption font-medium text-navy truncate">{selectedDocument.originalName}</p>
                          <p className="text-small text-text-gray">
                            CV réutilisé depuis la bibliothèque · {selectedDocument.type} · {formatFileSize(selectedDocument.size)}
                          </p>
                        </div>
                        <button
                          onClick={() => setSelectedDocumentId(null)}
                          className="p-1.5 rounded-lg hover:bg-light-gray text-text-gray hover:text-error transition-colors duration-200 shrink-0"
                          aria-label="Ne plus utiliser ce CV"
                        >
                          <X size={20} />
                        </button>
                      </motion.div>
                    )}

                    {/* Uploaded file card */}
                    <AnimatePresence>
                      {cvFile && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3, ease: easeOutExpo }}
                          className="mt-5 bg-white border border-mid-gray rounded-xl px-5 py-4 flex items-center gap-4"
                        >
                          <FileText size={40} className="text-navy shrink-0" />
                          <div className="flex-1 min-w-0">
                            <p className="text-caption font-medium text-navy truncate">{cvFile.name}</p>
                            <p className="text-small text-text-gray">{formatFileSize(cvFile.size)}</p>
                          </div>
                          <button
                            onClick={() => { setCvFile(null); setPhotoFile(null) }}
                            className="p-1.5 rounded-lg hover:bg-light-gray text-text-gray hover:text-error transition-colors duration-200 shrink-0"
                          >
                            <X size={20} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Navigation */}
                    <div className="flex justify-end mt-10">
                      <motion.button
                        className="text-button text-white px-7 py-3.5 rounded-xl transition-all duration-200"
                        style={{ background: 'var(--coral)', opacity: canContinueStep1 ? 1 : 0.5 }}
                        onClick={() => canContinueStep1 && goToStep(2, 1)}
                        whileHover={canContinueStep1 ? { scale: 1.02, boxShadow: '0 4px 16px rgba(248,90,62,0.35)' } : {}}
                        whileTap={canContinueStep1 ? { scale: 0.98 } : {}}
                      >
                        Continuer
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* ════════════════ STEP 2: Job Offer ════════════════ */}
                {currentStep === 2 && (
                  <div>
                    <h2 className="text-section text-navy mb-2">Collez l&apos;offre d&apos;emploi</h2>
                    <p className="text-body-large text-text-gray mb-8">
                      Copiez le texte complet de l&apos;offre, ou importez-la depuis son lien. Notre IA en extraira les mots-clés et compétences clés.
                    </p>

                    {/* Import par URL */}
                    <div className="flex gap-2 mb-4">
                      <div className="relative flex-1">
                        <Link2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-gray" />
                        <input
                          type="url"
                          value={offerUrl}
                          onChange={(e) => setOfferUrl(e.target.value)}
                          placeholder="https://... lien de l'offre (LinkedIn, Indeed, WTTJ…)"
                          className="w-full bg-white border-[1.5px] border-mid-gray rounded-xl pl-10 pr-4 py-3 text-caption text-navy outline-none focus:border-coral transition-colors"
                        />
                      </div>
                      <button
                        onClick={async () => {
                          if (!offerUrl.trim() || isFetchingOffer) return
                          setIsFetchingOffer(true)
                          setOptimizationError(null)
                          try {
                            const text = await fetchOfferFromUrl(offerUrl.trim())
                            handleJobOfferChange(text)
                          } catch (err) {
                            setOptimizationError(err instanceof Error ? err.message : 'Import impossible.')
                          } finally {
                            setIsFetchingOffer(false)
                          }
                        }}
                        disabled={!offerUrl.trim() || isFetchingOffer}
                        className="flex items-center gap-2 text-caption font-semibold px-4 py-3 rounded-xl text-white transition-all duration-200 disabled:opacity-50 shrink-0"
                        style={{ background: 'var(--coral)' }}
                      >
                        {isFetchingOffer ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
                        {isFetchingOffer ? 'Import…' : 'Importer'}
                      </button>
                    </div>

                    <div className="relative">
                      <textarea
                        value={jobOffer}
                        onChange={(e) => handleJobOfferChange(e.target.value)}
                        placeholder="Collez ici le texte de l'offre d'emploi..."
                        maxLength={5000}
                        className="w-full bg-white border-[1.5px] border-mid-gray rounded-xl p-4 text-body text-navy outline-none resize-y transition-all duration-200 focus:border-coral"
                        style={{ minHeight: 280, boxShadow: '0 0 0 3px rgba(248,90,62,0)' }}
                        onFocus={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(248,90,62,0.15)' }}
                        onBlurCapture={(e) => { e.currentTarget.style.boxShadow = '0 0 0 3px rgba(248,90,62,0)' }}
                      />
                      <div className="absolute bottom-3 right-4 text-small text-text-gray">
                        {jobOffer.length} / 5000
                      </div>
                      {isExtractingKeywords && (
                        <div className="absolute bottom-3 left-4 flex items-center gap-2 text-small" style={{ color: 'var(--coral)' }}>
                          <Loader2 size={14} className="animate-spin" />
                          Analyse en cours…
                        </div>
                      )}
                    </div>

                    {canContinueStep2 && !showKeywords && !isExtractingKeywords && (
                      <button
                        onClick={extractKeywords}
                        className="mt-3 text-caption font-medium px-4 py-2 rounded-lg border border-mid-gray text-navy hover:bg-navy-50 transition-colors duration-200"
                      >
                        Aperçu des mots-clés détectés
                      </button>
                    )}

                    {/* Keywords preview */}
                    <AnimatePresence>
                      {showKeywords && (
                        <motion.div
                          initial={{ opacity: 0, y: 10 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: -10 }}
                          transition={{ duration: 0.3, ease: easeOutExpo }}
                          className="mt-6 rounded-xl p-5"
                          style={{ background: 'var(--navy-50)' }}
                        >
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="text-subsection text-navy">Mots-clés détectés</h4>
                            <span className="text-small text-text-gray">(Aperçu — seront affinés par l&apos;IA)</span>
                          </div>

                          {keywords.technical.length > 0 && (
                            <div className="mb-3">
                              <p className="text-small text-text-gray font-medium mb-1.5">Compétences techniques :</p>
                              <div className="flex flex-wrap gap-1.5">
                                {keywords.technical.map((tag, i) => (
                                  <motion.span
                                    key={tag}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: i * 0.03, duration: 0.3, ease: easeSpring }}
                                    className="bg-white border border-mid-gray rounded-full px-3.5 py-1 text-caption font-medium text-navy"
                                  >
                                    {tag}
                                  </motion.span>
                                ))}
                              </div>
                            </div>
                          )}

                          {keywords.softSkills.length > 0 && (
                            <div className="mb-3">
                              <p className="text-small text-text-gray font-medium mb-1.5">Soft skills :</p>
                              <div className="flex flex-wrap gap-1.5">
                                {keywords.softSkills.map((tag, i) => (
                                  <motion.span
                                    key={tag}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: (keywords.technical.length + i) * 0.03, duration: 0.3, ease: easeSpring }}
                                    className="bg-white border border-mid-gray rounded-full px-3.5 py-1 text-caption font-medium text-navy"
                                  >
                                    {tag}
                                  </motion.span>
                                ))}
                              </div>
                            </div>
                          )}

                          {keywords.experience.length > 0 && (
                            <div>
                              <p className="text-small text-text-gray font-medium mb-1.5">Expérience :</p>
                              <div className="flex flex-wrap gap-1.5">
                                {keywords.experience.map((tag, i) => (
                                  <motion.span
                                    key={tag}
                                    initial={{ opacity: 0, scale: 0.8 }}
                                    animate={{ opacity: 1, scale: 1 }}
                                    transition={{ delay: (keywords.technical.length + keywords.softSkills.length + i) * 0.03, duration: 0.3, ease: easeSpring }}
                                    className="bg-white border border-mid-gray rounded-full px-3.5 py-1 text-caption font-medium text-navy"
                                  >
                                    {tag}
                                  </motion.span>
                                ))}
                              </div>
                            </div>
                          )}
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* ─── Personnalisation : modèle + profil (révélée quand l'offre est saisie) ─── */}
                    <AnimatePresence>
                      {canContinueStep2 && (
                        <motion.div
                          initial={{ opacity: 0, y: 12 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ duration: 0.35, ease: easeOutExpo }}
                          className="mt-8"
                        >
                          {/* Choix du modèle */}
                          <h3 className="text-subsection text-navy mb-1">Choisissez votre modèle</h3>
                          <p className="text-caption text-text-gray mb-3">Vous pourrez le modifier à tout moment dans l'éditeur.</p>
                          <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 mb-6">
                            {([
                              { id: 'pro' as Template, label: 'Pro' },
                              { id: 'moderne' as Template, label: 'Moderne' },
                              { id: 'essentiel' as Template, label: 'Épuré' },
                              { id: 'prestige' as Template, label: 'Prestige' },
                              { id: 'chronologique' as Template, label: 'Chronologique' },
                            ]).map(tpl => (
                              <button
                                key={tpl.id}
                                onClick={() => setTemplate(tpl.id)}
                                className="flex flex-col items-center gap-1.5 shrink-0 outline-none"
                              >
                                <div
                                  className="rounded-lg overflow-hidden border-2 transition-all duration-200"
                                  style={{
                                    borderColor: template === tpl.id ? activeAccentHex : '#E5E5E0',
                                    boxShadow: template === tpl.id ? `0 0 0 1px ${activeAccentHex}, 0 4px 12px rgba(0,0,0,0.08)` : '0 1px 3px rgba(0,0,0,0.05)',
                                  }}
                                >
                                  <TemplateThumb id={tpl.id} accent={activeAccentHex} />
                                </div>
                                <span className="text-[11px] font-medium" style={{ color: template === tpl.id ? activeAccentHex : '#888' }}>{tpl.label}</span>
                              </button>
                            ))}
                          </div>

                          {/* Niveau d'expérience */}
                          <h4 className="text-caption font-semibold text-navy mb-2">Votre niveau d'expérience</h4>
                          <div className="flex flex-wrap gap-2 mb-5">
                            {([
                              { id: 'etudiant', label: 'Étudiant / Stage' },
                              { id: 'junior', label: 'Junior (0-2 ans)' },
                              { id: 'confirme', label: 'Confirmé (3-5 ans)' },
                              { id: 'senior', label: 'Senior (6-10 ans)' },
                              { id: 'expert', label: 'Expert / Lead (10+ ans)' },
                            ]).map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => setExperienceLevel(opt.id)}
                                className="text-caption font-medium px-3.5 py-2 rounded-lg border transition-colors duration-200"
                                style={{
                                  borderColor: experienceLevel === opt.id ? 'var(--coral)' : 'var(--mid-gray)',
                                  color: experienceLevel === opt.id ? 'var(--coral)' : 'var(--navy)',
                                  background: experienceLevel === opt.id ? 'var(--coral-50)' : '#fff',
                                }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>

                          {/* Situation */}
                          <h4 className="text-caption font-semibold text-navy mb-2">Votre situation</h4>
                          <div className="flex flex-wrap gap-2">
                            {([
                              { id: 'recherche_active', label: 'En recherche active' },
                              { id: 'en_poste', label: 'En poste' },
                              { id: 'reconversion', label: 'Reconversion' },
                              { id: 'jeune_diplome', label: 'Jeune diplômé' },
                              { id: 'premier_emploi', label: 'Premier emploi' },
                            ]).map(opt => (
                              <button
                                key={opt.id}
                                onClick={() => setSituation(opt.id)}
                                className="text-caption font-medium px-3.5 py-2 rounded-lg border transition-colors duration-200"
                                style={{
                                  borderColor: situation === opt.id ? 'var(--coral)' : 'var(--mid-gray)',
                                  color: situation === opt.id ? 'var(--coral)' : 'var(--navy)',
                                  background: situation === opt.id ? 'var(--coral-50)' : '#fff',
                                }}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {optimizationError && (
                      <div className="mt-6 rounded-xl border px-4 py-3" style={{ borderColor: '#FCA5A5', background: '#FEF2F2' }}>
                        <p className="text-sm font-semibold" style={{ color: '#B91C1C' }}>
                          Optimisation IA indisponible
                        </p>
                        <p className="text-sm mt-1" style={{ color: '#7F1D1D' }}>
                          {optimizationError}
                        </p>
                      </div>
                    )}

                    {/* Navigation */}
                    <div className="flex justify-between mt-10">
                      <motion.button
                        className="flex items-center gap-2 text-button text-navy px-5 py-3 rounded-xl hover:bg-navy-50 transition-colors duration-200"
                        onClick={() => goToStep(1, -1)}
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                      >
                        <ArrowLeft size={18} />
                        Retour
                      </motion.button>
                      <motion.button
                        className="flex items-center gap-2 text-button text-white px-7 py-3.5 rounded-xl transition-all duration-200"
                        style={{ background: 'var(--coral)', opacity: canContinueStep2 && !isProcessingDiffs ? 1 : 0.5 }}
                        disabled={!canContinueStep2 || isProcessingDiffs}
                        onClick={() => {
                          if (canContinueStep2 && !isProcessingDiffs) {
                            startOptimization()
                          }
                        }}
                        whileHover={canContinueStep2 && !isProcessingDiffs ? { scale: 1.02, boxShadow: '0 4px 16px rgba(248,90,62,0.35)' } : {}}
                        whileTap={canContinueStep2 && !isProcessingDiffs ? { scale: 0.98 } : {}}
                      >
                        {isProcessingDiffs ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                        Analyse en cours…
                          </>
                        ) : (
                          <>
                            Générer mon CV
                            <ChevronDown size={18} className="rotate-[-90deg]" />
                          </>
                        )}
                      </motion.button>
                    </div>
                  </div>
                )}

                {/* ════════════════ STEP 3: AI Diff Review ════════════════ */}
                {currentStep === 3 && (
                  <div>
                    {/* Processing state */}
                    <AnimatePresence>
                      {isProcessingDiffs && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                          className="flex flex-col items-center justify-center gap-5"
                          style={{ minHeight: 400 }}
                        >
                          <motion.div
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                          >
                            <Loader2 size={48} style={{ color: 'var(--coral)' }} />
                          </motion.div>
                          <p className="text-subsection text-navy">Analyse de l&apos;offre en cours...</p>
                          <div className="w-full max-w-[460px] flex flex-col gap-3">
                            {ANALYSIS_STEPS.map((step, i) => {
                              const isCompleted = processingSubStep > i
                              const isCurrent = processingSubStep === i
                              return (
                              <motion.div
                                key={step.title}
                                className="flex items-center gap-3 rounded-xl border bg-white px-4 py-3"
                                style={{
                                  borderColor: isCompleted ? '#A7F3D0' : isCurrent ? '#FDBA74' : '#E5E5E0',
                                  boxShadow: isCurrent ? '0 8px 22px rgba(248,90,62,0.10)' : 'none',
                                }}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1, duration: 0.3 }}
                              >
                                {isCompleted ? (
                                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3, ease: easeSpring }}>
                                    <CheckCircle2 size={20} style={{ color: '#10B981' }} />
                                  </motion.div>
                                ) : isCurrent ? (
                                  <motion.div animate={{ rotate: 360 }} transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}>
                                    <Loader2 size={20} style={{ color: 'var(--coral)' }} />
                                  </motion.div>
                                ) : (
                                  <Circle size={20} className="text-text-gray" />
                                )}
                                <div className="flex-1">
                                  <p className={`text-caption font-semibold transition-colors duration-300 ${isCompleted || isCurrent ? 'text-navy' : 'text-text-gray'}`}>
                                    {step.title}
                                  </p>
                                  <p className="text-[11px] mt-0.5" style={{ color: isCompleted || isCurrent ? '#64748B' : '#A3A3A3' }}>
                                    {step.detail}
                                  </p>
                                </div>
                                {isCompleted && (
                                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide" style={{ background: '#D1FAE5', color: '#047857' }}>
                                    Termine
                                  </span>
                                )}
                                {isCurrent && (
                                  <span className="rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide" style={{ background: '#FFF7ED', color: '#EA580C' }}>
                                    En cours
                                  </span>
                                )}
                              </motion.div>
                              )
                            })}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {optimizationError && !isProcessingDiffs && (
                      <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="rounded-xl border px-5 py-4"
                        style={{ borderColor: '#FCA5A5', background: '#FEF2F2' }}
                      >
                        <p className="text-sm font-semibold" style={{ color: '#B91C1C' }}>
                          Optimisation IA indisponible
                        </p>
                        <p className="text-sm mt-1" style={{ color: '#7F1D1D' }}>
                          {optimizationError}
                        </p>
                        <button
                          onClick={() => goToStep(2, -1)}
                          className="mt-3 text-[12px] font-semibold px-3 py-2 rounded-lg"
                          style={{ background: '#fff', color: '#B91C1C', border: '1px solid #FCA5A5' }}
                        >
                          Revenir à l'offre
                        </button>
                      </motion.div>
                    )}

                    {/* Revue section par section + aperçu */}
                    {!isProcessingDiffs && !optimizationError && currentReviewGroup && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.4 }}
                        className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6 items-start"
                      >
                        {/* ─── Colonne gauche : wizard ─── */}
                        <div className="min-w-0">
                          {/* Score ATS */}
                          {atsScore !== null && (
                            <div className="flex items-center gap-3 mb-5">
                              <AtsGauge value={atsScore} label="Score ATS" isAfter />
                              {atsScoreBefore !== null && atsScore > atsScoreBefore && (
                                <span className="text-caption font-semibold" style={{ color: 'var(--success)' }}>
                                  +{atsScore - atsScoreBefore} pts vs votre CV d'origine
                                </span>
                              )}
                            </div>
                          )}

                          {/* Sous-stepper des sections */}
                          <div className="flex gap-2 overflow-x-auto pb-2 mb-1 -mx-1 px-1">
                            {visibleReviewGroups.map((group, gi) => {
                              const active = gi === reviewSection
                              const done = reviewGroupReviewed(group.id) && diffsByGroup(group.id).length > 0
                              return (
                                <button
                                  key={group.id}
                                  onClick={() => setReviewSection(gi)}
                                  className="flex items-center gap-1.5 shrink-0 text-caption font-medium px-3 py-1.5 rounded-full border transition-colors duration-200"
                                  style={{
                                    borderColor: active ? 'var(--coral)' : done ? 'var(--success)' : 'var(--mid-gray)',
                                    background: active ? 'var(--coral-50)' : '#fff',
                                    color: active ? 'var(--coral)' : done ? 'var(--success)' : 'var(--text-gray)',
                                  }}
                                >
                                  {done ? <Check size={13} /> : <span className="text-[11px] font-bold">{gi + 1}</span>}
                                  {group.label}
                                </button>
                              )
                            })}
                          </div>

                          {/* En-tête de la section courante */}
                          {(() => {
                            const groupDiffs = diffsByGroup(currentReviewGroup.id)
                            const reviewed = groupDiffs.filter(d => d.status === 'approved' || d.status === 'rejected').length
                            return (
                              <div className="flex items-center justify-between mt-4 mb-3">
                                <h2 className="text-subsection text-navy">{currentReviewGroup.label}</h2>
                                {groupDiffs.length > 0 && (
                                  <span className="text-small text-text-gray">{reviewed}/{groupDiffs.length} traité{groupDiffs.length > 1 ? 's' : ''}</span>
                                )}
                              </div>
                            )
                          })()}

                          {/* Bloc URLs éditables (section Informations) */}
                          {currentReviewGroup.id === 'informations' && (
                            <div className="bg-white border border-mid-gray rounded-xl p-4 mb-4">
                              <p className="text-[11px] font-bold uppercase tracking-wider text-text-gray mb-3">Liens</p>
                              <div className="flex flex-col gap-2">
                                {(links ?? []).map((link, li) => (
                                  <div key={link.id} className="flex items-center gap-2">
                                    <span className="text-caption font-medium text-navy w-[80px] shrink-0 truncate">{link.label}</span>
                                    <input
                                      value={link.url}
                                      onChange={(e) => setLinks(prev => (prev ?? []).map((l, i) => i === li ? { ...l, url: e.target.value } : l))}
                                      placeholder="https://…"
                                      className="flex-1 min-w-0 border border-mid-gray rounded-lg px-3 py-1.5 text-caption text-navy outline-none focus:border-coral transition-colors"
                                    />
                                    <button
                                      onClick={() => setLinks(prev => (prev ?? []).filter((_, i) => i !== li))}
                                      className="p-1.5 rounded-lg text-text-gray hover:text-error hover:bg-light-gray transition-colors shrink-0"
                                      title="Supprimer"
                                    >
                                      <X size={15} />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <div className="flex flex-wrap gap-2 mt-3">
                                {(['LinkedIn', 'Portfolio', 'GitHub', 'Lien personnalisé'] as const).map(label => (
                                  <button
                                    key={label}
                                    onClick={() => setLinks(prev => [...(prev ?? []), { id: `link-${Date.now()}`, label: label === 'Lien personnalisé' ? 'Lien' : label, url: '' }])}
                                    className="flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-mid-gray text-navy hover:bg-navy-50 transition-colors"
                                  >
                                    <span className="text-[13px]">+</span> {label}
                                  </button>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Cartes de diff de la section courante */}
                          <div className="flex flex-col gap-4">
                            {diffsByGroup(currentReviewGroup.id).map((diff, i) => (
                              <DiffCard
                                key={diff.id}
                                diff={diff}
                                index={i}
                                keywordCount={countAddedKeywords(diff)}
                                reason={diffReasonFor(diff)}
                                onApprove={() => setDiffStatus(diff.id, 'approved')}
                                onReject={() => setDiffStatus(diff.id, 'rejected')}
                                onModify={() => setDiffStatus(diff.id, 'modifying')}
                                onSaveModify={(text) => saveModifiedText(diff.id, text)}
                                onCancelModify={() => setDiffStatus(diff.id, 'pending')}
                              />
                            ))}
                            {diffsByGroup(currentReviewGroup.id).length === 0 && currentReviewGroup.id === 'informations' && (
                              <p className="text-caption text-text-gray">Aucune suggestion sur cette section — vérifiez simplement vos liens ci-dessus.</p>
                            )}
                          </div>

                          {/* Actions groupées de la section */}
                          {diffsByGroup(currentReviewGroup.id).some(d => d.status === 'pending' || d.status === 'modifying') && (
                            <div className="flex gap-2 mt-4">
                              <button
                                onClick={() => diffsByGroup(currentReviewGroup.id).forEach(d => setDiffStatus(d.id, 'approved'))}
                                className="flex items-center gap-1.5 text-caption px-3.5 py-2 rounded-lg border border-mid-gray text-navy hover:bg-navy-50 transition-colors"
                              >
                                <Check size={14} /> Tout accepter cette section
                              </button>
                              <button
                                onClick={() => diffsByGroup(currentReviewGroup.id).forEach(d => setDiffStatus(d.id, 'rejected'))}
                                className="flex items-center gap-1.5 text-caption px-3.5 py-2 rounded-lg border border-mid-gray text-text-gray hover:bg-light-gray transition-colors"
                              >
                                <X size={14} /> Tout rejeter
                              </button>
                            </div>
                          )}

                          {/* Navigation section */}
                          <div className="flex justify-between mt-8">
                            <motion.button
                              className="flex items-center gap-2 text-button text-navy px-5 py-3 rounded-xl hover:bg-navy-50 transition-colors duration-200"
                              onClick={() => reviewSection === 0 ? goToStep(2, -1) : setReviewSection(reviewSection - 1)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <ArrowLeft size={18} />
                              {reviewSection === 0 ? "Retour à l'offre" : 'Section précédente'}
                            </motion.button>
                            {reviewSection < visibleReviewGroups.length - 1 ? (
                              <motion.button
                                className="flex items-center gap-2 text-button text-white px-7 py-3.5 rounded-xl transition-all duration-200"
                                style={{ background: 'var(--coral)', opacity: reviewGroupReviewed(currentReviewGroup.id) ? 1 : 0.5 }}
                                disabled={!reviewGroupReviewed(currentReviewGroup.id)}
                                onClick={() => reviewGroupReviewed(currentReviewGroup.id) && setReviewSection(reviewSection + 1)}
                                whileHover={reviewGroupReviewed(currentReviewGroup.id) ? { scale: 1.02 } : {}}
                                whileTap={reviewGroupReviewed(currentReviewGroup.id) ? { scale: 0.98 } : {}}
                              >
                                Section suivante
                                <ChevronDown size={18} className="rotate-[-90deg]" />
                              </motion.button>
                            ) : (
                              <motion.button
                                className="flex items-center gap-2 text-button text-white px-8 py-4 rounded-xl transition-all duration-200"
                                style={{ background: 'var(--coral)', opacity: allDiffsReviewed ? 1 : 0.5 }}
                                disabled={!allDiffsReviewed}
                                onClick={() => allDiffsReviewed && goToStep(4, 1)}
                                whileHover={allDiffsReviewed ? { scale: 1.02, boxShadow: '0 4px 16px rgba(248,90,62,0.35)' } : {}}
                                whileTap={allDiffsReviewed ? { scale: 0.98 } : {}}
                              >
                                Continuer vers l&apos;éditeur
                                <ChevronDown size={18} className="rotate-[-90deg]" />
                              </motion.button>
                            )}
                          </div>
                        </div>

                        {/* ─── Colonne droite : aperçu CV live ─── */}
                        <div className="hidden lg:block sticky top-[84px]">
                          <p className="text-[11px] font-bold uppercase tracking-wider text-text-gray mb-2">Aperçu de votre CV</p>
                          <div
                            className="bg-white rounded-lg overflow-hidden border shadow-sm"
                            style={{ borderColor: '#E5E5E0', fontFamily: getFontFamily(), maxHeight: 'calc(100dvh - 130px)', overflowY: 'auto' }}
                          >
                            <div className="p-6" style={{ fontSize: '11px', lineHeight: 1.5, color: '#333' }}>
                              {/* En-tête */}
                              <div className="text-center mb-3 pb-3" style={{ borderBottom: `2px solid ${activeAccentHex}` }}>
                                <div className="font-bold" style={{ fontSize: '17px', color: '#111' }}>{fullName || 'Votre nom'}</div>
                                <div className="font-medium mt-0.5" style={{ fontSize: '11px', color: activeAccentHex }}>{cvTitle || 'Titre professionnel'}</div>
                                {contactLine.length > 0 && (
                                  <div className="mt-1" style={{ fontSize: '9px', color: '#777' }}>{contactLine.join('  |  ')}</div>
                                )}
                                {contactLinks.length > 0 && (
                                  <div className="mt-0.5" style={{ fontSize: '9px', color: activeAccentHex }}>{contactLinks.map(getContactLinkLabel).join('  ·  ')}</div>
                                )}
                              </div>
                              {/* Profil */}
                              {profileText && (
                                <div className="mb-3">
                                  <div className="font-bold uppercase mb-1" style={{ fontSize: '10px', color: '#1A1A1A', letterSpacing: '0.05em', borderBottom: '1px solid #E5E5E0', paddingBottom: 2 }}>Profil</div>
                                  <p style={{ fontSize: '10px', color: '#444' }}>{profileText}</p>
                                </div>
                              )}
                              {/* Expériences */}
                              {allExperiences.length > 0 && (
                                <div className="mb-3">
                                  <div className="font-bold uppercase mb-1.5" style={{ fontSize: '10px', color: '#1A1A1A', letterSpacing: '0.05em', borderBottom: '1px solid #E5E5E0', paddingBottom: 2 }}>Expérience professionnelle</div>
                                  {allExperiences.map(({ exp, origIndex }) => (
                                    <div key={origIndex} className="mb-2">
                                      <div className="flex justify-between items-baseline">
                                        <span className="font-bold" style={{ fontSize: '10.5px', color: '#111' }}>{exp.title}</span>
                                        <span className="shrink-0 ml-2" style={{ fontSize: '9px', color: '#888' }}>{exp.period}</span>
                                      </div>
                                      {(exp.company || exp.location) && (
                                        <div className="font-semibold" style={{ fontSize: '9.5px', color: '#555' }}>{[exp.company, exp.location].filter(Boolean).join(' — ')}</div>
                                      )}
                                      <ul className="mt-0.5">
                                        {exp.bullets.slice(0, 4).map((bullet, bi) => (
                                          <li key={bi} className="relative pl-2.5" style={{ fontSize: '9.5px', color: '#444' }}>
                                            <span className="absolute left-0" style={{ color: activeAccentHex }}>•</span>{bullet}
                                          </li>
                                        ))}
                                      </ul>
                                    </div>
                                  ))}
                                </div>
                              )}
                              {/* Compétences */}
                              {competencesText && (
                                <div className="mb-3">
                                  <div className="font-bold uppercase mb-1" style={{ fontSize: '10px', color: '#1A1A1A', letterSpacing: '0.05em', borderBottom: '1px solid #E5E5E0', paddingBottom: 2 }}>Compétences</div>
                                  <p style={{ fontSize: '9.5px', color: '#444' }}>{competencesText}</p>
                                </div>
                              )}
                              {/* Formation */}
                              {educationsDisplay.length > 0 && (
                                <div className="mb-3">
                                  <div className="font-bold uppercase mb-1" style={{ fontSize: '10px', color: '#1A1A1A', letterSpacing: '0.05em', borderBottom: '1px solid #E5E5E0', paddingBottom: 2 }}>Formation</div>
                                  {educationsDisplay.map((edu, ei) => (
                                    <div key={ei} className="mb-1">
                                      <div className="flex justify-between items-baseline">
                                        <span className="font-bold" style={{ fontSize: '10px', color: '#111' }}>{edu.degree}</span>
                                        <span className="shrink-0 ml-2" style={{ fontSize: '9px', color: '#888' }}>{edu.period}</span>
                                      </div>
                                      <div style={{ fontSize: '9px', color: '#666' }}>{[edu.school, edu.location].filter(Boolean).join(', ')}</div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </div>
                )}

                {/* ════════════════ STEP 4: CV Editor (cvize.co layout) ════════════════ */}
                {currentStep === 4 && (
                  <div className="h-[calc(100dvh-68px)] flex flex-col">
                    {/* ─── TOP BAR ─── */}
                    <div className="flex items-center justify-between px-5 py-2.5 bg-white border-b shrink-0" style={{ borderColor: '#E5E5E0' }}>
                      {/* Left: back arrow + CVFit */}
                      <div className="flex items-center gap-3">
                        <motion.button
                          className="flex items-center gap-1.5 text-caption px-2 py-1.5 rounded-lg hover:bg-gray-50 transition-colors duration-200"
                          onClick={() => goToStep(3, -1)}
                          whileHover={{ scale: 1.02 }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <ArrowLeft size={16} style={{ color: '#1A1A1A' }} />
                        </motion.button>
                        <span className="text-[15px] font-bold" style={{ color: '#1A1A1A', letterSpacing: '-0.01em' }}>CVFit</span>
                      </div>
                      {/* Center: CV name + pencil */}
                      <div className="flex items-center gap-2">
                        {isRenaming ? (
                          <input
                            autoFocus
                            className="text-[13px] font-medium border rounded-lg px-2 py-1 outline-none"
                            style={{ color: '#1A1A1A', borderColor: activeAccentHex, minWidth: 250 }}
                            value={cvName}
                            onChange={(e) => setCvName(e.target.value)}
                            onBlur={() => setIsRenaming(false)}
                            onKeyDown={(e) => { if (e.key === 'Enter') setIsRenaming(false) }}
                          />
                        ) : (
                          <span className="text-[13px] font-medium" style={{ color: '#1A1A1A' }}>{cvName}</span>
                        )}
                        <button
                          onClick={() => setIsRenaming(!isRenaming)}
                          className="p-1 rounded hover:bg-gray-100 transition-colors"
                        >
                          <Pencil size={13} style={{ color: '#888' }} />
                        </button>
                      </div>
                      {/* Right: save + reset */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={handleSaveEdits}
                          disabled={!activeGenerationId || saveStatus === 'saving'}
                          className="flex items-center gap-1.5 text-[12px] font-semibold px-3.5 py-1.5 rounded-lg text-white transition-colors disabled:opacity-50"
                          style={{ background: saveStatus === 'saved' ? '#10B981' : saveStatus === 'error' ? '#EF4444' : '#F85A3E' }}
                          title={activeGenerationId ? 'Enregistrer vos modifications' : 'Disponible apres une generation'}
                        >
                          {saveStatus === 'saving' ? <Loader2 size={14} className="animate-spin" /> : saveStatus === 'saved' ? <Check size={14} /> : <Save size={14} />}
                          {saveStatus === 'saving' ? 'Enregistrement…' : saveStatus === 'saved' ? 'Enregistré' : saveStatus === 'error' ? 'Erreur — réessayer' : 'Enregistrer'}
                        </button>
                        <button
                          onClick={handleRestart}
                          className="flex items-center gap-1.5 text-[12px] font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                          style={{ color: '#666' }}
                        >
                          <RotateCcw size={14} />
                          Réinitialiser
                        </button>
                      </div>
                    </div>

                    {/* ─── EDITOR BODY: 3 columns (empilees sur mobile) ─── */}
                    <div className="flex-1 flex flex-col lg:flex-row overflow-y-auto lg:overflow-hidden" style={{ background: '#F0EFEA' }}>

                      {/* ══════ LEFT COLUMN: Sections ══════ */}
                      <div className="w-full lg:w-[210px] lg:min-w-[210px] bg-white border-b lg:border-b-0 lg:border-r lg:overflow-y-auto shrink-0" style={{ borderColor: '#E5E5E0' }}>
                        <div className="py-4 px-3">
                          {/* Section items */}
                          <div className="flex flex-col gap-1">
                            {cvSections.map((section) => (
                              <div
                                key={section.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, section.id)}
                                onDragEnd={() => setDraggedSectionId(null)}
                                onDragOver={handleDragOver}
                                onDrop={(e) => handleDrop(e, section.id)}
                                className="flex items-center gap-2 px-2.5 py-2 rounded-lg cursor-move hover:bg-gray-50 transition-colors duration-150 group"
                                style={{
                                  opacity: draggedSectionId && draggedSectionId !== section.id ? 0.6 : 1,
                                  background: draggedSectionId === section.id ? '#FFF5F3' : undefined,
                                }}
                              >
                                <GripVertical size={14} style={{ color: '#bbb' }} className="shrink-0" />
                                <button
                                  onClick={() => toggleSectionVisibility(section.id)}
                                  className="shrink-0"
                                >
                                  {section.visible ? (
                                    <CheckCircle2 size={16} style={{ color: activeAccentHex }} />
                                  ) : (
                                    <Circle size={16} style={{ color: '#ccc' }} />
                                  )}
                                </button>
                                <span
                                  className="text-[12px] flex-1 truncate select-none"
                                  style={{ color: section.visible ? '#1A1A1A' : '#aaa', fontWeight: 500 }}
                                >
                                  {section.label}
                                </span>
                              </div>
                            ))}
                          </div>

                          <p className="mt-4 pt-3 text-[10px]" style={{ borderTop: '1px solid #F0EFEA', color: '#999' }}>
                            Glissez pour reordonner, cochez pour afficher ou masquer une section.
                          </p>
                        </div>
                      </div>

                      {/* ══════ CENTER COLUMN: Canvas ══════ */}
                      <div className="flex-1 min-w-0 lg:overflow-y-auto overflow-x-auto">
                        <div className="flex flex-col items-center py-5 px-4">

                          {/* Score ATS gauges (uniquement si calcules) */}
                          {atsScore !== null && atsScoreBefore !== null && (
                            <div className="mb-4 flex flex-col items-center gap-2">
                              <div className="flex items-center justify-center gap-4">
                                <AtsGauge
                                  value={atsScoreBefore}
                                  label="AVANT"
                                />
                                <div className="flex flex-col items-center px-2">
                                  <span className="text-[13px] font-bold" style={{ color: atsScore >= atsScoreBefore ? '#10B981' : '#EF4444' }}>
                                    {atsScore - atsScoreBefore >= 0 ? '+' : ''}{atsScore - atsScoreBefore}
                                  </span>
                                  <ArrowLeft size={14} className="rotate-180" style={{ color: atsScore >= atsScoreBefore ? '#10B981' : '#EF4444' }} />
                                </div>
                                <AtsGauge
                                  value={atsScore}
                                  label="MAINTENANT"
                                  isAfter
                                />
                              </div>
                              <p className="max-w-[520px] text-center text-[11px] leading-relaxed text-text-gray">
                                Score indicatif basé sur la correspondance entre l'offre et le CV. Il aide à prioriser les améliorations, sans garantir le résultat d'un ATS ou d'un recruteur.
                              </p>
                            </div>
                          )}

                          {/* A4 Canvas */}
                          <div className="flex justify-center w-full">
                            <div className="relative">
                              {/* page count badge : vert = 1 page, ambre = deborde */}
                              <div
                                className="absolute top-3 right-3 z-10 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                                style={{ background: previewPageCount > 1 ? '#F59E0B' : '#10B981', color: '#fff' }}
                              >
                                {previewPageCount} PAGE{previewPageCount > 1 ? 'S' : ''}
                              </div>

                              {/* lignes de saut de page */}
                              {pageHeightPx > 0 && previewPageCount > 1 && Array.from({ length: previewPageCount - 1 }).map((_, pi) => (
                                <div
                                  key={pi}
                                  className="absolute left-0 right-0 z-10 pointer-events-none"
                                  style={{ top: pageHeightPx * (pi + 1) }}
                                >
                                  <div style={{ borderTop: '2px dashed #F59E0B', opacity: 0.85 }} />
                                  <span
                                    className="absolute right-2 top-1 text-[9px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wide"
                                    style={{ background: '#FEF3C7', color: '#B45309' }}
                                  >
                                    Fin de page {pi + 1}
                                  </span>
                                </div>
                              ))}

                              <div
                                id="cv-canvas"
                                onBlur={handleCanvasBlur}
                                className={`bg-white overflow-hidden ${getDensiteClasses()}`}
                                style={{
                                  width: '210mm',
                                  minHeight: '297mm',
                                  maxWidth: '100%',
                                  display: 'flex',
                                  flexDirection: 'column',
                                  fontFamily: getFontFamily(),
                                  fontSize: `${getTailleTextePx()}pt`,
                                  padding: getMargesPadding(),
                                  lineHeight: getInterligneValue(),
                                  boxShadow: '0 4px 24px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)',
                                  borderRadius: 2,
                                  color: '#1A1A1A',
                                }}
                              >
                                {/* ─── Contact Header with Photo ─── */}
                                {cvSections.find(s => s.id === 'contact')?.visible && (
                                  <div
                                    style={{ order: getSectionOrder('contact'), marginBottom: getSectionSpacingPx() + 4, ...getHeaderRule() }}
                                    className={photoPosition === 'left' || photoPosition === 'right'
                                      ? 'flex items-center gap-4'
                                      : headerLeftAligned ? 'text-left' : 'text-center'}
                                  >
                                    {/* Photo: center (above name) or left */}
                                    {photoPreviewUrl && (photoPosition === 'center' || photoPosition === 'left') && (
                                      <div className={`${photoPosition === 'center' ? 'mx-auto mb-3' : 'shrink-0'}`}>
                                        <img
                                          src={photoPreviewUrl}
                                          alt="Photo de profil"
                                          className="object-cover"
                                          style={{
                                            width: getPhotoDim(photoPosition === 'center' ? 'center' : 'side'),
                                            height: getPhotoDim(photoPosition === 'center' ? 'center' : 'side'),
                                            borderRadius: photoRadius,
                                          }}
                                        />
                                      </div>
                                    )}
                                    {/* Photo: right */}
                                    {photoPreviewUrl && photoPosition === 'right' && (
                                      <div className="shrink-0 order-last">
                                        <img
                                          src={photoPreviewUrl}
                                          alt="Photo de profil"
                                          className="object-cover"
                                          style={{ width: getPhotoDim('side'), height: getPhotoDim('side'), borderRadius: photoRadius }}
                                        />
                                      </div>
                                    )}
                                    {/* Text info */}
                                    <div className={photoPosition === 'left' || photoPosition === 'right' ? 'text-left flex-1' : ''}>
                                      <h1
                                        className="font-bold tracking-tight mb-1"
                                        style={getNameStyle()}
                                        suppressContentEditableWarning
                                        contentEditable
                                        data-pdf="name"
                                        data-ekey="name"
                                      >
                                        {ov('name', fullName || 'Votre nom')}
                                      </h1>
                                      <p
                                        className="font-medium mb-2.5"
                                        style={{
                                          fontSize: '0.95em',
                                          color: titleColor,
                                        }}
                                        suppressContentEditableWarning
                                        contentEditable
                                        data-pdf="title"
                                        data-ekey="title"
                                      >
                                        {ov('title', cvTitle || 'Votre titre de poste')}
                                      </p>
                                      {contactLine.length > 0 && (
                                        <div
                                          className={`flex flex-wrap gap-x-2 gap-y-0.5 ${headerLeftAligned ? '' : 'justify-center'}`}
                                          style={{ fontSize: '0.78em', color: '#666' }}
                                          data-pdf="contact"
                                        >
                                          {contactLine.map((item, ci) => (
                                            <span key={item}>
                                              {ci > 0 && <span style={{ color: '#ccc' }}>|&nbsp;</span>}
                                              {item}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      {contactLinks.length > 0 && (
                                        <div
                                          className={`flex flex-wrap gap-x-3 mt-1 ${headerLeftAligned ? '' : 'justify-center'}`}
                                          style={{ fontSize: '0.75em' }}
                                          data-pdf="contact"
                                        >
                                          {contactLinks.map(link => (
                                            <a key={link} href={ensureHttps(link)} target="_blank" rel="noopener noreferrer" style={{ color: activeAccentHex, fontWeight: 500, textDecoration: 'none' }}>
                                              {getContactLinkLabel(link)}
                                            </a>
                                          ))}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}

                                {/* ─── Profil ─── */}
                                {cvSections.find(s => s.id === 'profil')?.visible && (
                                  <div style={{ order: getSectionOrder('profil'), marginBottom: getSectionSpacingPx() }}>
                                    <h3
                                      className="font-bold uppercase mb-2"
                                      style={getSectionTitleStyle()}
                                      data-pdf="section"
                                    >
                                      Profil
                                    </h3>
                                    <p
                                      style={{ fontSize: '0.88em', color: '#444', lineHeight: getInterligneValue() }}
                                      suppressContentEditableWarning
                                      contentEditable
                                      data-pdf="para"
                                      data-ekey="profil"
                                    >
                                      {ov('profil', profileText)}
                                    </p>
                                  </div>
                                )}

                                {/* ─── Experience ─── */}
                                {cvSections.find(s => s.id === 'experience')?.visible && (
                                  <div style={{ order: getSectionOrder('experience'), marginBottom: getSectionSpacingPx() }}>
                                    <h3
                                      className="font-bold uppercase mb-2.5"
                                      style={getSectionTitleStyle()}
                                      data-pdf="section"
                                    >
                                      Expérience professionnelle
                                    </h3>
                                    {allExperiences.map(({ exp, origIndex }, expIndex) => (
                                      <div key={origIndex} className="mb-3 relative group">
                                        {/* fleches de reordonnancement (preview uniquement) */}
                                        <div
                                          contentEditable={false}
                                          className="absolute -right-1 top-0 z-10 flex gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity"
                                        >
                                          <button
                                            onClick={() => moveExperience(expIndex, -1)}
                                            disabled={expIndex === 0}
                                            className="p-0.5 rounded bg-white border border-mid-gray text-text-gray hover:text-navy disabled:opacity-30"
                                            title="Monter"
                                          >
                                            <ArrowUp size={11} />
                                          </button>
                                          <button
                                            onClick={() => moveExperience(expIndex, 1)}
                                            disabled={expIndex === allExperiences.length - 1}
                                            className="p-0.5 rounded bg-white border border-mid-gray text-text-gray hover:text-navy disabled:opacity-30"
                                            title="Descendre"
                                          >
                                            <ArrowDown size={11} />
                                          </button>
                                        </div>
                                        <div
                                          className={template === 'chronologique' ? 'flex items-baseline gap-3 mb-0.5' : 'flex justify-between items-baseline mb-0.5'}
                                          data-pdf="row"
                                          data-row-variant={template === 'chronologique' ? 'chrono' : 'standard'}
                                        >
                                          {template === 'chronologique' && (
                                            <span
                                              className="shrink-0 font-medium"
                                              style={{ fontSize: '0.8em', color: activeAccentHex, minWidth: '5.5em' }}
                                              suppressContentEditableWarning
                                              contentEditable
                                              data-row-part="period"
                                              data-ekey={`exp-${origIndex}-period`}
                                            >
                                              {ov(`exp-${origIndex}-period`, exp.period)}
                                            </span>
                                          )}
                                          <h4
                                            className="font-bold"
                                            style={{ fontSize: '0.92em', color: '#111' }}
                                            suppressContentEditableWarning
                                            contentEditable
                                            data-row-part="title"
                                            data-ekey={`exp-${origIndex}-title`}
                                          >
                                            {ov(`exp-${origIndex}-title`, exp.title)}
                                          </h4>
                                          {template !== 'chronologique' && (
                                            <span
                                              className="shrink-0 ml-3 font-medium"
                                              style={{ fontSize: '0.8em', color: '#888' }}
                                              suppressContentEditableWarning
                                              contentEditable
                                              data-row-part="period"
                                              data-ekey={`exp-${origIndex}-period`}
                                            >
                                              {ov(`exp-${origIndex}-period`, exp.period)}
                                            </span>
                                          )}
                                        </div>
                                        {(exp.company || exp.location) && (
                                          <p
                                            className="font-semibold mb-1.5"
                                            style={{ fontSize: '0.85em', color: '#555' }}
                                            suppressContentEditableWarning
                                            contentEditable
                                            data-pdf="sub"
                                            data-ekey={`exp-${origIndex}-company`}
                                          >
                                            {ov(`exp-${origIndex}-company`, [exp.company, exp.location].filter(Boolean).join(' — '))}
                                          </p>
                                        )}
                                        <ul className="space-y-1">
                                          {exp.bullets.map((bullet, bi) => (
                                            <li
                                              key={bi}
                                              className="pl-3 relative"
                                              style={{ fontSize: '0.84em', color: '#444', lineHeight: getInterligneValue() }}
                                              suppressContentEditableWarning
                                              contentEditable
                                              data-pdf="bullet"
                                              data-ekey={`exp-${origIndex}-bullet-${bi}`}
                                            >
                                              <span
                                                className="absolute left-0"
                                                style={{ color: activeAccentHex }}
                                              >
                                                •
                                              </span>
                                              {ov(`exp-${origIndex}-bullet-${bi}`, bullet)}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* ─── Competences ─── */}
                                {cvSections.find(s => s.id === 'competences')?.visible && (
                                  <div style={{ order: getSectionOrder('competences'), marginBottom: getSectionSpacingPx() }}>
                                    <h3
                                      className="font-bold uppercase mb-2.5"
                                      style={getSectionTitleStyle()}
                                      data-pdf="section"
                                    >
                                      Compétences
                                    </h3>
                                    <p
                                      style={{ fontSize: '0.84em', color: '#444', lineHeight: getInterligneValue(), background: 'transparent', padding: 0 }}
                                      suppressContentEditableWarning
                                      contentEditable
                                      data-pdf="para"
                                      data-ekey="competences"
                                    >
                                      {ov('competences', competencesText)}
                                    </p>
                                  </div>
                                )}

                                {/* ─── Formation ─── */}
                                {cvSections.find(s => s.id === 'formation')?.visible && (
                                  <div style={{ order: getSectionOrder('formation'), marginBottom: getSectionSpacingPx() }}>
                                    <h3
                                      className="font-bold uppercase mb-2.5"
                                      style={getSectionTitleStyle()}
                                      data-pdf="section"
                                    >
                                      Formation
                                    </h3>
                                    {formationText ? (
                                      <div
                                        style={{ fontSize: '0.84em', color: '#444', lineHeight: getInterligneValue(), whiteSpace: 'pre-line' }}
                                        suppressContentEditableWarning
                                        contentEditable
                                        data-pdf="para"
                                        data-ekey="formation-text"
                                      >
                                        {ov('formation-text', formationText)}
                                      </div>
                                    ) : educationsDisplay.map((edu, eduIndex) => (
                                      <div key={eduIndex} className="mb-2">
                                        <div className="flex justify-between items-baseline mb-0.5" data-pdf="row" data-row-variant="standard">
                                          <h4
                                            className="font-bold"
                                            style={{ fontSize: '0.9em', color: '#111' }}
                                            suppressContentEditableWarning
                                            contentEditable
                                            data-row-part="title"
                                            data-ekey={`edu-${eduIndex}-degree`}
                                          >
                                            {ov(`edu-${eduIndex}-degree`, edu.degree)}
                                          </h4>
                                          <span
                                            className="shrink-0 ml-3 font-medium"
                                            style={{ fontSize: '0.8em', color: '#888' }}
                                            suppressContentEditableWarning
                                            contentEditable
                                            data-row-part="period"
                                            data-ekey={`edu-${eduIndex}-period`}
                                          >
                                            {ov(`edu-${eduIndex}-period`, edu.period)}
                                          </span>
                                        </div>
                                        <p
                                          style={{ fontSize: '0.84em', color: '#555' }}
                                          suppressContentEditableWarning
                                          contentEditable
                                          data-pdf="sub"
                                          data-ekey={`edu-${eduIndex}-school`}
                                        >
                                          {ov(`edu-${eduIndex}-school`, [edu.school, edu.location].filter(Boolean).join(', '))}
                                        </p>
                                        {edu.description && (
                                          <p
                                            className="pl-3 relative mt-0.5"
                                            style={{ fontSize: '0.82em', color: '#444', lineHeight: getInterligneValue() }}
                                            suppressContentEditableWarning
                                            contentEditable
                                            data-pdf="bullet"
                                            data-ekey={`edu-${eduIndex}-desc`}
                                          >
                                            <span className="absolute left-0" style={{ color: activeAccentHex }}>•</span>
                                            {ov(`edu-${eduIndex}-desc`, edu.description)}
                                          </p>
                                        )}
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* ─── Langues ─── */}
                                {cvSections.find(s => s.id === 'langues')?.visible && (
                                  <div style={{ order: getSectionOrder('langues'), marginBottom: getSectionSpacingPx() }}>
                                    <h3
                                      className="font-bold uppercase mb-2.5"
                                      style={getSectionTitleStyle()}
                                      data-pdf="section"
                                    >
                                      Langues
                                    </h3>
                                    {languesLines.map((rawLine, li) => {
                                      const line = ov(`langue-${li}`, rawLine)
                                      const pair = splitLabelLine(line)
                                      return (
                                        <div
                                          key={li}
                                          className="pl-3 relative mb-1"
                                          style={{ fontSize: '0.84em', color: '#444', lineHeight: getInterligneValue() }}
                                          suppressContentEditableWarning
                                          contentEditable
                                          data-pdf="bullet"
                                          data-ekey={`langue-${li}`}
                                        >
                                          <span className="absolute left-0" style={{ color: activeAccentHex }}>•</span>
                                          {pair ? (
                                            <>
                                              <span style={{ fontWeight: 700, color: '#111' }}>{pair.label}</span>
                                              {' : '}
                                              {pair.rest}
                                            </>
                                          ) : line}
                                        </div>
                                      )
                                    })}
                                  </div>
                                )}

                                {/* ─── Certifications ─── */}
                                {cvSections.find(s => s.id === 'certifications')?.visible && (
                                  <div style={{ order: getSectionOrder('certifications'), marginBottom: getSectionSpacingPx() }}>
                                    <h3
                                      className="font-bold uppercase mb-2.5"
                                      style={getSectionTitleStyle()}
                                      data-pdf="section"
                                    >
                                      Certifications
                                    </h3>
                                    {certificationsText ? (
                                      <div
                                        style={{ fontSize: '0.84em', color: '#444', lineHeight: getInterligneValue(), whiteSpace: 'pre-line' }}
                                        suppressContentEditableWarning
                                        contentEditable
                                        data-pdf="para"
                                      >
                                        {certificationsText}
                                      </div>
                                    ) : (
                                      <ul className="space-y-1">
                                        {certificationsDisplay.map((cert, ci) => (
                                          <li
                                            key={ci}
                                            className="pl-3 relative"
                                            style={{ fontSize: '0.84em', color: '#444' }}
                                            suppressContentEditableWarning
                                            contentEditable
                                            data-pdf="bullet"
                                            data-ekey={`cert-${ci}`}
                                          >
                                            <span
                                              className="absolute left-0"
                                              style={{ color: activeAccentHex }}
                                            >
                                              •
                                            </span>
                                            {ov(`cert-${ci}`, cert)}
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>
                                )}

                                {/* ─── Passions / Centres d'interet (2 colonnes) ─── */}
                                {cvSections.find(s => s.id === 'passions')?.visible && passionsLines.length > 0 && (
                                  <div style={{ order: getSectionOrder('passions'), marginBottom: getSectionSpacingPx() }}>
                                    <h3
                                      className="font-bold uppercase mb-2.5"
                                      style={getSectionTitleStyle()}
                                      data-pdf="section"
                                    >
                                      Passions
                                    </h3>
                                    <div className="grid grid-cols-2 gap-x-6 gap-y-2">
                                      {passionsLines.map((rawLine, li) => {
                                        const line = ov(`passion-${li}`, rawLine)
                                        const pair = splitLabelLine(line)
                                        return (
                                          <div
                                            key={li}
                                            style={{ fontSize: '0.84em', color: '#444', lineHeight: getInterligneValue() }}
                                            suppressContentEditableWarning
                                            contentEditable
                                            data-pdf="para"
                                            data-ekey={`passion-${li}`}
                                          >
                                            {pair ? (
                                              <>
                                                <span style={{ fontWeight: 700, color: '#111' }}>{pair.label}</span>
                                                {' : '}
                                                {pair.rest}
                                              </>
                                            ) : line}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Alerte debordement + ajustement auto */}
                          {previewPageCount > 1 && (
                            <div
                              className="mt-4 flex flex-wrap items-center gap-3 rounded-lg border px-3.5 py-2.5 text-[12px] font-medium"
                              style={{ borderColor: '#FDE68A', background: '#FFFBEB', color: '#B45309' }}
                            >
                              <span className="flex items-center gap-2">
                                Votre CV déborde sur {previewPageCount} pages.
                              </span>
                              <button
                                onClick={fitToOnePage}
                                disabled={isFitting}
                                className="flex items-center gap-1.5 text-[11px] font-semibold px-3 py-1.5 rounded-lg text-white transition-all duration-200 disabled:opacity-60"
                                style={{ background: '#B45309' }}
                              >
                                {isFitting ? <Loader2 size={13} className="animate-spin" /> : <Minimize2 size={13} />}
                                {isFitting ? 'Ajustement…' : 'Ajuster sur 1 page'}
                              </button>
                            </div>
                          )}
                          {fitSnapshot && (
                            <div className="mt-3 flex justify-center">
                              <button
                                onClick={undoFitToOnePage}
                                className="flex items-center gap-1.5 text-[12px] font-semibold px-3 py-1.5 rounded-lg border bg-white transition-all duration-200 hover:bg-gray-50"
                                style={{ borderColor: '#E5E5E0', color: '#444' }}
                              >
                                <Undo2 size={13} />
                                Annuler l’ajustement 1 page
                              </button>
                            </div>
                          )}

                          {/* Download buttons */}
                          <div className="mt-5 flex flex-wrap items-center justify-center gap-3">
                            <motion.button
                              className="flex items-center gap-2 text-[13px] font-semibold text-white px-8 py-3.5 rounded-full transition-all duration-200 shadow-lg"
                              style={{ background: '#F85A3E' }}
                              onClick={handleDownloadPdf}
                              whileHover={{ scale: 1.03, boxShadow: '0 8px 24px rgba(248,90,62,0.4)' }}
                              whileTap={{ scale: 0.97 }}
                            >
                              <Download size={16} />
                              Télécharger en PDF
                            </motion.button>
                            <motion.button
                              className="flex items-center gap-2 text-[13px] font-semibold px-6 py-3.5 rounded-full border-2 bg-white transition-all duration-200"
                              style={{ borderColor: '#F85A3E', color: '#F85A3E' }}
                              onClick={handleDownloadDocx}
                              whileHover={{ scale: 1.03 }}
                              whileTap={{ scale: 0.97 }}
                            >
                              <Download size={16} />
                              DOCX
                            </motion.button>
                          </div>

                        </div>
                      </div>

                      {/* ══════ RIGHT COLUMN: Formatting ══════ */}
                      <div className="w-full lg:w-[280px] lg:min-w-[280px] bg-white border-t lg:border-t-0 lg:border-l lg:overflow-y-auto shrink-0" style={{ borderColor: '#E5E5E0' }}>
                        <div className="py-4 px-4 space-y-5">

                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <h3 className="text-[13px] font-bold" style={{ color: '#1A1A1A' }}>Mise en forme</h3>
                            <div className="flex items-center gap-2">
                              <button
                                className="flex items-center gap-1 text-[11px] hover:underline"
                                style={{ color: '#888' }}
                                onClick={handleRestart}
                              >
                                <RotateCcw size={13} />
                                Réinitialiser
                              </button>
                            </div>
                          </div>

                          <button
                            onClick={translatePreviewToEnglish}
                            disabled={!activeGenerationId || isTranslatingEn}
                            className="w-full flex items-center justify-center gap-2 text-[12px] font-semibold px-3 py-2.5 rounded-lg border transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            style={{ borderColor: '#E5E5E0', color: '#1A1A1A', background: '#fff' }}
                            title={!activeGenerationId ? 'Disponible après une optimisation IA' : 'Traduire le CV en anglais selon le contexte de l’offre'}
                          >
                            {isTranslatingEn ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />}
                            {isTranslatingEn ? 'Traduction…' : 'Traduire en anglais'}
                          </button>

                          {/* ─── MODELE : apercus visuels ─── */}
                          <div>
                            <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#888' }}>Modele</h4>
                            <div className="flex gap-2.5 overflow-x-auto pb-2 -mx-1 px-1">
                              {([
                                { id: 'pro' as Template, label: 'Pro' },
                                { id: 'moderne' as Template, label: 'Moderne' },
                                { id: 'essentiel' as Template, label: 'Épuré' },
                                { id: 'prestige' as Template, label: 'Prestige' },
                                { id: 'chronologique' as Template, label: 'Chronologique' },
                              ]).map(tpl => (
                                <button
                                  key={tpl.id}
                                  onClick={() => setTemplate(tpl.id)}
                                  className="flex flex-col items-center gap-1.5 shrink-0 outline-none"
                                >
                                  <div
                                    className="rounded-lg overflow-hidden border-2 transition-all duration-200"
                                    style={{
                                      borderColor: template === tpl.id ? activeAccentHex : '#E5E5E0',
                                      boxShadow: template === tpl.id
                                        ? `0 0 0 1px ${activeAccentHex}, 0 4px 12px rgba(0,0,0,0.08)`
                                        : '0 1px 3px rgba(0,0,0,0.05)',
                                    }}
                                  >
                                    <TemplateThumb id={tpl.id} accent={activeAccentHex} />
                                  </div>
                                  <span
                                    className="text-[11px] font-medium transition-colors duration-200"
                                    style={{ color: template === tpl.id ? activeAccentHex : '#888' }}
                                  >
                                    {tpl.label}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* ─── POLICE ─── */}
                          <div>
                            <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#888' }}>Police</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {([
                                { id: 'Roboto' as Police, label: 'Roboto' },
                                { id: 'Inter' as Police, label: 'Inter' },
                                { id: 'Open Sans' as Police, label: 'Open Sans' },
                                { id: 'Lato' as Police, label: 'Lato' },
                                { id: 'Montserrat' as Police, label: 'Montserrat' },
                                { id: 'Merriweather' as Police, label: 'Merriweather' },
                                { id: 'Playfair' as Police, label: 'Playfair Display' },
                              ]).map(f => (
                                <button
                                  key={f.id}
                                  onClick={() => setPolice(f.id)}
                                  className="py-2 px-2 rounded-lg border-2 transition-all duration-200 outline-none text-[13px] text-center"
                                  style={{
                                    borderColor: police === f.id ? activeAccentHex : '#E5E5E0',
                                    background: police === f.id ? '#FFF5F3' : '#fff',
                                    color: police === f.id ? '#1A1A1A' : '#666',
                                    fontFamily: FONT_FAMILY_MAP[f.id],
                                  }}
                                >
                                  {f.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* ─── TAILLE DU TEXTE ─── */}
                          <div>
                            <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#888' }}>Taille du texte</h4>
                            <div className="flex gap-1.5">
                              {([10, 10.5, 11, 12, 13] as TailleTexte[]).map((size) => (
                                <button
                                  key={size}
                                  onClick={() => setTailleTexte(size)}
                                  className="flex-1 py-2 rounded-lg border-2 transition-all duration-200 outline-none text-[11px] font-medium text-center"
                                  style={{
                                    borderColor: tailleTexte === size ? activeAccentHex : '#E5E5E0',
                                    background: tailleTexte === size ? '#FFF5F3' : '#fff',
                                    color: tailleTexte === size ? '#1A1A1A' : '#888',
                                  }}
                                >
                                  {size}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* ─── DENSITE : mini-pages ─── */}
                          <div>
                            <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#888' }}>Densité</h4>
                            <div className="flex gap-2.5 flex-wrap">
                              {([
                                { id: 'ultra-compact' as Densite, label: 'Ultra-compact', lines: 8 },
                                { id: 'compact' as Densite, label: 'Compact', lines: 6 },
                                { id: 'normal' as Densite, label: 'Normal', lines: 5 },
                                { id: 'aere' as Densite, label: 'Aéré', lines: 3 },
                              ]).map(d => (
                                <button
                                  key={d.id}
                                  onClick={() => setDensite(d.id)}
                                  className="flex flex-col items-center gap-1 outline-none"
                                  title={d.label}
                                >
                                  <div
                                    className="rounded-lg p-1 border-2 transition-all duration-200"
                                    style={{
                                      borderColor: densite === d.id ? activeAccentHex : 'transparent',
                                      background: densite === d.id ? '#FFF5F3' : 'transparent',
                                    }}
                                  >
                                    <DensiteThumb lines={d.lines} active={densite === d.id} accent={activeAccentHex} />
                                  </div>
                                  <span
                                    className="text-[10px] font-medium transition-colors duration-200"
                                    style={{ color: densite === d.id ? activeAccentHex : '#999' }}
                                  >
                                    {d.label}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* ─── INTERLIGNE ─── */}
                          <div>
                            <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#888' }}>Interligne</h4>
                            <div className="grid grid-cols-3 gap-1.5">
                              {([
                                { id: 'serre' as Interligne, label: 'Serre', lines: 3 },
                                { id: 'normal' as Interligne, label: 'Norm.', lines: 4 },
                                { id: 'espace' as Interligne, label: 'Espace', lines: 5 },
                              ]).map(item => (
                                <button
                                  key={item.id}
                                  onClick={() => setInterligne(item.id)}
                                  className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg border-2 transition-all duration-200 outline-none"
                                  style={{
                                    borderColor: interligne === item.id ? activeAccentHex : '#E5E5E0',
                                    background: interligne === item.id ? '#FFF5F3' : '#fff',
                                  }}
                                >
                                  <div className="flex flex-col gap-[3px]">
                                    {Array.from({ length: item.lines }).map((_, li) => (
                                      <div
                                        key={li}
                                        className="w-6 rounded-sm"
                                        style={{
                                          height: 2,
                                          background: interligne === item.id ? activeAccentHex : '#ccc',
                                        }}
                                      />
                                    ))}
                                  </div>
                                  <span
                                    className="text-[9px] font-medium mt-1"
                                    style={{ color: interligne === item.id ? '#1A1A1A' : '#aaa' }}
                                  >
                                    {item.label}
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* ─── COULEUR ACCENT ─── */}
                          <div>
                            <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#888' }}>Couleur accent</h4>
                            <div className="flex gap-3">
                              {([
                                { id: 'noir' as AccentColor, hex: '#1A1A1A' },
                                { id: 'coral' as AccentColor, hex: '#F85A3E' },
                                { id: 'bleu' as AccentColor, hex: '#3B82F6' },
                                { id: 'vert' as AccentColor, hex: '#10B981' },
                                { id: 'violet' as AccentColor, hex: '#8B5CF6' },
                              ]).map(c => (
                                <button
                                  key={c.id}
                                  onClick={() => setAccentColor(c.id)}
                                  className="transition-all duration-200 outline-none"
                                  title={c.id}
                                >
                                  <div
                                    className="w-7 h-7 rounded-full"
                                    style={{
                                      background: c.hex,
                                      boxShadow: accentColor === c.id
                                        ? `0 0 0 2px #fff, 0 0 0 4px ${c.hex}`
                                        : '0 0 0 2px transparent',
                                    }}
                                  />
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* ─── Photo de profil ─── */}
                          <div className="py-1">
                            <p className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#999' }}>Photo de profil</p>
                            {/* Position selector */}
                            <div className="flex gap-1 mb-2">
                              {[
                                { id: 'none', label: 'Sans' },
                                { id: 'center', label: 'Haut' },
                                { id: 'left', label: 'Gauche' },
                                { id: 'right', label: 'Droite' },
                              ].map((pos) => (
                                <button
                                  key={pos.id}
                                  onClick={() => setPhotoPosition(pos.id as 'none' | 'left' | 'center' | 'right')}
                                  className="flex-1 text-[10px] font-medium py-1.5 rounded-lg border transition-all duration-200"
                                  style={{
                                    borderColor: photoPosition === pos.id ? activeAccentHex : '#E5E5E5',
                                    color: photoPosition === pos.id ? activeAccentHex : '#888',
                                    background: photoPosition === pos.id ? `${activeAccentHex}10` : '#fff',
                                  }}
                                >
                                {pos.label}
                              </button>
                              ))}
                            </div>
                            <div
                              {...getPhotoRootProps()}
                              className="border border-dashed border-mid-gray rounded-lg p-2 text-center cursor-pointer hover:border-coral transition-colors"
                            >
                              <input {...getPhotoInputProps()} />
                              {photoPreviewUrl ? (
                                <div className="flex items-center gap-2 justify-center">
                                  <img src={photoPreviewUrl} alt="Preview" className="w-8 h-8 rounded-full object-cover" />
                                  <span className="text-[10px] text-text-gray">Changer la photo</span>
                                </div>
                              ) : (
                                <span className="text-[10px] text-text-gray">Ajouter une photo</span>
                              )}
                            </div>
                            {photoPreviewUrl && photoPosition === 'none' && (
                              <p className="mt-1.5 text-[10px]" style={{ color: '#999' }}>
                                Choisissez haut, gauche ou droite pour l'afficher.
                              </p>
                            )}
                            {photoPreviewUrl && photoPosition !== 'none' && (
                              <div className="mt-2 flex gap-3">
                                {/* Taille */}
                                <div className="flex-1">
                                  <p className="text-[10px] font-medium mb-1" style={{ color: '#999' }}>Taille</p>
                                  <div className="flex gap-1">
                                    {([
                                      { id: 's' as const, label: 'S' },
                                      { id: 'm' as const, label: 'M' },
                                      { id: 'l' as const, label: 'L' },
                                    ]).map(size => (
                                      <button
                                        key={size.id}
                                        onClick={() => setPhotoSize(size.id)}
                                        className="flex-1 text-[10px] font-semibold py-1.5 rounded-lg border transition-all duration-200"
                                        style={{
                                          borderColor: photoSize === size.id ? activeAccentHex : '#E5E5E5',
                                          color: photoSize === size.id ? activeAccentHex : '#888',
                                          background: photoSize === size.id ? `${activeAccentHex}10` : '#fff',
                                        }}
                                      >
                                        {size.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                                {/* Forme */}
                                <div className="flex-1">
                                  <p className="text-[10px] font-medium mb-1" style={{ color: '#999' }}>Forme</p>
                                  <div className="flex gap-1">
                                    {([
                                      { id: 'ronde' as const, label: 'Ronde' },
                                      { id: 'carree' as const, label: 'Carrée' },
                                    ]).map(shape => (
                                      <button
                                        key={shape.id}
                                        onClick={() => setPhotoShape(shape.id)}
                                        className="flex-1 text-[10px] font-medium py-1.5 rounded-lg border transition-all duration-200"
                                        style={{
                                          borderColor: photoShape === shape.id ? activeAccentHex : '#E5E5E5',
                                          color: photoShape === shape.id ? activeAccentHex : '#888',
                                          background: photoShape === shape.id ? `${activeAccentHex}10` : '#fff',
                                        }}
                                      >
                                        {shape.label}
                                      </button>
                                    ))}
                                  </div>
                                </div>
                              </div>
                            )}
                          </div>

                          {/* ─── ESPACEMENT DES SECTIONS ─── */}
                          <div>
                            <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#888' }}>Espacement des sections</h4>
                            <div className="grid grid-cols-3 gap-1.5">
                              {([
                                { id: 'serre' as const, label: 'Serré' },
                                { id: 'normal' as const, label: 'Normal' },
                                { id: 'aere' as const, label: 'Aéré' },
                              ]).map(spacing => (
                                <button
                                  key={spacing.id}
                                  onClick={() => setSectionSpacing(spacing.id)}
                                  className="py-2 px-1 rounded-lg border-2 transition-all duration-200 outline-none text-[11px] font-medium text-center"
                                  style={{
                                    borderColor: sectionSpacing === spacing.id ? activeAccentHex : '#E5E5E0',
                                    background: sectionSpacing === spacing.id ? '#FFF5F3' : '#fff',
                                    color: sectionSpacing === spacing.id ? '#1A1A1A' : '#888',
                                  }}
                                >
                                  {spacing.label}
                                </button>
                              ))}
                            </div>
                          </div>

                          {/* ─── MARGES ─── */}
                          <div>
                            <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#888' }}>Marges</h4>
                            <div className="grid grid-cols-3 gap-1.5">
                              {([
                                { id: 'etroites' as Marges, label: 'Étroites' },
                                { id: 'normales' as Marges, label: 'Normales' },
                                { id: 'larges' as Marges, label: 'Larges' },
                              ]).map(m => (
                                <button
                                  key={m.id}
                                  onClick={() => setMarges(m.id)}
                                  className="py-2 px-1 rounded-lg border-2 transition-all duration-200 outline-none text-[11px] font-medium text-center"
                                  style={{
                                    borderColor: marges === m.id ? activeAccentHex : '#E5E5E0',
                                    background: marges === m.id ? '#FFF5F3' : '#fff',
                                    color: marges === m.id ? '#1A1A1A' : '#888',
                                  }}
                                >
                                  {m.label}
                                </button>
                              ))}
                            </div>
                          </div>

                        </div>
                      </div>

                    </div>
                  </div>
                )}

              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>
    </div>
  )
}

/* ════════════════════════════════════════════════════════════
   Diff Card Sub-Component
   ════════════════════════════════════════════════════════════ */
function DiffCard({
  diff,
  index,
  onApprove,
  onReject,
  onModify,
  onSaveModify,
  onCancelModify,
  keywordCount = 0,
  reason,
}: {
  diff: DiffItem
  index: number
  onApprove: () => void
  onReject: () => void
  onModify: () => void
  onSaveModify: (text: string) => void
  onCancelModify: () => void
  keywordCount?: number
  reason?: string
}) {
  const [editText, setEditText] = useState(diff.modifiedText || diff.apres)

  const borderColor = diff.status === 'approved' ? '#10B981' : diff.status === 'rejected' ? '#EF4444' : 'transparent'
  const opacity = diff.status === 'rejected' ? 0.5 : 1

  useEffect(() => {
    setEditText(diff.modifiedText || diff.apres)
  }, [diff.modifiedText, diff.apres])

  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.08, duration: 0.35, ease: easeOutExpo }}
      className="bg-white border border-mid-gray rounded-xl overflow-hidden transition-all duration-300"
      style={{
        borderLeftWidth: 4,
        borderLeftColor: borderColor,
        opacity,
      }}
    >
      {/* Card header */}
      <div className="px-5 py-3 flex items-center justify-between gap-2" style={{ background: 'var(--off-white)' }}>
        <h4 className="text-caption font-bold uppercase tracking-wider truncate" style={{ color: 'var(--navy)' }}>
          {diff.section}
        </h4>
        {keywordCount > 0 && diff.status !== 'rejected' && (
          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full shrink-0" style={{ background: '#D1FAE5', color: '#047857' }}>
            +{keywordCount} mot{keywordCount > 1 ? 's' : ''}-clé{keywordCount > 1 ? 's' : ''}
          </span>
        )}
        {diff.status === 'approved' && (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: '#D1FAE5', color: '#10B981' }}>
            Approuve
          </span>
        )}
        {diff.status === 'rejected' && (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: '#FEE2E2', color: '#EF4444' }}>
            Rejete
          </span>
        )}
        {diff.status === 'modifying' && (
          <span className="text-[10px] font-semibold px-2.5 py-1 rounded-full" style={{ background: 'var(--coral-50)', color: 'var(--coral)' }}>
            Modification…
          </span>
        )}
      </div>

      {/* Card body */}
      <div className="px-5 py-4">
        {/* Before */}
        <div className="mb-3">
          <p className="text-[10px] font-bold uppercase tracking-wider text-text-gray mb-1.5">Avant</p>
          <div className="bg-light-gray rounded-lg p-3 text-caption" style={{ color: 'var(--text-gray)', background: 'var(--off-white)' }}>
            {diff.avant.split('\n').map((line, i) => (
              <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
            ))}
          </div>
        </div>

        {/* After */}
        <div className="mb-4">
          <p className="text-[10px] font-bold uppercase tracking-wider mb-1.5" style={{ color: 'var(--coral)' }}>Apres</p>
          {diff.status === 'modifying' ? (
            <textarea
              value={editText}
              onChange={(e) => setEditText(e.target.value)}
              className="w-full bg-white border-2 rounded-lg p-3 text-caption text-navy outline-none resize-y focus:border-coral transition-colors duration-200"
              style={{ minHeight: 120, borderColor: 'var(--coral)' }}
            />
          ) : (
            <div className="border-2 rounded-lg p-3 text-caption text-navy" style={{ borderColor: diff.status === 'approved' ? '#10B981' : diff.status === 'rejected' ? '#EF4444' : 'var(--mid-gray)', background: diff.status === 'approved' ? '#ECFDF5' : diff.status === 'rejected' ? '#FEF2F2' : '#fff' }}>
              {(diff.modifiedText || diff.apres).split('\n').map((line, i) => (
                <p key={i} className={i > 0 ? 'mt-1' : ''}>{line}</p>
              ))}
            </div>
          )}
        </div>

        {/* Pourquoi */}
        {reason && diff.status !== 'modifying' && (
          <div className="mb-3 flex items-start gap-2 rounded-lg px-3 py-2" style={{ background: 'var(--coral-50)' }}>
            <span className="text-[13px]" aria-hidden>💡</span>
            <p className="text-[12px]" style={{ color: '#9A3412' }}>
              <span className="font-semibold">Pourquoi : </span>{reason}
            </p>
          </div>
        )}

        {/* Actions */}
        {diff.status === 'modifying' ? (
          <div className="flex gap-2">
            <motion.button
              className="flex items-center gap-1.5 text-caption px-4 py-2 rounded-lg text-white transition-all duration-200"
              style={{ background: 'var(--coral)' }}
              onClick={() => onSaveModify(editText)}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Check size={14} />
              Enregistrer
            </motion.button>
            <motion.button
              className="flex items-center gap-1.5 text-caption px-4 py-2 rounded-lg border border-mid-gray text-text-gray hover:bg-light-gray transition-colors duration-200"
              onClick={onCancelModify}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <X size={14} />
              Annuler
            </motion.button>
          </div>
        ) : (
          <div className="flex gap-2">
            <motion.button
              className="flex items-center gap-1.5 text-caption px-3 py-2 rounded-lg border transition-all duration-200"
              style={{
                borderColor: diff.status === 'approved' ? '#10B981' : 'var(--mid-gray)',
                background: diff.status === 'approved' ? '#ECFDF5' : '#fff',
                color: diff.status === 'approved' ? '#10B981' : 'var(--text-gray)',
              }}
              onClick={onApprove}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Check size={14} />
              Approuver
            </motion.button>
            <motion.button
              className="flex items-center gap-1.5 text-caption px-3 py-2 rounded-lg border transition-all duration-200"
              style={{
                borderColor: diff.status === 'rejected' ? '#EF4444' : 'var(--mid-gray)',
                background: diff.status === 'rejected' ? '#FEF2F2' : '#fff',
                color: diff.status === 'rejected' ? '#EF4444' : 'var(--text-gray)',
              }}
              onClick={onReject}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <X size={14} />
              Rejeter
            </motion.button>
            <motion.button
              className="flex items-center gap-1.5 text-caption px-3 py-2 rounded-lg border border-mid-gray text-text-gray hover:bg-light-gray transition-colors duration-200"
              onClick={onModify}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <Pencil size={14} />
              Modifier
            </motion.button>
          </div>
        )}
      </div>
    </motion.div>
  )
}
