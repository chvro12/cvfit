import { useEffect, useMemo, useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router'
import { motion } from 'framer-motion'
import {
  ArrowRight, Briefcase, CalendarClock, Check, Copy, Download, FileText,
  Loader2, Mail, MessageSquareText, PenLine, Plus, RefreshCw, Send, Trash2,
} from 'lucide-react'
import { getMe } from '../services/api'
import {
  createApplication, deleteApplication, generateCoverLetter, generateInterviewPrep,
  documentDownloadUrl, listApplications, listDocuments, listGenerations, updateApplication,
  type ApplicationStatus, type DocumentSummary, type GenerationSummary,
  type InterviewPrep, type JobApplication,
} from '../services/kimi'

const easeOutExpo = [0.16, 1, 0.3, 1] as [number, number, number, number]
type Tab = 'adaptations' | 'cvs' | 'letters' | 'applications' | 'interview'

type TabConfig = {
  id: Tab
  label: string
  path: string
}

const TABS: TabConfig[] = [
  { id: 'adaptations', label: 'Adaptations', path: '/adaptations' },
  { id: 'cvs', label: 'Bibliothèque CV', path: '/bibliotheque-cv' },
  { id: 'letters', label: 'Lettres de motivation', path: '/lettres-motivation' },
  { id: 'applications', label: 'Candidatures', path: '/candidatures' },
  { id: 'interview', label: 'Entretien', path: '/espace' },
]

function tabFromPath(pathname: string): Tab {
  if (pathname === '/bibliotheque-cv') return 'cvs'
  if (pathname === '/lettres-motivation') return 'letters'
  if (pathname === '/candidatures') return 'applications'
  if (pathname === '/adaptations') return 'adaptations'
  return 'adaptations'
}

const STATUS_LABEL: Record<ApplicationStatus, string> = {
  TO_APPLY: 'À postuler',
  APPLIED: 'Postulé',
  FOLLOW_UP: 'Relance',
  INTERVIEW: 'Entretien',
  OFFER: 'Offre',
  REJECTED: 'Refus',
  ARCHIVED: 'Archivé',
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' })
}

function formatFileSize(bytes: number) {
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} Ko`
  return `${(bytes / 1024 / 1024).toFixed(1)} Mo`
}

function scoreColor(value: number) {
  if (value < 55) return '#EF4444'
  if (value < 78) return '#F59E0B'
  return '#10B981'
}

function letterStatus(generation: GenerationSummary) {
  const application = generation.applications?.[0]
  if (!generation.hasCoverLetter) {
    return { label: 'À générer', color: '#6B7280' }
  }
  if (application && ['APPLIED', 'FOLLOW_UP', 'INTERVIEW', 'OFFER', 'REJECTED', 'ARCHIVED'].includes(application.status)) {
    return { label: 'Envoyée', color: '#10B981' }
  }
  return { label: 'Prête', color: '#F59E0B' }
}

function guessRole(jobOffer: string) {
  const firstLine = jobOffer.split('\n').map(line => line.trim()).find(Boolean)
  return firstLine?.slice(0, 90) || 'Poste à renseigner'
}

function guessCompany(jobOffer: string) {
  const match = jobOffer.match(/(?:chez|entreprise|société|company)\s+([A-ZÀ-Ÿa-z0-9&' -]{2,60})/i)
  return match?.[1]?.trim() || 'Entreprise à renseigner'
}

function EmptyState({ icon: Icon, title, children }: { icon: typeof FileText; title: string; children: React.ReactNode }) {
  return (
    <div className="bg-white border border-mid-gray rounded-2xl px-8 py-14 text-center">
      <Icon size={36} className="mx-auto mb-4 text-text-gray" />
      <h2 className="text-subsection text-navy mb-2">{title}</h2>
      <div className="text-body text-text-gray">{children}</div>
    </div>
  )
}

function CoverLetterPanel({
  generationId,
  hasExisting,
  onSaved,
}: {
  generationId: string
  hasExisting: boolean
  onSaved?: () => void
}) {
  const [letter, setLetter] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [copied, setCopied] = useState(false)

  const load = async (regenerate = false) => {
    setLoading(true)
    setError(null)
    try {
      const nextLetter = await generateCoverLetter(generationId, regenerate)
      setLetter(nextLetter)
      onSaved?.()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Génération impossible.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasExisting) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const handleCopy = async () => {
    if (!letter) return
    await navigator.clipboard.writeText(letter)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadPdf = async () => {
    if (!letter) return
    const jsPDF = (await import('jspdf')).default
    const pdf = new jsPDF({ unit: 'mm', format: 'a4' })
    const margin = 22
    const maxW = 210 - margin * 2
    pdf.setFont('helvetica', 'normal')
    pdf.setFontSize(11)
    pdf.setTextColor(30, 30, 30)
    let y = margin
    for (const paragraph of letter.split('\n')) {
      const clean = paragraph.trim()
      if (!clean) {
        y += 4
        continue
      }
      const lines = pdf.splitTextToSize(clean, maxW) as string[]
      for (const line of lines) {
        if (y > 275) {
          pdf.addPage()
          y = margin
        }
        pdf.text(line, margin, y)
        y += 5.4
      }
      y += 2
    }
    pdf.save('lettre-de-motivation.pdf')
  }

  const handleDownloadDocx = async () => {
    if (!letter) return
    const { Document, Packer, Paragraph, TextRun } = await import('docx')
    const children = letter
      .split('\n')
      .map(paragraph => paragraph.trim())
      .filter(Boolean)
      .map(paragraph => new Paragraph({
        children: [new TextRun({ text: paragraph, size: 22 })],
        spacing: { after: 200 },
      }))
    const doc = new Document({ sections: [{ children }] })
    const blob = await Packer.toBlob(doc)
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'lettre-de-motivation.docx'
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="border-t border-mid-gray px-5 py-4" style={{ background: 'var(--off-white)' }}>
      {!letter && !loading && !error && (
        <button onClick={() => load()} className="flex items-center gap-2 text-caption font-medium px-4 py-2.5 rounded-lg text-white" style={{ background: 'var(--coral)' }}>
          <PenLine size={15} />
          Générer la lettre
        </button>
      )}
      {loading && <div className="flex items-center gap-2 text-caption text-text-gray py-2"><Loader2 size={16} className="animate-spin" style={{ color: 'var(--coral)' }} />Rédaction en cours…</div>}
      {error && <p className="text-sm mb-3" style={{ color: '#B91C1C' }}>{error}</p>}
      {letter && !loading && (
        <div>
          <div className="bg-white border border-mid-gray rounded-xl p-5 mb-3 max-h-[320px] overflow-y-auto">
            {letter.split('\n').map((paragraph, i) => paragraph.trim() ? <p key={i} className="text-caption text-navy mb-2.5 leading-relaxed">{paragraph}</p> : null)}
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={handleCopy} className="flex items-center gap-1.5 text-caption px-3.5 py-2 rounded-lg border border-mid-gray text-navy hover:bg-navy-50">
              {copied ? <Check size={14} style={{ color: 'var(--success)' }} /> : <Copy size={14} />}
              {copied ? 'Copié' : 'Copier'}
            </button>
            <button onClick={handleDownloadPdf} className="flex items-center gap-1.5 text-caption px-3.5 py-2 rounded-lg border border-mid-gray text-navy hover:bg-navy-50">
              <Download size={14} />
              PDF
            </button>
            <button onClick={handleDownloadDocx} className="flex items-center gap-1.5 text-caption px-3.5 py-2 rounded-lg border border-mid-gray text-navy hover:bg-navy-50">
              <Download size={14} />
              DOCX
            </button>
            <button onClick={() => load(true)} className="flex items-center gap-1.5 text-caption px-3.5 py-2 rounded-lg border border-mid-gray text-text-gray hover:bg-light-gray">
              <RefreshCw size={14} />
              Régénérer
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

function InterviewPanel({ generationId, hasExisting }: { generationId: string; hasExisting: boolean }) {
  const [prep, setPrep] = useState<InterviewPrep | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = async (regenerate = false) => {
    setLoading(true)
    setError(null)
    try {
      setPrep(await generateInterviewPrep(generationId, regenerate))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Préparation impossible.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (hasExisting) load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div className="border-t border-mid-gray px-5 py-4" style={{ background: 'var(--off-white)' }}>
      {!prep && !loading && (
        <button onClick={() => load()} className="flex items-center gap-2 text-caption font-medium px-4 py-2.5 rounded-lg text-white" style={{ background: 'var(--coral)' }}>
          <MessageSquareText size={15} />
          Générer la préparation
        </button>
      )}
      {loading && <div className="flex items-center gap-2 text-caption text-text-gray py-2"><Loader2 size={16} className="animate-spin" style={{ color: 'var(--coral)' }} />Préparation en cours…</div>}
      {error && <p className="text-sm mb-3" style={{ color: '#B91C1C' }}>{error}</p>}
      {prep && !loading && (
        <div className="space-y-5">
          <section className="bg-white border border-mid-gray rounded-xl p-5">
            <h3 className="text-caption font-bold text-navy mb-2">Pitch 30 secondes</h3>
            <p className="text-caption text-text-gray leading-relaxed">{prep.pitch}</p>
          </section>
          <section className="bg-white border border-mid-gray rounded-xl p-5">
            <h3 className="text-caption font-bold text-navy mb-3">Questions probables</h3>
            <div className="space-y-3">
              {prep.questions.map((item, i) => (
                <div key={i}>
                  <p className="text-caption font-semibold text-navy">{item.question}</p>
                  <p className="text-small text-text-gray leading-relaxed mt-1">{item.answer}</p>
                </div>
              ))}
            </div>
          </section>
          <section className="grid md:grid-cols-2 gap-4">
            <div className="bg-white border border-mid-gray rounded-xl p-5">
              <h3 className="text-caption font-bold text-navy mb-3">Objections à préparer</h3>
              {prep.objections.map((item, i) => (
                <div key={i} className="mb-3 last:mb-0">
                  <p className="text-small font-semibold text-navy">{item.risk}</p>
                  <p className="text-small text-text-gray mt-1">{item.response}</p>
                </div>
              ))}
            </div>
            <div className="bg-white border border-mid-gray rounded-xl p-5">
              <h3 className="text-caption font-bold text-navy mb-3">Questions à poser</h3>
              <ul className="space-y-2">
                {prep.questionsToAsk.map((question, i) => <li key={i} className="text-small text-text-gray">• {question}</li>)}
              </ul>
            </div>
          </section>
          <button onClick={() => load(true)} className="flex items-center gap-1.5 text-caption px-3.5 py-2 rounded-lg border border-mid-gray text-text-gray hover:bg-light-gray">
            <RefreshCw size={14} />
            Régénérer
          </button>
        </div>
      )}
    </div>
  )
}

export default function Espace() {
  const navigate = useNavigate()
  const location = useLocation()
  const [tab, setTab] = useState<Tab>(() => tabFromPath(location.pathname))
  const [generations, setGenerations] = useState<GenerationSummary[]>([])
  const [documents, setDocuments] = useState<DocumentSummary[]>([])
  const [applications, setApplications] = useState<JobApplication[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [openLetterId, setOpenLetterId] = useState<string | null>(null)
  const [openInterviewId, setOpenInterviewId] = useState<string | null>(null)
  const [openOfferDocId, setOpenOfferDocId] = useState<string | null>(null)
  const [copiedOfferId, setCopiedOfferId] = useState<string | null>(null)
  const [addingApplication, setAddingApplication] = useState(false)
  const [form, setForm] = useState({ company: '', role: '', jobUrl: '', notes: '', followUpAt: '' })

  useEffect(() => {
    setTab(tabFromPath(location.pathname))
  }, [location.pathname])

  const refresh = async () => {
    const [nextGenerations, nextDocuments, nextApplications] = await Promise.all([
      listGenerations(),
      listDocuments(),
      listApplications(),
    ])
    setGenerations(nextGenerations)
    setDocuments(nextDocuments)
    setApplications(nextApplications)
  }

  useEffect(() => {
    getMe()
      .then(refresh)
      .catch((err) => {
        if (err instanceof Error && /401|Authentification/i.test(err.message)) {
          navigate('/connexion')
          return
        }
        setError(err instanceof Error ? err.message : 'Chargement impossible.')
      })
      .finally(() => setLoading(false))
  }, [navigate])

  const stats = useMemo(() => ({
    cvs: documents.length,
    adaptations: generations.length,
    letters: generations.filter(generation => generation.hasCoverLetter).length,
    applications: applications.filter(app => app.status !== 'ARCHIVED').length,
    interviews: applications.filter(app => app.status === 'INTERVIEW').length,
  }), [applications, documents.length, generations])

  /* relances dues aujourd'hui ou en retard */
  const dueFollowUps = useMemo(() => {
    const endOfDay = new Date()
    endOfDay.setHours(23, 59, 59, 999)
    return applications.filter(app =>
      app.followUpAt
      && new Date(app.followUpAt) <= endOfDay
      && !['OFFER', 'REJECTED', 'ARCHIVED'].includes(app.status))
  }, [applications])

  const createApplicationFromGeneration = async (generation: GenerationSummary) => {
    const application = await createApplication({
      generationId: generation.id,
      company: guessCompany(generation.jobOffer),
      role: guessRole(generation.jobOffer),
      status: 'TO_APPLY',
    })
    setApplications(prev => [application, ...prev])
    navigate('/candidatures')
  }

  const submitManualApplication = async (event: React.FormEvent) => {
    event.preventDefault()
    const application = await createApplication({
      company: form.company,
      role: form.role,
      jobUrl: form.jobUrl || null,
      notes: form.notes || null,
      followUpAt: form.followUpAt ? new Date(form.followUpAt).toISOString() : null,
      status: 'TO_APPLY',
    })
    setApplications(prev => [application, ...prev])
    setForm({ company: '', role: '', jobUrl: '', notes: '', followUpAt: '' })
    setAddingApplication(false)
  }

  return (
    <div className="min-h-[60dvh]" style={{ background: 'var(--off-white)' }}>
      <div className="max-w-[1120px] mx-auto px-6 lg:px-12 py-10 lg:py-14">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 mb-7">
          <div>
            <h1 className="text-section text-navy mb-1">Bibliothèque CVFit</h1>
            <p className="text-body text-text-gray">CV, lettres de motivation, adaptations, candidatures et préparation entretien.</p>
          </div>
          <Link to="/app" className="flex items-center gap-2 text-button text-white px-5 py-3 rounded-xl w-fit" style={{ background: 'var(--coral)' }}>
            <Plus size={16} />
            Nouvelle adaptation
          </Link>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
          {[
            ['CV', stats.cvs],
            ['Adaptations', stats.adaptations],
            ['Lettres', stats.letters],
            ['Candidatures', stats.applications],
          ].map(([label, value]) => (
            <div key={label} className="bg-white border border-mid-gray rounded-xl px-4 py-3">
              <p className="text-small text-text-gray">{label}</p>
              <p className="text-[22px] font-bold text-navy">{value}</p>
            </div>
          ))}
        </div>

        <div className="flex gap-2 overflow-x-auto pb-2 mb-6">
          {TABS.map(({ id, label, path }) => (
            <button
              key={id}
              onClick={() => navigate(path)}
              className="shrink-0 text-caption font-semibold px-4 py-2 rounded-lg border transition-colors"
              style={{
                borderColor: tab === id ? 'var(--coral)' : 'var(--mid-gray)',
                color: tab === id ? 'var(--coral)' : 'var(--navy)',
                background: tab === id ? 'var(--coral-50)' : '#fff',
              }}
            >
              {label}
            </button>
          ))}
        </div>

        {/* Relances a faire aujourd'hui */}
        {!loading && dueFollowUps.length > 0 && (
          <div className="mb-6 rounded-xl border px-4 py-3" style={{ borderColor: '#FDE68A', background: '#FFFBEB' }}>
            <p className="text-caption font-bold mb-1.5" style={{ color: '#B45309' }}>
              <CalendarClock size={14} className="inline mr-1.5 -mt-0.5" />
              {dueFollowUps.length} relance{dueFollowUps.length > 1 ? 's' : ''} à faire
            </p>
            <div className="flex flex-wrap gap-2">
              {dueFollowUps.map(app => (
                <button
                  key={app.id}
                  onClick={() => navigate('/candidatures')}
                  className="text-small px-2.5 py-1 rounded-full border font-medium hover:bg-white transition-colors"
                  style={{ borderColor: '#FDE68A', color: '#92400E' }}
                >
                  {app.company} — {app.role.slice(0, 40)}{app.followUpAt ? ` · ${formatDate(app.followUpAt)}` : ''}
                </button>
              ))}
            </div>
          </div>
        )}

        {loading && <div className="flex items-center justify-center py-20"><Loader2 size={32} className="animate-spin" style={{ color: 'var(--coral)' }} /></div>}
        {error && <div className="rounded-xl border px-5 py-4" style={{ borderColor: '#FCA5A5', background: '#FEF2F2' }}><p className="text-sm" style={{ color: '#B91C1C' }}>{error}</p></div>}

        {!loading && !error && tab === 'adaptations' && (
          generations.length === 0 ? (
            <EmptyState icon={FileText} title="Aucune adaptation pour le moment">
              <p className="mb-6">Uploadez votre CV et collez une offre d&apos;emploi pour créer votre première adaptation.</p>
              <Link to="/app" className="inline-flex items-center gap-2 text-button text-white px-6 py-3 rounded-xl" style={{ background: 'var(--coral)' }}>Adapter mon CV <ArrowRight size={16} /></Link>
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-4">
              {generations.map((generation, i) => (
                <motion.div key={generation.id} initial={{ opacity: 0, y: 15 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.04, duration: 0.3, ease: easeOutExpo }} className="bg-white border border-mid-gray rounded-2xl overflow-hidden">
                  <div className="px-5 py-4">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                          <FileText size={16} className="text-navy shrink-0" />
                          <span className="text-caption font-semibold text-navy truncate">{generation.document.originalName}</span>
                          <span className="text-small text-text-gray shrink-0">{formatDate(generation.createdAt)}</span>
                        </div>
                        <p className="text-small text-text-gray line-clamp-2">{generation.jobOffer}…</p>
                      </div>
                      {generation.atsScore !== null && generation.atsScoreBefore !== null && (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-[13px] font-bold" style={{ color: scoreColor(generation.atsScoreBefore) }}>{generation.atsScoreBefore}</span>
                          <ArrowRight size={13} className="text-text-gray" />
                          <span className="text-[15px] font-bold" style={{ color: scoreColor(generation.atsScore) }}>{generation.atsScore}</span>
                          <span className="text-small text-text-gray">ATS</span>
                        </div>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-2 mt-4">
                      <button onClick={() => navigate(`/app?generation=${generation.id}`)} className="flex items-center gap-1.5 text-caption font-medium px-4 py-2 rounded-lg border text-navy hover:bg-navy-50" style={{ borderColor: 'var(--mid-gray)' }}>
                        <PenLine size={14} />
                        Rouvrir dans l&apos;éditeur
                      </button>
                      <button onClick={() => createApplicationFromGeneration(generation)} className="flex items-center gap-1.5 text-caption font-medium px-4 py-2 rounded-lg border text-navy hover:bg-navy-50" style={{ borderColor: 'var(--mid-gray)' }}>
                        <Briefcase size={14} />
                        Créer une candidature
                      </button>
                      <button onClick={() => setOpenLetterId(openLetterId === generation.id ? null : generation.id)} className="flex items-center gap-1.5 text-caption font-medium px-4 py-2 rounded-lg border" style={{ borderColor: openLetterId === generation.id ? 'var(--coral)' : 'var(--mid-gray)', color: openLetterId === generation.id ? 'var(--coral)' : 'var(--navy)' }}>
                        <Mail size={14} />
                        Lettre
                        {generation.hasCoverLetter && <Check size={13} style={{ color: 'var(--success)' }} />}
                      </button>
                      <button onClick={() => setOpenInterviewId(openInterviewId === generation.id ? null : generation.id)} className="flex items-center gap-1.5 text-caption font-medium px-4 py-2 rounded-lg border" style={{ borderColor: openInterviewId === generation.id ? 'var(--coral)' : 'var(--mid-gray)', color: openInterviewId === generation.id ? 'var(--coral)' : 'var(--navy)' }}>
                        <MessageSquareText size={14} />
                        Entretien
                        {generation.hasInterviewPrep && <Check size={13} style={{ color: 'var(--success)' }} />}
                      </button>
                    </div>
                  </div>
                  {openLetterId === generation.id && (
                    <CoverLetterPanel
                      generationId={generation.id}
                      hasExisting={generation.hasCoverLetter}
                      onSaved={() => setGenerations(prev => prev.map(item => item.id === generation.id ? { ...item, hasCoverLetter: true } : item))}
                    />
                  )}
                  {openInterviewId === generation.id && <InterviewPanel generationId={generation.id} hasExisting={generation.hasInterviewPrep} />}
                </motion.div>
              ))}
            </div>
          )
        )}

        {!loading && !error && tab === 'cvs' && (
          documents.length === 0 ? (
            <EmptyState icon={FileText} title="Aucun CV uploadé">
              <Link to="/app" className="inline-flex items-center gap-2 text-button text-white px-6 py-3 rounded-xl" style={{ background: 'var(--coral)' }}>Uploader un CV <ArrowRight size={16} /></Link>
            </EmptyState>
          ) : (
            <div className="grid md:grid-cols-2 gap-4">
              {documents.map(document => (
                <div key={document.id} className="bg-white border border-mid-gray rounded-2xl p-5">
                  <div className="flex items-start gap-3">
                    <FileText size={22} className="text-navy shrink-0 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <h3 className="text-caption font-semibold text-navy truncate">{document.originalName}</h3>
                      <p className="text-small text-text-gray mt-1">{document.type} · {formatFileSize(document.size)} · {formatDate(document.createdAt)}</p>
                      <p className="text-small text-text-gray mt-1">{document._count.generations} adaptation{document._count.generations > 1 ? 's' : ''}</p>
                      <div className="flex flex-wrap gap-2 mt-3">
                        <a
                          href={documentDownloadUrl(document.id)}
                          className="inline-flex items-center gap-1.5 text-small font-semibold px-3 py-1.5 rounded-lg border border-mid-gray text-navy hover:bg-navy-50"
                        >
                          <Download size={13} />
                          Télécharger
                        </a>
                        {document.offers.length > 0 && (
                          <button
                            onClick={() => setOpenOfferDocId(openOfferDocId === document.id ? null : document.id)}
                            className="inline-flex items-center gap-1.5 text-small font-semibold px-3 py-1.5 rounded-lg border"
                            style={{
                              borderColor: openOfferDocId === document.id ? 'var(--coral)' : 'var(--mid-gray)',
                              color: openOfferDocId === document.id ? 'var(--coral)' : 'var(--navy)',
                              background: openOfferDocId === document.id ? 'var(--coral-50)' : '#fff',
                            }}
                          >
                            <Briefcase size={13} />
                            Voir l&apos;offre d&apos;emploi{document.offers.length > 1 ? ` (${document.offers.length})` : ''}
                          </button>
                        )}
                      </div>
                      {openOfferDocId === document.id && (
                        <div className="mt-3 space-y-3">
                          {document.offers.map(offer => (
                            <div key={offer.id} className="rounded-xl border border-mid-gray p-3" style={{ background: 'var(--off-white)' }}>
                              <div className="flex items-center justify-between gap-2 mb-2">
                                <span className="text-small font-semibold text-navy">
                                  Offre du {formatDate(offer.createdAt)}
                                  {offer.atsScore !== null && offer.atsScoreBefore !== null && (
                                    <span className="ml-2 font-bold" style={{ color: scoreColor(offer.atsScore) }}>
                                      {offer.atsScoreBefore} → {offer.atsScore} ATS
                                    </span>
                                  )}
                                </span>
                                <button
                                  onClick={async () => {
                                    await navigator.clipboard.writeText(offer.jobOffer)
                                    setCopiedOfferId(offer.id)
                                    window.setTimeout(() => setCopiedOfferId(null), 2000)
                                  }}
                                  className="inline-flex items-center gap-1 text-small px-2 py-1 rounded-md border border-mid-gray text-text-gray hover:bg-white"
                                >
                                  {copiedOfferId === offer.id ? <Check size={12} style={{ color: 'var(--success)' }} /> : <Copy size={12} />}
                                  {copiedOfferId === offer.id ? 'Copié' : 'Copier'}
                                </button>
                              </div>
                              <p className="text-small text-text-gray whitespace-pre-line max-h-[180px] overflow-y-auto">
                                {offer.jobOffer}
                              </p>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )
        )}

        {!loading && !error && tab === 'letters' && (
          generations.filter(generation => generation.status === 'COMPLETED').length === 0 ? (
            <EmptyState icon={Mail} title="Aucune lettre de motivation">
              Créez d&apos;abord une adaptation de CV pour générer une lettre contextualisée à partir de l&apos;offre.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-4">
              {generations.filter(generation => generation.status === 'COMPLETED').map((generation, i) => {
                const status = letterStatus(generation)
                const application = generation.applications?.[0] ?? null

                return (
                  <motion.div
                    key={generation.id}
                    initial={{ opacity: 0, y: 15 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.04, duration: 0.3, ease: easeOutExpo }}
                    className="bg-white border border-mid-gray rounded-2xl overflow-hidden"
                  >
                    <div className="px-5 py-4">
                      <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                        <div className="min-w-0">
                          <div className="flex items-center gap-2 flex-wrap mb-2">
                            <Mail size={16} className="text-navy shrink-0" />
                            <h2 className="text-caption font-bold text-navy">
                              {application ? `${application.role} · ${application.company}` : generation.document.originalName}
                            </h2>
                            <span
                              className="text-small font-semibold px-2 py-1 rounded-full"
                              style={{ color: status.color, background: status.color === '#10B981' ? '#ECFDF5' : status.color === '#F59E0B' ? '#FFFBEB' : 'var(--navy-50)' }}
                            >
                              {status.label}
                            </span>
                          </div>
                          <p className="text-small text-text-gray mb-1">Créée à partir du CV : {generation.document.originalName}</p>
                          <p className="text-small text-text-gray line-clamp-2">{generation.jobOffer}…</p>
                          {application && (
                            <p className="text-small text-text-gray mt-2">
                              Candidature : {STATUS_LABEL[application.status]} · mise à jour le {formatDate(application.updatedAt)}
                            </p>
                          )}
                        </div>
                        <div className="flex flex-wrap gap-2 shrink-0">
                          <button
                            onClick={() => setOpenLetterId(openLetterId === generation.id ? null : generation.id)}
                            className="flex items-center gap-1.5 text-caption font-medium px-4 py-2 rounded-lg border"
                            style={{
                              borderColor: openLetterId === generation.id ? 'var(--coral)' : 'var(--mid-gray)',
                              color: openLetterId === generation.id ? 'var(--coral)' : 'var(--navy)',
                              background: openLetterId === generation.id ? 'var(--coral-50)' : '#fff',
                            }}
                          >
                            <PenLine size={14} />
                            {generation.hasCoverLetter ? 'Ouvrir la lettre' : 'Générer'}
                          </button>
                          {!application && (
                            <button
                              onClick={() => createApplicationFromGeneration(generation)}
                              className="flex items-center gap-1.5 text-caption font-medium px-4 py-2 rounded-lg border text-navy hover:bg-navy-50"
                              style={{ borderColor: 'var(--mid-gray)' }}
                            >
                              <Briefcase size={14} />
                              Créer une candidature
                            </button>
                          )}
                          {application?.jobUrl && (
                            <a
                              href={application.jobUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-caption font-medium px-4 py-2 rounded-lg border text-navy hover:bg-navy-50"
                              style={{ borderColor: 'var(--mid-gray)' }}
                            >
                              <Send size={14} />
                              Offre
                            </a>
                          )}
                        </div>
                      </div>
                    </div>
                    {openLetterId === generation.id && (
                      <CoverLetterPanel
                        generationId={generation.id}
                        hasExisting={generation.hasCoverLetter}
                        onSaved={() => setGenerations(prev => prev.map(item => item.id === generation.id ? { ...item, hasCoverLetter: true } : item))}
                      />
                    )}
                  </motion.div>
                )
              })}
            </div>
          )
        )}

        {!loading && !error && tab === 'applications' && (
          <div className="space-y-4">
            <div className="flex justify-end">
              <button onClick={() => setAddingApplication(!addingApplication)} className="flex items-center gap-2 text-caption font-semibold px-4 py-2 rounded-lg text-white" style={{ background: 'var(--coral)' }}>
                <Plus size={14} />
                Ajouter une candidature
              </button>
            </div>
            {addingApplication && (
              <form onSubmit={submitManualApplication} className="bg-white border border-mid-gray rounded-2xl p-5 grid md:grid-cols-2 gap-3">
                <input required value={form.company} onChange={e => setForm(prev => ({ ...prev, company: e.target.value }))} placeholder="Entreprise" className="border border-mid-gray rounded-lg px-3 py-2 text-caption outline-none" />
                <input required value={form.role} onChange={e => setForm(prev => ({ ...prev, role: e.target.value }))} placeholder="Poste" className="border border-mid-gray rounded-lg px-3 py-2 text-caption outline-none" />
                <input value={form.jobUrl} onChange={e => setForm(prev => ({ ...prev, jobUrl: e.target.value }))} placeholder="Lien de l'offre" className="border border-mid-gray rounded-lg px-3 py-2 text-caption outline-none" />
                <input type="date" value={form.followUpAt} onChange={e => setForm(prev => ({ ...prev, followUpAt: e.target.value }))} className="border border-mid-gray rounded-lg px-3 py-2 text-caption outline-none" />
                <textarea value={form.notes} onChange={e => setForm(prev => ({ ...prev, notes: e.target.value }))} placeholder="Notes" className="md:col-span-2 border border-mid-gray rounded-lg px-3 py-2 text-caption outline-none min-h-[90px]" />
                <button className="text-caption font-semibold text-white px-4 py-2 rounded-lg w-fit" style={{ background: 'var(--coral)' }}>Enregistrer</button>
              </form>
            )}
            {applications.length === 0 ? (
              <EmptyState icon={Briefcase} title="Aucune candidature suivie">
                Créez une candidature depuis une adaptation ou ajoutez-la manuellement.
              </EmptyState>
            ) : (
              <div className="grid gap-3">
                {applications.map(application => (
                  <div key={application.id} className="bg-white border border-mid-gray rounded-2xl p-5">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-3">
                      <div>
                        <h3 className="text-caption font-bold text-navy">{application.role}</h3>
                        <p className="text-small text-text-gray mt-1">{application.company}</p>
                        {application.followUpAt && <p className="text-small mt-1" style={{ color: 'var(--coral)' }}><CalendarClock size={13} className="inline mr-1" />Relance le {formatDate(application.followUpAt)}</p>}
                        {application.notes && <p className="text-small text-text-gray mt-2 max-w-[680px]">{application.notes}</p>}
                      </div>
                      <div className="flex flex-wrap gap-2">
                        <select value={application.status} onChange={async e => {
                          const updated = await updateApplication(application.id, { status: e.target.value as ApplicationStatus })
                          setApplications(prev => prev.map(item => item.id === updated.id ? { ...item, ...updated } : item))
                        }} className="text-small border border-mid-gray rounded-lg px-2 py-1.5 bg-white">
                          {Object.entries(STATUS_LABEL).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                        </select>
                        {application.jobUrl && <a href={application.jobUrl} target="_blank" rel="noopener noreferrer" className="text-small border border-mid-gray rounded-lg px-3 py-1.5 text-navy hover:bg-navy-50">Offre</a>}
                        <button onClick={async () => {
                          await deleteApplication(application.id)
                          setApplications(prev => prev.filter(item => item.id !== application.id))
                        }} className="text-small border border-mid-gray rounded-lg px-2 py-1.5 text-text-gray hover:text-error">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {!loading && !error && tab === 'interview' && (
          generations.filter(generation => generation.status === 'COMPLETED').length === 0 ? (
            <EmptyState icon={MessageSquareText} title="Aucune préparation disponible">
              Créez d&apos;abord une adaptation de CV pour générer une préparation entretien ciblée.
            </EmptyState>
          ) : (
            <div className="flex flex-col gap-4">
              {generations.filter(generation => generation.status === 'COMPLETED').map(generation => (
                <div key={generation.id} className="bg-white border border-mid-gray rounded-2xl overflow-hidden">
                  <div className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div>
                      <p className="text-caption font-semibold text-navy">{generation.document.originalName}</p>
                      <p className="text-small text-text-gray line-clamp-1">{generation.jobOffer}</p>
                    </div>
                    <button onClick={() => setOpenInterviewId(openInterviewId === generation.id ? null : generation.id)} className="flex items-center gap-1.5 text-caption font-medium px-4 py-2 rounded-lg border w-fit" style={{ borderColor: 'var(--mid-gray)', color: 'var(--navy)' }}>
                      <MessageSquareText size={14} />
                      Préparer l&apos;entretien
                    </button>
                  </div>
                  {openInterviewId === generation.id && <InterviewPanel generationId={generation.id} hasExisting={generation.hasInterviewPrep} />}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}
