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

export interface CvExperience {
  title: string
  company: string
  period: string
  location: string
  bullets: string[]
}

export interface CvEducation {
  degree: string
  school: string
  location: string
  period: string
  description: string
}

export interface CvLanguage {
  language: string
  level: string
}

export interface StructuredCv {
  fullName: string
  title: string
  profile: string
  contact: {
    email: string
    phone: string
    location: string
    linkedin: string
    portfolio: string
  }
  experiences: CvExperience[]
  education: CvEducation[]
  skills: string[]
  languages: CvLanguage[]
  certifications: string[]
  interests: string[]
}

export interface UploadedDocument {
  id: string
  type: 'PDF' | 'DOCX'
  originalName: string
  extractedText: string | null
  createdAt: string
}

export interface EditorState {
  edits: Record<string, string>
  cvName: string
  template: string
  police: string
  densite: string
  interligne: string
  marges: string
  accentColor: string
  tailleTexte: number
  sectionSpacing: string
  photoPosition: string
  photoSize: string
  photoShape: string
  sections: Array<{ id: string; type: string; label: string; visible: boolean }>
  diffs: Array<{ status: string; modifiedText?: string }>
  experienceOrder: number[]
}

export interface GenerationResult {
  id: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  keywords: KeywordSet | null
  optimizations: OptimizationResult[] | null
  structuredCv: StructuredCv | null
  atsScore: number | null
  atsScoreBefore: number | null
  atsMissingKeywords: string[] | null
  editorState?: EditorState | null
  errorMessage?: string | null
}

export interface GenerationSummary {
  id: string
  status: 'PENDING' | 'COMPLETED' | 'FAILED'
  atsScore: number | null
  atsScoreBefore: number | null
  createdAt: string
  jobOffer: string
  hasCoverLetter: boolean
  hasInterviewPrep: boolean
  document: { originalName: string; type: 'PDF' | 'DOCX' }
  applications?: Array<{
    id: string
    company: string
    role: string
    status: ApplicationStatus
    jobUrl: string | null
    updatedAt: string
  }>
}

export interface DocumentSummary {
  id: string
  type: 'PDF' | 'DOCX'
  originalName: string
  size: number
  createdAt: string
  offers: Array<{ id: string; jobOffer: string; createdAt: string; atsScore: number | null; atsScoreBefore: number | null }>
  _count: { generations: number }
}

export interface InterviewPrep {
  pitch: string
  questions: Array<{ question: string; answer: string }>
  objections: Array<{ risk: string; response: string }>
  questionsToAsk: string[]
}

export type ApplicationStatus = 'TO_APPLY' | 'APPLIED' | 'FOLLOW_UP' | 'INTERVIEW' | 'OFFER' | 'REJECTED' | 'ARCHIVED'

export interface JobApplication {
  id: string
  generationId: string | null
  company: string
  role: string
  status: ApplicationStatus
  jobUrl: string | null
  notes: string | null
  followUpAt: string | null
  createdAt: string
  updatedAt: string
  generation?: {
    id: string
    atsScore: number | null
    atsScoreBefore: number | null
    document: { originalName: string }
  } | null
}

async function api<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(path, {
    credentials: 'include',
    headers: init?.body instanceof FormData ? undefined : { 'Content-Type': 'application/json' },
    ...init,
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    const message = data && typeof data.error === 'string'
      ? data.error
      : `Le serveur ne répond pas (HTTP ${response.status}). Vérifiez qu'il est démarré, puis réessayez.`
    throw new Error(message)
  }
  return (data ?? {}) as T
}

export async function extractKeywordsFromOffer(offerText: string): Promise<KeywordSet> {
  const data = await api<{ keywords: KeywordSet }>('/api/ai/keywords', {
    method: 'POST',
    body: JSON.stringify({ jobOffer: offerText }),
  })
  return data.keywords
}

