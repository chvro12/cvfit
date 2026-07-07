import { useState, useEffect, useCallback } from 'react'
import { useDropzone } from 'react-dropzone'
import { motion, AnimatePresence } from 'framer-motion'
import { Link } from 'react-router'
import {
  UploadCloud, FileText, X, Camera, Check, ArrowLeft,
  Loader2, Circle, CheckCircle2,
  Download, RotateCcw,
  GripVertical, ChevronDown, Pencil,
} from 'lucide-react'
import { extractKeywordsFromOffer, generateOptimizations, calculateATSScore } from '../services/kimi'

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
type TailleTexte = 10 | 10.5 | 12 | 13
type DiffStatus = 'pending' | 'approved' | 'rejected' | 'modifying'

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

interface Experience {
  id: string
  title: string
  company: string
  period: string
  location: string
  bullets: string[]
}

interface Education {
  id: string
  degree: string
  school: string
  location: string
  period: string
}

interface CVSection {
  id: string
  type: 'contact' | 'profil' | 'experience' | 'formation' | 'competences' | 'langues' | 'certifications'
  label: string
  visible: boolean
}

/* ───────── accent color map ───────── */
const ACCENT_MAP: Record<AccentColor, string> = {
  coral: '#F85A3E',
  bleu: '#3B82F6',
  vert: '#10B981',
  violet: '#8B5CF6',
  noir: '#1A1A1A',
}

/* ───────── mock data: keywords ───────── */
const MOCK_KEYWORDS: Record<string, KeywordSet> = {
  dev: {
    technical: ['React', 'TypeScript', 'Node.js', 'API REST', 'PostgreSQL', 'Docker', 'Git', 'AWS'],
    softSkills: ['Autonomie', 'Travail en equipe', 'Rigueur', 'Communication'],
    experience: ['3+ ans', 'Agile/Scrum', 'Code review', 'CI/CD'],
  },
  default: {
    technical: ['Python', 'Machine Learning', 'SQL', 'Cloud'],
    softSkills: ['Leadership', 'Proactivite', 'Adaptabilite'],
    experience: ['5+ ans', 'Gestion de projet', 'Methodologies agiles'],
  },
}

const MOCK_SUB_STEPS = [
  'Extraction des mots-cles…',
  'Analyse de votre CV…',
  'Reecriture du contenu…',
  'Finalisation…',
]

/* ───────── mock data: diff items (Step 3) ───────── */
const MOCK_DIFFS: DiffItem[] = [
  {
    id: 'profil',
    section: 'PROFIL',
    avant: 'Data Analyst avec 3 ans d\'experience. Competences en SQL, Python et tableaux de bord. Aime travailler avec les donnees et collaborer avec differents equipes.',
    apres: 'Data Analyst specialise en performance commerciale & supply chain, avec 3 ans d\'experience en France et a l\'international (pharma, e-commerce, secteur public). Expert en SQL, Python, Power BI et Snowflake.',
    status: 'pending',
  },
  {
    id: 'xp1',
    section: 'EXPERIENCE 1 — Boehringer Ingelheim',
    avant: `Data Analyst chez Boehringer Ingelheim. Creation de rapports et analyse de donnees. Utilisation de Power BI et SQL pour suivre les KPIs.`,
    apres: `Data Analyst — Sales Force Efficiency | Boehringer Ingelheim\n• Concu et deploye 15+ tableaux de bord Power BI pour le suivi des KPIs commerciaux (ventes, parts de marche, couverture terrain)\n• Developpe des pipelines SQL sur Snowflake pour l'automatisation des rapports de performance des forces de vente\n• Mise en place d'un framework de Data Quality ameliorant la fiabilite des donnees de 40%\n• Collaboration en mode Agile (Scrum) avec les equipes commerciales et marketing pour prioriser les besoins analytiques`,
    status: 'pending',
  },
  {
    id: 'xp2',
    section: 'EXPERIENCE 2 — Ministere de l\'Education',
    avant: `Stage au Ministere de l'Education. Analyse de donnees sur les ecoles. Creation de rapports avec Python et PostgreSQL.`,
    apres: `Data Analyst | Ministere de l'Education nationale, Dakar\n• Pilote la construction de 25+ indicateurs de performance du systeme educatif (taux de reussite, redoublement, abandon)\n• Automatisation des processus ETL avec Python et PostgreSQL, reduisant le temps de traitement de 60%\n• Elaboration de rapports strategiques pour la direction de la planification et de la reforme de l'education\n• Contribution a la gouvernance des donnees : documentation des sources, definitions metiers et processus de validation`,
    status: 'pending',
  },
  {
    id: 'xp3',
    section: 'EXPERIENCE 3 — Jumia',
    avant: `Analyste chez Jumia. Analyse des ventes et gestion des stocks. Utilisation de Python pour les previsions.`,
    apres: `Data Analyst — Operations & Supply Chain | Jumia\n• Analyse des performances de vente par categorie et par region, identifiant +12% d'opportunites de croissance\n• Developpement de modeles predictifs (Python) pour l'optimisation des stocks et la reduction des ruptures de 25%\n• Coordination cross-fonctionnelle avec les equipes Logistique, Marketing et Finance pour aligner les strategies\n• Creation de dashboards operations en temps reel pour le monitoring des livraisons et du taux de satisfaction client`,
    status: 'pending',
  },
  {
    id: 'formation',
    section: 'FORMATION',
    avant: `Master Big Data. Cours sur l'intelligence artificielle et les bases de donnees.`,
    apres: `Master Big Data & Intelligence Artificielle — ESGI, Lyon (2024-2026)\nMaster Informatique & Systemes d'Information — Ecole d'Ingenierie Informatique, Paris (2023-2024)\nLicence Mathematiques et Informatique — Universite Gaston Berger, Saint-Louis, Senegal (2017-2020)`,
    status: 'pending',
  },
  {
    id: 'competences',
    section: 'COMPETENCES',
    avant: 'SQL, Python, Power BI, Snowflake, DAX, Data Quality',
    apres: 'SQL (avance), Python (Pandas, NumPy, Scikit-learn), Power BI (DAX, M), Snowflake, dbt, PostgreSQL, ETL/ELT, Git, Jira, Agile/Scrum, Salesforce, Modelisation de donnees',
    status: 'pending',
  },
]

/* ───────── mock data: complete CV (Step 4) ───────── */
const MOCK_FULL_NAME = 'Samba Thiam'
const MOCK_CV_TITLE = 'Data Analyst | SQL · Python · Power BI · Snowflake'
const MOCK_CONTACT = {
  email: 'sambathiampro@icloud.com',
  phone: '06 20 06 77 18',
  location: 'Lyon, France',
  linkedin: 'linkedin.com/in/samba-thiam',
  portfolio: 'datasamb.com',
}

const MOCK_PROFIL = 'Data Analyst specialise en performance commerciale & supply chain, avec 3 ans d\'experience en France et a l\'international (pharma, e-commerce, secteur public). Expert en SQL, Python, Power BI et Snowflake. Passionne par la transformation des donnees en insights actionnables pour guider la prise de decision.'

