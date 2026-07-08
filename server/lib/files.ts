import { mkdir, readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import mammoth from 'mammoth'
import { PDFParse } from 'pdf-parse'
import { env } from '../env'
import { ApiError } from './errors'

export type DocumentKind = 'PDF' | 'DOCX'

export function detectDocumentType(file: Express.Multer.File): DocumentKind {
  const name = file.originalname.toLowerCase()
  if (file.mimetype === 'application/pdf' || name.endsWith('.pdf')) return 'PDF'
  if (
    file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
    name.endsWith('.docx')
  ) return 'DOCX'
  throw new ApiError(400, 'Format CV non supporte. Importez un PDF ou DOCX.')
}

export async function storeUpload(userId: string, file: Express.Multer.File, subdir = 'documents') {
  await mkdir(env.UPLOAD_DIR, { recursive: true })
  const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_')
  const relativePath = path.join(userId, subdir, `${Date.now()}-${safeName}`)
  const absolutePath = path.join(env.UPLOAD_DIR, relativePath)
  await mkdir(path.dirname(absolutePath), { recursive: true })
  await writeFile(absolutePath, file.buffer)
  return absolutePath
}

export async function extractText(filePath: string, type: DocumentKind) {
  if (type === 'DOCX') {
    const result = await mammoth.extractRawText({ path: filePath })
    return result.value.trim()
  }

  const buffer = await readFile(filePath)
  const parser = new PDFParse({ data: buffer })
  try {
    const result = await parser.getText()
    return result.text.trim()
  } finally {
    await parser.destroy()
  }
}