export async function uploadCvDocument(cv: File, photo?: File | null): Promise<UploadedDocument> {
  const formData = new FormData()
  formData.set('cv', cv)
  if (photo) formData.set('photo', photo)

  const data = await api<{ document: UploadedDocument }>('/api/documents/upload', {
    method: 'POST',
    body: formData,
  })
  return data.document
}

export async function createGeneration(
  documentId: string,
  jobOffer: string,
  options: { mode?: string; experienceLevel?: string; situation?: string } = {},
): Promise<GenerationResult> {
  const data = await api<{ generation: GenerationResult }>('/api/generations', {
    method: 'POST',
    body: JSON.stringify({ documentId, jobOffer, mode: options.mode ?? 'preserve', experienceLevel: options.experienceLevel, situation: options.situation }),
  })
  return data.generation
}

export async function listGenerations(): Promise<GenerationSummary[]> {
  const data = await api<{ generations: GenerationSummary[] }>('/api/generations')
  return data.generations
}

export async function listDocuments(): Promise<DocumentSummary[]> {
  const data = await api<{ documents: DocumentSummary[] }>('/api/documents')
  return data.documents
}

export function documentDownloadUrl(id: string) {
  return `/api/documents/${id}/download`
}

export async function getGeneration(id: string): Promise<GenerationResult & { jobOffer: string; document: { extractedText: string | null; originalName: string } }> {
  const data = await api<{ generation: GenerationResult & { jobOffer: string; document: { extractedText: string | null; originalName: string } } }>(`/api/generations/${id}`)
  return data.generation
}

export async function generateCoverLetter(generationId: string, regenerate = false): Promise<string> {
  const data = await api<{ coverLetter: string }>(`/api/generations/${generationId}/cover-letter`, {
    method: 'POST',
    body: JSON.stringify({ regenerate }),
  })
  return data.coverLetter
}

export async function generateInterviewPrep(generationId: string, regenerate = false): Promise<InterviewPrep> {
  const data = await api<{ interviewPrep: InterviewPrep }>(`/api/generations/${generationId}/interview-prep`, {
    method: 'POST',
    body: JSON.stringify({ regenerate }),
  })
  return data.interviewPrep
}

export async function translateGenerationToEnglish(generationId: string): Promise<{
  structuredCv: StructuredCv
  optimizations: OptimizationResult[]
}> {
  return api<{ structuredCv: StructuredCv; optimizations: OptimizationResult[] }>(`/api/generations/${generationId}/translate-en`, {
    method: 'POST',
  })
}

export async function saveEditorState(generationId: string, editorState: EditorState): Promise<void> {
  await api<{ ok: true }>(`/api/generations/${generationId}`, {
    method: 'PATCH',
    body: JSON.stringify({ editorState }),
  })
}

export async function fetchOfferFromUrl(url: string): Promise<string> {
  const data = await api<{ text: string }>('/api/ai/fetch-offer', {
    method: 'POST',
    body: JSON.stringify({ url }),
  })
  return data.text
}

export async function listApplications(): Promise<JobApplication[]> {
  const data = await api<{ applications: JobApplication[] }>('/api/applications')
  return data.applications
}

export async function createApplication(input: {
  generationId?: string | null
  company: string
  role: string
  status?: ApplicationStatus
  jobUrl?: string | null
  notes?: string | null
  followUpAt?: string | null
}): Promise<JobApplication> {
  const data = await api<{ application: JobApplication }>('/api/applications', {
    method: 'POST',
    body: JSON.stringify(input),
  })
  return data.application
}

export async function updateApplication(id: string, input: Partial<{
  company: string
  role: string
  status: ApplicationStatus
  jobUrl: string | null
  notes: string | null
  followUpAt: string | null
}>): Promise<JobApplication> {
  const data = await api<{ application: JobApplication }>(`/api/applications/${id}`, {
    method: 'PATCH',
    body: JSON.stringify(input),
  })
  return data.application
}

export async function deleteApplication(id: string): Promise<void> {
  await api<{ ok: true }>(`/api/applications/${id}`, { method: 'DELETE' })
}
