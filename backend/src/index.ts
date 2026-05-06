import express from 'express'
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
app.use(helmet())
app.use(corsMiddleware)
app.use(express.json({ limit: '10mb' }))
app.use(express.urlencoded({ extended: true }))

// ── Health Check ─────────────────────────────────────────────────
app.get('/health', (_, res) => {
  res.json({
    status: 'OK',
    app: 'Autosoft Backend',
    database: process.env.DATABASE_URL ? 'PostgreSQL (Neon)' : 'SQLite (local)',
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
app.use((_, res) => res.status(404).json({ error: 'Route not found' }))

// ── Start Server ─────────────────────────────────────────────────
const PORT = Number(process.env.PORT) || 4000

async function start() {
  // Init PostgreSQL schema if DATABASE_URL is set, else SQLite auto-inits
  if (process.env.DATABASE_URL) {
    await initSchema()
  } else {
    // SQLite: init by importing (side-effect)
    await import('./lib/db-sqlite')
  }
  app.listen(PORT, () => {
    const db = process.env.DATABASE_URL ? '🐘 PostgreSQL (Neon)' : '🗄️  SQLite (local)'
    console.log(`🚀 Autosoft Backend → http://localhost:${PORT}`)
    console.log(`📦 Database: ${db}`)
    console.log(`📋 Health: http://localhost:${PORT}/health`)
  })
}

start().catch(console.error)
export default app
