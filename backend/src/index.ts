import express, { Request, Response, NextFunction } from 'express'
import helmet from 'helmet'
import dotenv from 'dotenv'
dotenv.config()

import { initSchema } from './lib/db'
import { corsMiddleware }     from './middleware/cors'
import authRoutes             from './routes/auth.route'
import employeesRoutes        from './routes/employees.route'
import transactionsRoutes     from './routes/transactions.route'
import dealsRoutes            from './routes/deals.route'
import meetingsRoutes         from './routes/meetings.route'
import chatRoutes             from './routes/chat.route'
import documentsRoutes        from './routes/documents.route'
import campaignsRoutes        from './routes/campaigns.route'
import aiStatsRoutes          from './routes/ai-stats.route'

const app = express()

// ── Security & Parsing ───────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}))
app.use(corsMiddleware)
// Increase limit to 50MB to support base64-encoded images/PDFs for OCR
app.use(express.json({ limit: '50mb' }))
app.use(express.urlencoded({ extended: true, limit: '50mb' }))

// ── Health Check ─────────────────────────────────────────────────
app.get('/health', (_: Request, res: Response) => {
  res.json({
    status: 'OK',
    app: 'Autosoft Backend',
    version: '2.0.0',
    database: process.env.DATABASE_URL ? 'PostgreSQL (Neon)' : 'SQLite (local)',
    ai: process.env.GEMINI_API_KEY ? 'Gemini 2.0 Flash ✅' : 'Not configured ⚠️',
    ts: new Date().toISOString(),
  })
})

// ── API Routes ───────────────────────────────────────────────────
app.use('/api/auth',         authRoutes)
app.use('/api/employees',    employeesRoutes)
app.use('/api/transactions', transactionsRoutes)
app.use('/api/deals',        dealsRoutes)
app.use('/api/meetings',     meetingsRoutes)
app.use('/api/chat',         chatRoutes)
app.use('/api/documents',    documentsRoutes)
app.use('/api/campaigns',    campaignsRoutes)
app.use('/api/ai-stats',     aiStatsRoutes)

// ── 404 Fallback ─────────────────────────────────────────────────
app.use((_: Request, res: Response) =>
  res.status(404).json({ error: 'Route not found' }),
)

// ── Global Error Handler ─────────────────────────────────────────
// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  console.error('Unhandled error:', err)
  const status  = err.status || err.statusCode || 500
  const message = err.message || 'Internal server error'
  res.status(status).json({ error: message })
})

// ── Start Server ─────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 4000

// Initialization logic
async function initialize() {
  try {
    if (process.env.DATABASE_URL) {
      await initSchema()
    } else if (!process.env.VERCEL) {
      // Only use SQLite for local development (not on Vercel)
      await import('./lib/db-sqlite')
    }
  } catch (err) {
    console.error('Failed to initialize database:', err)
    if (!process.env.VERCEL) process.exit(1)
  }
}

// Trigger initialization
initialize()

// Standard Express listen (only for non-Vercel environments)
if (!process.env.VERCEL) {
  app.listen(PORT, () => {
    const db = process.env.DATABASE_URL ? '🐘 PostgreSQL (Neon)' : '🗄️  SQLite (local)'
    const ai = process.env.GEMINI_API_KEY ? '🤖 Gemini 2.0 Flash' : '⚠️  AI not configured'
    console.log(`🚀 Autosoft Backend → http://localhost:${PORT}`)
    console.log(`📦 Database: ${db}`)
    console.log(`${ai}`)
    console.log(`📋 Health: http://localhost:${PORT}/health`)
  })
}

export default app