const MOCK_EXPERIENCES: Experience[] = [
  {
    id: 'exp1',
    title: 'Data Analyst — Sales Force Efficiency',
    company: 'Boehringer Ingelheim',
    period: '08/2024 - 09/2026',
    location: 'Lyon, France',
    bullets: [
      'Concu et deploye 15+ tableaux de bord Power BI pour le suivi des KPIs commerciaux (ventes, parts de marche, couverture terrain)',
      'Developpe des pipelines SQL sur Snowflake pour l\'automatisation des rapports de performance des forces de vente',
      'Mise en place d\'un framework de Data Quality ameliorant la fiabilite des donnees de 40%',
      'Collaboration en mode Agile (Scrum) avec les equipes commerciales et marketing pour prioriser les besoins analytiques',
    ],
  },
  {
    id: 'exp2',
    title: 'Data Analyst',
    company: 'Ministere de l\'Education nationale',
    period: '09/2022 - 03/2023',
    location: 'Dakar, Senegal',
    bullets: [
      'Pilote la construction de 25+ indicateurs de performance du systeme educatif',
      'Automatisation des processus ETL avec Python et PostgreSQL, reduisant le temps de traitement de 60%',
      'Elaboration de rapports strategiques pour la direction de la planification',
      'Contribution a la gouvernance des donnees : documentation des sources et processus de validation',
    ],
  },
  {
    id: 'exp3',
    title: 'Data Analyst — Operations & Supply Chain',
    company: 'Jumia',
    period: '11/2021 - 09/2022',
    location: 'Dakar, Senegal',
    bullets: [
      'Analyse des performances de vente par categorie et par region, identifiant +12% d\'opportunites de croissance',
      'Developpement de modeles predictifs (Python) pour l\'optimisation des stocks et la reduction des ruptures de 25%',
      'Coordination cross-fonctionnelle avec les equipes Logistique, Marketing et Finance',
      'Creation de dashboards operations en temps reel pour le monitoring des livraisons',
    ],
  },
]

const MOCK_EDUCATIONS: Education[] = [
  { id: 'edu1', degree: 'Master Big Data & Intelligence Artificielle', school: 'ESGI', location: 'Lyon', period: '09/2024 - 08/2026' },
  { id: 'edu2', degree: 'Master Informatique & Systemes d\'Information', school: 'Ecole d\'Ingenierie Informatique', location: 'Paris', period: '01/2023 - 07/2024' },
  { id: 'edu3', degree: 'Licence Mathematiques et Informatique', school: 'Universite Gaston Berger', location: 'Saint-Louis, Senegal', period: '10/2017 - 06/2020' },
]

const MOCK_COMPETENCES = [
  'SQL (avance)', 'Python', 'Power BI', 'Snowflake', 'DAX', 'Data Quality',
  'Modelisation de donnees', 'dbt', 'PostgreSQL', 'ETL/ELT', 'Git', 'Jira',
  'Agile/Scrum', 'Salesforce',
]

const MOCK_LANGUES = [
  { langue: 'Francais', niveau: 'Langue maternelle' },
  { langue: 'Anglais', niveau: 'B2 (Courant professionnel)' },
  { langue: 'Wolof', niveau: 'Langue maternelle' },
]

const MOCK_CERTIFICATIONS = [
  'Power BI Data Analyst Associate (PL-300) — Microsoft',
  'SnowPro Core Certification — Snowflake',
  'Data Analyst Professional Certificate — IBM',
  'Dbt Fundamentals — Fishtown Analytics',
]

/* ───────── helpers ───────── */
function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 octets'
  const k = 1024
  const sizes = ['octets', 'Ko', 'Mo']
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i]
}

function getMockOriginalCV(): string {
  return `${MOCK_FULL_NAME}
${MOCK_CV_TITLE}
${MOCK_CONTACT.email} | ${MOCK_CONTACT.phone} | ${MOCK_CONTACT.location} | ${MOCK_CONTACT.linkedin}

PROFIL
${MOCK_PROFIL}

EXPERIENCE
${MOCK_EXPERIENCES.map(e => `${e.title} | ${e.company} | ${e.period}\n${e.bullets.map(b => `• ${b}`).join('\n')}`).join('\n\n')}

FORMATION
${MOCK_EDUCATIONS.map(edu => `${edu.degree} — ${edu.school}, ${edu.location} (${edu.period})`).join('\n')}

COMPETENCES
${MOCK_COMPETENCES.join(', ')}

LANGUES
${MOCK_LANGUES.map(l => `${l.langue} : ${l.niveau}`).join('\n')}

CERTIFICATIONS
${MOCK_CERTIFICATIONS.join('\n')}`
}

/* ───────── semi-circle gauge component ───────── */
function SemiCircleGauge({ value, label, isAfter }: { value: number; label: string; isAfter?: boolean }) {
  const radius = 55
  const strokeWidth = 9
  const circumference = Math.PI * radius
  const strokeDashoffset = circumference - (value / 100) * circumference

  // Dynamic color: red (<50), yellow (50-75), green (>75)
  const getColor = (v: number) => {
    if (v < 50) return '#EF4444'
    if (v < 75) return '#F59E0B'
    return '#10B981'
  }

  const mainColor = isAfter ? getColor(value) : '#F59E0B'

  // Define gradient ID
  const gradId = `gauge-grad-${label.replace(/\s/g, '')}`

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: 130, height: 70 }}>
        <svg width="130" height="70" viewBox="0 0 130 70" className="overflow-visible">
          <defs>
            <linearGradient id={gradId} x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor={mainColor} />
              <stop offset="100%" stopColor={value >= 80 ? '#34D399' : mainColor} />
            </linearGradient>
          </defs>
          {/* Background arc */}
          <path
            d={`M 10 65 A ${radius} ${radius} 0 0 1 120 65`}
            fill="none"
            stroke="#EDECE8"
            strokeWidth={strokeWidth}
            strokeLinecap="round"
          />
          {/* Value arc with gradient */}
          <path
            d={`M 10 65 A ${radius} ${radius} 0 0 1 120 65`}
            fill="none"
            stroke={`url(#${gradId})`}
            strokeWidth={strokeWidth}
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
          />
          {/* Tick marks */}
          {[0, 25, 50, 75, 100].map((tick) => {
            const angle = Math.PI - (tick / 100) * Math.PI
            const x1 = 65 + (radius - 5) * Math.cos(angle)
            const y1 = 65 - (radius - 5) * Math.sin(angle)
            const x2 = 65 + (radius - 12) * Math.cos(angle)
            const y2 = 65 - (radius - 12) * Math.sin(angle)
            return (
              <line key={tick} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#CCC" strokeWidth={1.5} />
            )
          })}
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-end pb-1">
          <span className="text-[26px] font-bold leading-none" style={{ color: '#1A1A1A' }}>{value}</span>
        </div>
      </div>
      <span className="text-[10px] font-semibold uppercase tracking-wider mt-1" style={{ color: '#888' }}>{label}</span>
    </div>
  )
}

