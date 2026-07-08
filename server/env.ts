import dotenv from 'dotenv'
import { z } from 'zod'

dotenv.config()

const schema = z.object({
  APP_URL: z.string().url().default('http://localhost:3000'),
  DATABASE_URL: z.string().min(1),
  SESSION_SECRET: z.string().min(32),
  UPLOAD_DIR: z.string().min(1).default('./storage/uploads'),
  DOMAIN: z.string().default('localhost'),
  OPENAI_API_KEY: z.string().min(1),
  OPENAI_MODEL: z.string().default('gpt-4o-mini'),
  ADMIN_EMAIL: z.string().email().optional(),
  ADMIN_PASSWORD: z.string().min(8).optional(),
  PORT: z.coerce.number().default(process.env.NODE_ENV === 'production' ? 3000 : 3001),
})

export const env = schema.parse(process.env)