/* ═════════════════════════════════════════════════════════════════
   Dashboard Page
   ═════════════════════════════════════════════════════════════════ */
export default function Dashboard() {
  /* ── step state ── */
  const [currentStep, setCurrentStep] = useState<Step>(1)

  /* ── step 1: CV ── */
  const [cvFile, setCvFile] = useState<File | null>(null)
  const [hasPhoto, setHasPhoto] = useState<boolean | null>(null)
  const [photoFile, setPhotoFile] = useState<File | null>(null)

  /* ── step 2: job offer ── */
  const [jobOffer, setJobOffer] = useState('')
  const [keywords, setKeywords] = useState<KeywordSet>({ technical: [], softSkills: [], experience: [] })
  const [showKeywords, setShowKeywords] = useState(false)
  const [isExtractingKeywords, setIsExtractingKeywords] = useState(false)

  /* ── step 3: AI diff review ── */
  const [diffItems, setDiffItems] = useState<DiffItem[]>(MOCK_DIFFS)
  const [isProcessingDiffs, setIsProcessingDiffs] = useState(false)
  const [processingSubStep, setProcessingSubStep] = useState(-1)

  /* ── step 4: CV editor ── */
  const [cvSections, setCvSections] = useState<CVSection[]>([
    { id: 'contact', type: 'contact', label: 'Informations personnelles', visible: true },
    { id: 'profil', type: 'profil', label: 'Profil', visible: true },
    { id: 'experience', type: 'experience', label: 'Experience professionnelle', visible: true },
    { id: 'competences', type: 'competences', label: 'Competences', visible: true },
    { id: 'formation', type: 'formation', label: 'Formation', visible: true },
    { id: 'langues', type: 'langues', label: 'Langues', visible: true },
    { id: 'certifications', type: 'certifications', label: 'Passions', visible: true },
  ])
  const [template, setTemplate] = useState<Template>('pro')
  const [police, setPolice] = useState<Police>('Inter')
  const [densite, setDensite] = useState<Densite>('normal')
  const [interligne, setInterligne] = useState<Interligne>('normal')
  const [marges] = useState<Marges>('normales')
  const [accentColor, setAccentColor] = useState<AccentColor>('coral')
  const [tailleTexte, setTailleTexte] = useState<TailleTexte>(12)
  const [photoPosition, setPhotoPosition] = useState<'none' | 'left' | 'center' | 'right'>('none')
  const [photoPreviewUrl, setPhotoPreviewUrl] = useState<string | null>(null)
  const [traduireEN, setTraduireEN] = useState(false)
  const [cvName, setCvName] = useState('Data Analyst | BI & Supply Chain')
  const [isRenaming, setIsRenaming] = useState(false)
  const [draggedSectionId, setDraggedSectionId] = useState<string | null>(null)
  const [atsScore, setAtsScore] = useState(87)
  const [atsScoreBefore, setAtsScoreBefore] = useState(70)
  const [darkMode, setDarkMode] = useState(false)

  /* ── direction for slide animation ── */
  const [direction, setDirection] = useState(1)

  /* ── derived ── */
  const canContinueStep1 = cvFile !== null
  const canContinueStep2 = jobOffer.trim().length >= 50
  const allDiffsReviewed = diffItems.every(d => d.status === 'approved' || d.status === 'rejected')
  const approvedCount = diffItems.filter(d => d.status === 'approved').length

  /* ── unsaved-changes guard ── */
  useEffect(() => {
    const handler = (e: BeforeUnloadEvent) => {
      if (cvFile || jobOffer) {
        e.preventDefault()
        e.returnValue = ''
      }
    }
    window.addEventListener('beforeunload', handler)
    return () => window.removeEventListener('beforeunload', handler)
  }, [cvFile, jobOffer])

  /* ═══════ Step 1: Upload CV ═══════ */
  const onDropCv = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setCvFile(file)
      setHasPhoto(Math.random() > 0.5)
    }
  }, [])

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: onDropCv,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': ['.jpg', '.jpeg'],
      'image/png': ['.png'],
    },
    maxSize: 10 * 1024 * 1024,
    multiple: false,
  })

  const onDropPhoto = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      const file = acceptedFiles[0]
      setPhotoFile(file)
      setPhotoPreviewUrl(URL.createObjectURL(file))
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
      const lower = jobOffer.toLowerCase()
      const set = lower.includes('react') || lower.includes('javascript') || lower.includes('developpeur')
        ? MOCK_KEYWORDS.dev
        : MOCK_KEYWORDS.default
      setKeywords(set)
      setShowKeywords(true)
    } finally {
      setIsExtractingKeywords(false)
    }
  }

  /* ═══════ Step 3: AI Diff with REAL Kimi API ═══════ */
  const startOptimization = async () => {
    setIsProcessingDiffs(true)
    setProcessingSubStep(0)

    try {
      setProcessingSubStep(0)
      const kwResult = await extractKeywordsFromOffer(jobOffer)
      setKeywords(kwResult)

      setProcessingSubStep(1)
      const cvContent = getMockOriginalCV()
      const optimizations = await generateOptimizations(cvContent, jobOffer)

      if (optimizations.length > 0) {
        const diffItemsLocal: DiffItem[] = optimizations.map((opt, i) => ({
          id: `diff-${i}`,
          section: opt.section,
          avant: opt.avant,
          apres: opt.apres,
          status: 'pending' as DiffStatus,
        }))
        setDiffItems(diffItemsLocal)
      }

      setProcessingSubStep(2)
      const score = await calculateATSScore(cvContent, jobOffer)
      setAtsScore(score)

      setProcessingSubStep(3)

    } catch (err) {
      console.error('Optimization failed:', err)
    } finally {
      setIsProcessingDiffs(false)
      goToStep(3, 1)
    }
  }

  const setDiffStatus = (id: string, status: DiffStatus) => {
    setDiffItems(prev => prev.map(d => d.id === id ? { ...d, status } : d))
  }

  const saveModifiedText = (id: string, text: string) => {
    setDiffItems(prev => prev.map(d => d.id === id ? { ...d, modifiedText: text, status: 'approved' as DiffStatus } : d))
  }

  const approveAll = () => {
    setDiffItems(prev => prev.map(d => d.status === 'pending' || d.status === 'modifying' ? { ...d, status: 'approved' as DiffStatus } : d))
  }

  const rejectAll = () => {
    setDiffItems(prev => prev.map(d => d.status === 'pending' || d.status === 'modifying' ? { ...d, status: 'rejected' as DiffStatus } : d))
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

  const handleDownloadPdf = async () => {
    const el = document.getElementById('cv-canvas')
    if (!el) return

    const html2canvasModule = await import('html2canvas')
    const html2canvas = html2canvasModule.default
    const canvas = await html2canvas(el, { scale: 2, useCORS: true })
    const jsPDFModule = await import('jspdf')
    const jsPDF = jsPDFModule.default

    const imgData = canvas.toDataURL('image/png')
    const imgWidth = 210 // A4 width in mm
    const pageHeight = 297 // A4 height in mm
    const imgHeight = (canvas.height * imgWidth) / canvas.width

    // Create PDF with correct number of pages
    // If canvas content fits in ~1 A4 page → 1 page PDF
    // If more → multi-page PDF
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    let heightLeft = imgHeight
    let position = 0
    let pageCount = 0

    pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
    heightLeft -= pageHeight
    pageCount++

    while (heightLeft > 20) { // Only add page if meaningful content remains (>20mm)
      position = heightLeft - imgHeight
      pdf.addPage()
      pdf.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight)
      heightLeft -= pageHeight
      pageCount++
    }

    pdf.save(`cv-samba-thiam${pageCount > 1 ? `-${pageCount}pages` : ''}.pdf`)
  }

  const handleRestart = () => {
    setCvFile(null)
    setHasPhoto(null)
    setPhotoFile(null)
    setJobOffer('')
    setKeywords({ technical: [], softSkills: [], experience: [] })
    setShowKeywords(false)
    setIsExtractingKeywords(false)
    setDiffItems(MOCK_DIFFS)
    setIsProcessingDiffs(false)
    setProcessingSubStep(-1)
    setAtsScore(87)
    setAtsScoreBefore(70)
    setCvSections([
      { id: 'contact', type: 'contact', label: 'Informations personnelles', visible: true },
      { id: 'profil', type: 'profil', label: 'Profil', visible: true },
      { id: 'experience', type: 'experience', label: 'Experience professionnelle', visible: true },
      { id: 'competences', type: 'competences', label: 'Competences', visible: true },
      { id: 'formation', type: 'formation', label: 'Formation', visible: true },
      { id: 'langues', type: 'langues', label: 'Langues', visible: true },
      { id: 'certifications', type: 'certifications', label: 'Passions', visible: true },
    ])
    setCurrentStep(1)
    setDirection(1)
  }

  const goToStep = (step: Step, dir = 1) => {
    setDirection(dir)
    setCurrentStep(step)
  }

  /* ── cv canvas style helpers ── */
  const getDensiteClasses = () => {
    switch (densite) {
      case 'ultra-compact': return 'text-[9px] leading-[1.15]'
      case 'compact': return 'text-[10px] leading-tight'
      case 'aere': return 'text-[13px] leading-loose'
      default: return 'text-[12px] leading-relaxed'
    }
  }

  const getInterligneValue = () => {
    switch (interligne) {
      case 'serre': return 1.3
      case 'espace': return 1.8
      default: return 1.5
    }
  }

  const getFontFamily = () => {
    switch (police) {
      case 'Playfair': return "'Playfair Display', serif"
      case 'Roboto': return "'Roboto', sans-serif"
      case 'Open Sans': return "'Open Sans', sans-serif"
      case 'Lato': return "'Lato', sans-serif"
      case 'Montserrat': return "'Montserrat', sans-serif"
      case 'Merriweather': return "'Merriweather', serif"
      default: return "'Inter', sans-serif"
    }
  }

  const getMargesPadding = () => {
    switch (marges) {
      case 'etroites': return '18px 22px'
      case 'larges': return '40px 44px'
      default: return '28px 32px'
    }
  }

  const getTailleTextePx = () => {
    switch (tailleTexte) {
      case 10: return 10
      case 10.5: return 10.5
      case 13: return 13
      default: return 12
    }
  }

  /* ── active accent color hex ── */
  const activeAccentHex = ACCENT_MAP[accentColor]

  /* ═══════ Sidebar step items ═══════ */
  const stepItems = [
    { num: 1, label: 'Votre CV' },
    { num: 2, label: "L'offre d'emploi" },
    { num: 3, label: 'Optimisation IA' },
    { num: 4, label: 'Editeur CV' },
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

      {/* ═══════ Desktop Sidebar ═══════ */}
      {currentStep !== 4 && (
        <aside className="hidden lg:flex flex-col w-[380px] min-w-[380px] bg-white border-r border-mid-gray sticky top-[68px] h-[calc(100dvh-68px)] px-6 py-8 shrink-0">
          <div className="mb-6">
            <h3 className="text-subsection text-navy mb-3">Votre adaptation</h3>
            <div className="w-full h-1.5 bg-light-gray rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'var(--coral)' }}
                initial={{ width: 0 }}
                animate={{ width: `${progressPercent}%` }}
                transition={{ duration: 0.4, ease: easeSmooth }}
              />
            </div>
            <p className="text-caption text-text-gray mt-2">Etape {currentStep} sur 4</p>
          </div>

          <nav className="flex flex-col gap-1">
            {stepItems.map((s) => {
              const completed = currentStep > s.num
              const active = currentStep === s.num
              return (
                <motion.button
                  key={s.num}
                  className="flex items-center gap-3 px-3 py-3.5 rounded-xl text-left w-full transition-colors duration-200"
                  onClick={() => { if (completed) goToStep(s.num as Step, -1) }}
                  animate={{ backgroundColor: active ? 'var(--coral-50)' : 'transparent' }}
                  whileHover={!active && !completed ? { backgroundColor: 'var(--navy-50)' } : {}}
                  style={{ cursor: completed ? 'pointer' : 'default' }}
                >
                  <div
                    className="w-8 h-8 rounded-full flex items-center justify-center shrink-0 transition-all duration-300"
                    style={{
                      background: completed ? 'var(--success)' : active ? 'var(--coral)' : 'var(--light-gray)',
                      color: completed || active ? '#fff' : 'var(--text-gray)',
                    }}
                  >
                    {completed ? <Check size={16} /> : (
                      <span className="text-small font-semibold">{s.num}</span>
                    )}
                  </div>
                  <span className={`text-caption transition-colors duration-200 ${
                    active ? 'text-navy font-semibold' : completed ? 'text-navy font-medium' : 'text-text-gray'
                  }`}>
                    {s.label}
                  </span>
                </motion.button>
              )
            })}
          </nav>

          <div className="mt-auto pt-6 border-t border-mid-gray">
            <p className="text-caption text-text-gray">Besoin d'aide ?</p>
            <Link to="/" className="text-caption hover:underline" style={{ color: 'var(--coral)' }}>
              Consulter la FAQ
            </Link>
          </div>
        </aside>
      )}

      {/* ═══════ Main Content ═══════ */}
      <main className="flex-1 flex flex-col min-w-0">
        <div className={`flex-1 ${currentStep === 4 ? 'px-0 py-0' : 'px-6 lg:px-12 py-8 lg:py-12'}`}>
          <div className={currentStep === 4 ? 'h-full' : 'max-w-[720px] mx-auto'}>
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
                      Formats acceptes : PDF, DOCX, JPG, PNG. Votre mise en forme sera conservee.
                    </p>

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
                        Glissez-deposez votre CV ici
                      </p>
                      <p className="text-body-large mb-3">
                        <span style={{ color: 'var(--coral)' }}>ou cliquez pour parcourir</span>
                      </p>
                      <p className="text-caption text-text-gray">
                        PDF, DOCX, JPG, PNG — max 10 Mo
                      </p>
                    </div>

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
                          {hasPhoto !== null && (
                            <span
                              className="text-small px-3 py-1 rounded-full shrink-0"
                              style={{
                                background: hasPhoto ? '#D1FAE5' : '#FEF3C7',
                                color: hasPhoto ? 'var(--success)' : 'var(--warning)',
                              }}
                            >
                              {hasPhoto ? 'Photo detectee' : 'Aucune photo'}
                            </span>
                          )}
                          <button
                            onClick={() => { setCvFile(null); setHasPhoto(null); setPhotoFile(null) }}
                            className="p-1.5 rounded-lg hover:bg-light-gray text-text-gray hover:text-error transition-colors duration-200 shrink-0"
                          >
                            <X size={20} />
                          </button>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Conditional photo upload */}
                    <AnimatePresence>
                      {cvFile && hasPhoto === false && (
                        <motion.div
                          initial={{ opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={{ opacity: 0, height: 0 }}
                          transition={{ duration: 0.3 }}
                          className="overflow-hidden"
                        >
                          <div className="mt-6">
                            <h4 className="text-subsection text-navy mb-3">Photo de profil (optionnel)</h4>
                            {!photoFile ? (
                              <div
                                {...getPhotoRootProps()}
                                className="border-2 border-dashed border-mid-gray rounded-2xl p-8 text-center cursor-pointer hover:border-coral transition-colors duration-200 outline-none"
                                style={{ minHeight: 120 }}
                              >
                                <input {...getPhotoInputProps()} />
                                <Camera size={32} className="mx-auto mb-2 text-text-gray" />
                                <p className="text-caption text-navy">Uploader une photo</p>
                                <p className="text-small text-text-gray">JPG, PNG — max 5 Mo</p>
                              </div>
                            ) : (
                              <motion.div
                                initial={{ opacity: 0, scale: 0.8 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="flex items-center gap-4"
                              >
                                <img
                                  src={URL.createObjectURL(photoFile)}
                                  alt="Photo de profil"
                                  className="w-[120px] h-[120px] rounded-full object-cover border-[3px] border-mid-gray"
                                />
                                <button
                                  onClick={() => setPhotoFile(null)}
                                  className="p-2 rounded-lg hover:bg-light-gray text-text-gray hover:text-error transition-colors duration-200"
                                >
                                  <X size={20} />
                                </button>
                              </motion.div>
                            )}
                          </div>
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
                      Copiez le texte complet de l&apos;offre. Notre IA en extraira les mots-cles et competences cles.
                    </p>

                    <div className="relative">
                      <textarea
                        value={jobOffer}
                        onChange={(e) => handleJobOfferChange(e.target.value)}
                        onBlur={extractKeywords}
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
                          Analyse en cours...
                        </div>
                      )}
                    </div>

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
                            <h4 className="text-subsection text-navy">Mots-cles detectes</h4>
                            <span className="text-small text-text-gray">(Apercu — seront affines par l&apos;IA)</span>
                          </div>

                          {keywords.technical.length > 0 && (
                            <div className="mb-3">
                              <p className="text-small text-text-gray font-medium mb-1.5">Competences techniques :</p>
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
                              <p className="text-small text-text-gray font-medium mb-1.5">Experience :</p>
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
                        style={{ background: 'var(--coral)', opacity: canContinueStep2 ? 1 : 0.5 }}
                        onClick={() => {
                          if (canContinueStep2) {
                            startOptimization()
                          }
                        }}
                        whileHover={canContinueStep2 ? { scale: 1.02, boxShadow: '0 4px 16px rgba(248,90,62,0.35)' } : {}}
                        whileTap={canContinueStep2 ? { scale: 0.98 } : {}}
                      >
                        {isProcessingDiffs ? (
                          <>
                            <Loader2 size={18} className="animate-spin" />
                            Analyse en cours...
                          </>
                        ) : (
                          <>
                            Generer mon CV
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
                          <div className="w-full max-w-[400px] flex flex-col gap-3">
                            {MOCK_SUB_STEPS.map((stepText, i) => (
                              <motion.div
                                key={stepText}
                                className="flex items-center gap-3"
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.1, duration: 0.3 }}
                              >
                                {processingSubStep >= i ? (
                                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ duration: 0.3, ease: easeSpring }}>
                                    <CheckCircle2 size={20} className="text-success" />
                                  </motion.div>
                                ) : (
                                  <Circle size={20} className="text-text-gray" />
                                )}
                                <span className={`text-caption transition-colors duration-300 ${processingSubStep >= i ? 'text-navy' : 'text-text-gray'}`}>
                                  {stepText}
                                </span>
                              </motion.div>
                            ))}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>

                    {/* Diff results */}
                    <AnimatePresence>
                      {!isProcessingDiffs && (
                        <motion.div
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          transition={{ duration: 0.5 }}
                        >
                          {/* Header */}
                          <div className="mb-6">
                            <h2 className="text-section text-navy mb-2">Optimisations proposees par l&apos;IA</h2>
                            <p className="text-body-large text-text-gray">
                              L&apos;IA a analyse votre CV et l&apos;offre d&apos;emploi. Voici les modifications proposees.
                            </p>
                          </div>

                          {/* Summary + Bulk actions */}
                          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 p-4 bg-white border border-mid-gray rounded-xl">
                            <div>
                              <p className="text-caption text-text-gray">
                                <span className="font-semibold text-navy">{approvedCount}</span> changement{approvedCount !== 1 ? 's' : ''} approuve{approvedCount !== 1 ? 's' : ''} sur <span className="font-semibold text-navy">{diffItems.length}</span>
                              </p>
                              {!allDiffsReviewed && (
                                <p className="text-small text-text-gray mt-1">
                                  Veuillez revoir tous les changements pour continuer.
                                </p>
                              )}
                            </div>
                            <div className="flex gap-2">
                              <motion.button
                                className="flex items-center gap-1.5 text-caption px-4 py-2 rounded-lg border border-mid-gray text-navy hover:bg-navy-50 transition-colors duration-200"
                                onClick={approveAll}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <Check size={14} />
                                Tout approuver
                              </motion.button>
                              <motion.button
                                className="flex items-center gap-1.5 text-caption px-4 py-2 rounded-lg border border-mid-gray text-text-gray hover:bg-light-gray transition-colors duration-200"
                                onClick={rejectAll}
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                              >
                                <X size={14} />
                                Tout rejeter
                              </motion.button>
                            </div>
                          </div>

                          {/* Diff cards */}
                          <div className="flex flex-col gap-4">
                            {diffItems.map((diff, i) => (
                              <DiffCard
                                key={diff.id}
                                diff={diff}
                                index={i}
                                onApprove={() => setDiffStatus(diff.id, 'approved')}
                                onReject={() => setDiffStatus(diff.id, 'rejected')}
                                onModify={() => setDiffStatus(diff.id, 'modifying')}
                                onSaveModify={(text) => saveModifiedText(diff.id, text)}
                                onCancelModify={() => setDiffStatus(diff.id, 'pending')}
                              />
                            ))}
                          </div>

                          {/* Navigation */}
                          <div className="flex justify-between mt-10">
                            <motion.button
                              className="flex items-center gap-2 text-button text-navy px-5 py-3 rounded-xl hover:bg-navy-50 transition-colors duration-200"
                              onClick={() => goToStep(2, -1)}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                            >
                              <ArrowLeft size={18} />
                              Retour
                            </motion.button>
                            <motion.button
                              className="flex items-center gap-2 text-button text-white px-8 py-4 rounded-xl transition-all duration-200"
                              style={{ background: 'var(--coral)', opacity: allDiffsReviewed ? 1 : 0.5 }}
                              onClick={() => allDiffsReviewed && goToStep(4, 1)}
                              whileHover={allDiffsReviewed ? { scale: 1.02, boxShadow: '0 4px 16px rgba(248,90,62,0.35)' } : {}}
                              whileTap={allDiffsReviewed ? { scale: 0.98 } : {}}
                            >
                              Continuer vers l&apos;editeur
                              <ChevronDown size={18} className="rotate-[-90deg]" />
                            </motion.button>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
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
                      {/* Right: moon + Reinitialiser */}
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setDarkMode(!darkMode)}
                          className="p-2 rounded-lg hover:bg-gray-50 transition-colors"
                        >
                          <RotateCcw size={16} style={{ color: '#666' }} />
                        </button>
                        <button
                          onClick={handleRestart}
                          className="text-[12px] font-medium px-3 py-1.5 rounded-lg hover:bg-gray-50 transition-colors"
                          style={{ color: '#666' }}
                        >
                          Reinitialiser
                        </button>
                      </div>
                    </div>

                    {/* ─── EDITOR BODY: 3 columns ─── */}
                    <div className="flex-1 flex overflow-hidden" style={{ background: '#F0EFEA' }}>

                      {/* ══════ LEFT COLUMN: Sections ══════ */}
                      <div className="w-[210px] min-w-[210px] bg-white border-r overflow-y-auto shrink-0" style={{ borderColor: '#E5E5E0' }}>
                        <div className="py-4 px-3">
                          {/* Section items */}
                          <div className="flex flex-col gap-1">
                            {cvSections.map((section) => (
                              <div
                                key={section.id}
                                draggable
                                onDragStart={(e) => handleDragStart(e, section.id)}
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
                                <Pencil size={12} style={{ color: '#ccc' }} className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity" />
                              </div>
                            ))}
                          </div>

                          {/* Bottom actions */}
                          <div className="mt-4 pt-3 flex flex-col gap-2" style={{ borderTop: '1px solid #F0EFEA' }}>
                            <button
                              className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border transition-colors duration-200 w-full"
                              style={{
                                borderColor: activeAccentHex,
                                color: activeAccentHex,
                                background: '#fff',
                              }}
                            >
                              <span className="text-[13px]">+</span> Ajouter
                            </button>
                            <button
                              className="flex items-center gap-1.5 text-[11px] font-medium px-3 py-2 rounded-lg border transition-colors duration-200 w-full"
                              style={{ borderColor: '#E5E5E0', color: '#666', background: '#fff' }}
                            >
                              <Pencil size={12} /> Renommer
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* ══════ CENTER COLUMN: Canvas ══════ */}
                      <div className="flex-1 min-w-0 overflow-y-auto">
                        <div className="flex flex-col items-center py-5 px-4">

                          {/* Score ATS gauges */}
                          <div className="flex items-center justify-center gap-4 mb-4">
                            <SemiCircleGauge
                              value={atsScoreBefore}
                              label="AVANT"
                            />
                            <div className="flex flex-col items-center px-2">
                              <span className="text-[13px] font-bold" style={{ color: '#10B981' }}>+{atsScore - atsScoreBefore}</span>
                              <ArrowLeft size={14} className="rotate-180" style={{ color: '#10B981' }} />
                            </div>
                            <SemiCircleGauge
                              value={atsScore}
                              label="MAINTENANT"
                              isAfter
                            />
                          </div>

                          {/* A4 Canvas */}
                          <div className="flex justify-center w-full">
                            <div className="relative">
                              {/* "1 PAGE" badge */}
                              <div
                                className="absolute top-3 right-3 z-10 text-[9px] font-bold px-2.5 py-1 rounded-full uppercase tracking-wider"
                                style={{ background: '#F85A3E', color: '#fff' }}
                              >
                                1 PAGE
                              </div>

                              <div
                                id="cv-canvas"
                                className={`bg-white overflow-hidden ${getDensiteClasses()}`}
                                style={{
                                  width: '210mm',
                                  minHeight: '297mm',
                                  maxWidth: '100%',
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
                                  <div className={`mb-5 ${photoPosition === 'left' || photoPosition === 'right' ? 'flex items-center gap-4' : 'text-center'}`}>
                                    {/* Photo: center (above name) or left */}
                                    {photoPreviewUrl && (photoPosition === 'center' || photoPosition === 'left') && (
                                      <div className={`${photoPosition === 'center' ? 'mx-auto mb-3' : 'shrink-0'}`}>
                                        <img
                                          src={photoPreviewUrl}
                                          alt="Photo de profil"
                                          className="object-cover rounded-full"
                                          style={{ width: photoPosition === 'center' ? 80 : 60, height: photoPosition === 'center' ? 80 : 60 }}
                                        />
                                      </div>
                                    )}
                                    {/* Photo: right */}
                                    {photoPreviewUrl && photoPosition === 'right' && (
                                      <div className="shrink-0 order-last">
                                        <img
                                          src={photoPreviewUrl}
                                          alt="Photo de profil"
                                          className="object-cover rounded-full"
                                          style={{ width: 60, height: 60 }}
                                        />
                                      </div>
                                    )}
                                    {/* Text info */}
                                    <div className={photoPosition === 'left' || photoPosition === 'right' ? 'text-left flex-1' : ''}>
                                      <h1
                                        className="font-bold tracking-tight mb-1"
                                        style={{ fontSize: '1.6em', color: '#111', letterSpacing: '-0.01em' }}
                                        suppressContentEditableWarning
                                        contentEditable
                                      >
                                        {MOCK_FULL_NAME}
                                      </h1>
                                      <p
                                        className="font-medium mb-2.5"
                                        style={{ fontSize: '0.95em', color: activeAccentHex }}
                                        suppressContentEditableWarning
                                        contentEditable
                                      >
                                        {MOCK_CV_TITLE}
                                      </p>
                                      <div className={`flex flex-wrap gap-x-2 gap-y-0.5 ${photoPosition !== 'left' && photoPosition !== 'right' ? 'justify-center' : ''}`} style={{ fontSize: '0.78em', color: '#666' }}>
                                        <a href={`tel:${MOCK_CONTACT.phone.replace(/\s/g, '')}`} style={{ color: '#666', textDecoration: 'none' }}>{MOCK_CONTACT.phone}</a>
                                        <span style={{ color: '#ccc' }}>|</span>
                                        <a href={`mailto:${MOCK_CONTACT.email}`} style={{ color: '#666', textDecoration: 'none' }}>{MOCK_CONTACT.email}</a>
                                        <span style={{ color: '#ccc' }}>|</span>
                                        <span>{MOCK_CONTACT.location}</span>
                                      </div>
                                      <div className={`flex flex-wrap gap-x-3 mt-1 ${photoPosition !== 'left' && photoPosition !== 'right' ? 'justify-center' : ''}`} style={{ fontSize: '0.75em' }}>
                                        <a href={`https://${MOCK_CONTACT.linkedin}`} target="_blank" rel="noopener noreferrer" style={{ color: activeAccentHex, fontWeight: 500, textDecoration: 'none' }}>{MOCK_CONTACT.linkedin}</a>
                                        <a href={`https://${MOCK_CONTACT.portfolio}`} target="_blank" rel="noopener noreferrer" style={{ color: activeAccentHex, fontWeight: 500, textDecoration: 'none' }}>{MOCK_CONTACT.portfolio}</a>
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* ─── Profil ─── */}
                                {cvSections.find(s => s.id === 'profil')?.visible && (
                                  <div className="mb-4">
                                    <h3
                                      className="font-bold uppercase pb-1 mb-2 border-b-2"
                                      style={{
                                        fontSize: '0.85em',
                                        color: '#1A1A1A',
                                        borderColor: activeAccentHex,
                                        letterSpacing: '0.06em',
                                      }}
                                    >
                                      Profil
                                    </h3>
                                    <p
                                      style={{ fontSize: '0.88em', color: '#444', lineHeight: getInterligneValue() }}
                                      suppressContentEditableWarning
                                      contentEditable
                                    >
                                      {MOCK_PROFIL}
                                    </p>
                                  </div>
                                )}

                                {/* ─── Experience ─── */}
                                {cvSections.find(s => s.id === 'experience')?.visible && (
                                  <div className="mb-4">
                                    <h3
                                      className="font-bold uppercase pb-1 mb-2.5 border-b-2"
                                      style={{
                                        fontSize: '0.85em',
                                        color: '#1A1A1A',
                                        borderColor: activeAccentHex,
                                        letterSpacing: '0.06em',
                                      }}
                                    >
                                      Experience professionnelle
                                    </h3>
                                    {MOCK_EXPERIENCES.map(exp => (
                                      <div key={exp.id} className="mb-3">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                          <h4
                                            className="font-bold"
                                            style={{ fontSize: '0.92em', color: '#111' }}
                                            suppressContentEditableWarning
                                            contentEditable
                                          >
                                            {exp.title}
                                          </h4>
                                          <span
                                            className="shrink-0 ml-3 font-medium"
                                            style={{ fontSize: '0.8em', color: '#888' }}
                                            suppressContentEditableWarning
                                            contentEditable
                                          >
                                            {exp.period}
                                          </span>
                                        </div>
                                        <p
                                          className="font-semibold mb-1.5"
                                          style={{ fontSize: '0.85em', color: '#555' }}
                                          suppressContentEditableWarning
                                          contentEditable
                                        >
                                          {exp.company} — {exp.location}
                                        </p>
                                        <ul className="space-y-1">
                                          {exp.bullets.map((bullet, bi) => (
                                            <li
                                              key={bi}
                                              className="pl-3 relative"
                                              style={{ fontSize: '0.84em', color: '#444', lineHeight: getInterligneValue() }}
                                              suppressContentEditableWarning
                                              contentEditable
                                            >
                                              <span
                                                className="absolute left-0"
                                                style={{ color: activeAccentHex }}
                                              >
                                                •
                                              </span>
                                              {bullet}
                                            </li>
                                          ))}
                                        </ul>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* ─── Competences ─── */}
                                {cvSections.find(s => s.id === 'competences')?.visible && (
                                  <div className="mb-4">
                                    <h3
                                      className="font-bold uppercase pb-1 mb-2.5 border-b-2"
                                      style={{
                                        fontSize: '0.85em',
                                        color: '#1A1A1A',
                                        borderColor: activeAccentHex,
                                        letterSpacing: '0.06em',
                                      }}
                                    >
                                      Competences
                                    </h3>
                                    <p
                                      style={{ fontSize: '0.82em', color: '#444', lineHeight: '1.5' }}
                                      suppressContentEditableWarning
                                      contentEditable
                                    >
                                      {MOCK_COMPETENCES.join(' · ')}
                                    </p>
                                  </div>
                                )}

                                {/* ─── Formation ─── */}
                                {cvSections.find(s => s.id === 'formation')?.visible && (
                                  <div className="mb-4">
                                    <h3
                                      className="font-bold uppercase pb-1 mb-2.5 border-b-2"
                                      style={{
                                        fontSize: '0.85em',
                                        color: '#1A1A1A',
                                        borderColor: activeAccentHex,
                                        letterSpacing: '0.06em',
                                      }}
                                    >
                                      Formation
                                    </h3>
                                    {MOCK_EDUCATIONS.map(edu => (
                                      <div key={edu.id} className="mb-2">
                                        <div className="flex justify-between items-baseline mb-0.5">
                                          <h4
                                            className="font-bold"
                                            style={{ fontSize: '0.9em', color: '#111' }}
                                            suppressContentEditableWarning
                                            contentEditable
                                          >
                                            {edu.degree}
                                          </h4>
                                          <span
                                            className="shrink-0 ml-3 font-medium"
                                            style={{ fontSize: '0.8em', color: '#888' }}
                                            suppressContentEditableWarning
                                            contentEditable
                                          >
                                            {edu.period}
                                          </span>
                                        </div>
                                        <p
                                          style={{ fontSize: '0.84em', color: '#555' }}
                                          suppressContentEditableWarning
                                          contentEditable
                                        >
                                          {edu.school}, {edu.location}
                                        </p>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* ─── Langues ─── */}
                                {cvSections.find(s => s.id === 'langues')?.visible && (
                                  <div className="mb-4">
                                    <h3
                                      className="font-bold uppercase pb-1 mb-2.5 border-b-2"
                                      style={{
                                        fontSize: '0.85em',
                                        color: '#1A1A1A',
                                        borderColor: activeAccentHex,
                                        letterSpacing: '0.06em',
                                      }}
                                    >
                                      Langues
                                    </h3>
                                    {MOCK_LANGUES.map((lang, li) => (
                                      <div
                                        key={li}
                                        className="flex justify-between items-center mb-1"
                                        style={{ fontSize: '0.86em' }}
                                      >
                                        <span
                                          className="font-medium"
                                          style={{ color: '#111' }}
                                          suppressContentEditableWarning
                                          contentEditable
                                        >
                                          {lang.langue}
                                        </span>
                                        <span
                                          style={{ fontSize: '0.9em', color: '#888' }}
                                          suppressContentEditableWarning
                                          contentEditable
                                        >
                                          {lang.niveau}
                                        </span>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* ─── Certifications ─── */}
                                {cvSections.find(s => s.id === 'certifications')?.visible && (
                                  <div className="mb-4">
                                    <h3
                                      className="font-bold uppercase pb-1 mb-2.5 border-b-2"
                                      style={{
                                        fontSize: '0.85em',
                                        color: '#1A1A1A',
                                        borderColor: activeAccentHex,
                                        letterSpacing: '0.06em',
                                      }}
                                    >
                                      Certifications
                                    </h3>
                                    <ul className="space-y-1">
                                      {MOCK_CERTIFICATIONS.map((cert, ci) => (
                                        <li
                                          key={ci}
                                          className="pl-3 relative"
                                          style={{ fontSize: '0.84em', color: '#444' }}
                                          suppressContentEditableWarning
                                          contentEditable
                                        >
                                          <span
                                            className="absolute left-0"
                                            style={{ color: activeAccentHex }}
                                          >
                                            •
                                          </span>
                                          {cert}
                                        </li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>

                          {/* Download button */}
                          <motion.button
                            className="mt-5 flex items-center gap-2 text-[13px] font-semibold text-white px-8 py-3.5 rounded-full transition-all duration-200 shadow-lg"
                            style={{ background: '#F85A3E' }}
                            onClick={handleDownloadPdf}
                            whileHover={{ scale: 1.03, boxShadow: '0 8px 24px rgba(248,90,62,0.4)' }}
                            whileTap={{ scale: 0.97 }}
                          >
                            <Download size={16} />
                            Telecharger mon CV
                          </motion.button>

                        </div>
                      </div>

                      {/* ══════ RIGHT COLUMN: Formatting ══════ */}
                      <div className="w-[280px] min-w-[280px] bg-white border-l overflow-y-auto shrink-0" style={{ borderColor: '#E5E5E0' }}>
                        <div className="py-4 px-4 space-y-5">

                          {/* Header */}
                          <div className="flex items-center justify-between">
                            <h3 className="text-[13px] font-bold" style={{ color: '#1A1A1A' }}>Mise en forme</h3>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => setDarkMode(!darkMode)}
                                className="p-1.5 rounded hover:bg-gray-50 transition-colors"
                              >
                                <RotateCcw size={14} style={{ color: '#888' }} />
                              </button>
                              <button
                                className="text-[11px] hover:underline"
                                style={{ color: '#888' }}
                                onClick={handleRestart}
                              >
                                Reinitialiser
                              </button>
                            </div>
                          </div>

                          {/* ─── MODELE ─── */}
                          <div>
                            <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#888' }}>Modele</h4>
                            <div className="grid grid-cols-2 gap-2">
                              {([
                                { id: 'moderne' as Template, label: 'Moderne' },
                                { id: 'prestige' as Template, label: 'Prestige' },
                                { id: 'essentiel' as Template, label: 'Essentiel' },
                                { id: 'chronologique' as Template, label: 'Chrono.' },
                                { id: 'pro' as Template, label: 'Pro' },
                              ]).map(tpl => (
                                <button
                                  key={tpl.id}
                                  onClick={() => setTemplate(tpl.id)}
                                  className="flex flex-col items-center gap-1 py-2.5 px-1 rounded-lg border-2 transition-all duration-200 outline-none text-[11px] font-medium"
                                  style={{
                                    borderColor: template === tpl.id ? activeAccentHex : '#E5E5E0',
                                    background: template === tpl.id ? '#FFF5F3' : '#fff',
                                    color: template === tpl.id ? '#1A1A1A' : '#888',
                                  }}
                                >
                                  {tpl.label}
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
                                { id: 'Playfair' as Police, label: 'Playfair' },
                              ]).map(f => (
                                <button
                                  key={f.id}
                                  onClick={() => setPolice(f.id)}
                                  className="py-2 px-2 rounded-lg border-2 transition-all duration-200 outline-none text-[11px] font-medium text-center"
                                  style={{
                                    borderColor: police === f.id ? activeAccentHex : '#E5E5E0',
                                    background: police === f.id ? '#FFF5F3' : '#fff',
                                    color: police === f.id ? '#1A1A1A' : '#888',
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
                              {([10, 10.5, 12, 12, 13] as TailleTexte[]).map((size, i) => (
                                <button
                                  key={`${size}-${i}`}
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

                          {/* ─── DENSITE ─── */}
                          <div>
                            <h4 className="text-[11px] font-semibold uppercase tracking-wider mb-2" style={{ color: '#888' }}>Densite</h4>
                            <div className="grid grid-cols-4 gap-1.5">
                              {([
                                { id: 'ultra-compact' as Densite, label: 'Ultra-c.' },
                                { id: 'compact' as Densite, label: 'Compact' },
                                { id: 'normal' as Densite, label: 'Normal' },
                                { id: 'aere' as Densite, label: 'Aere' },
                              ]).map(d => {
                                const lines = d.id === 'ultra-compact' ? 5 : d.id === 'compact' ? 4 : d.id === 'normal' ? 3 : 2
                                return (
                                  <button
                                    key={d.id}
                                    onClick={() => setDensite(d.id)}
                                    className="flex flex-col items-center gap-1 py-2 px-1 rounded-lg border-2 transition-all duration-200 outline-none"
                                    style={{
                                      borderColor: densite === d.id ? activeAccentHex : '#E5E5E0',
                                      background: densite === d.id ? '#FFF5F3' : '#fff',
                                    }}
                                    title={d.label}
                                  >
                                    <div className="flex flex-col gap-[2px]">
                                      {Array.from({ length: lines }).map((_, li) => (
                                        <div
                                          key={li}
                                          className="w-6 rounded-sm"
                                          style={{
                                            height: 2,
                                            background: densite === d.id ? activeAccentHex : '#ccc',
                                          }}
                                        />
                                      ))}
                                    </div>
                                    <span
                                      className="text-[9px] font-medium mt-1"
                                      style={{ color: densite === d.id ? '#1A1A1A' : '#aaa' }}
                                    >
                                      {d.label}
                                    </span>
                                  </button>
                                )
                              })}
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
                                { id: 'none', label: 'Aucune' },
                                { id: 'left', label: 'Gauche' },
                                { id: 'center', label: 'Centre' },
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
                            {/* Photo upload (visible when position != none) */}
                            {photoPosition !== 'none' && (
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
                                  <span className="text-[10px] text-text-gray">Cliquez pour ajouter une photo</span>
                                )}
                              </div>
                            )}
                          </div>

                          {/* ─── Traduire en EN ─── */}
                          <div className="flex items-center gap-3 py-1">
                            <span className="text-[14px]">🇫🇷</span>
                            <button
                              onClick={() => setTraduireEN(!traduireEN)}
                              className="text-[12px] font-medium transition-colors"
                              style={{ color: traduireEN ? activeAccentHex : '#888' }}
                            >
                              Traduire en EN
                            </button>
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
}: {
  diff: DiffItem
  index: number
  onApprove: () => void
  onReject: () => void
  onModify: () => void
  onSaveModify: (text: string) => void
  onCancelModify: () => void
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
      <div className="px-5 py-3 flex items-center justify-between" style={{ background: 'var(--off-white)' }}>
        <h4 className="text-caption font-bold uppercase tracking-wider" style={{ color: 'var(--navy)' }}>
          {diff.section}
        </h4>
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
