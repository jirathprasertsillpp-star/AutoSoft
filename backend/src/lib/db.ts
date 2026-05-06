import { Pool } from 'pg'
import { randomUUID } from 'crypto'
import bcrypt from 'bcryptjs'
import dotenv from 'dotenv'
dotenv.config()

// ── Connection ───────────────────────────────────────────────────
let pool: Pool | null = null

if (process.env.DATABASE_URL) {
  pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false },
    max: 10,
  })
  console.log('🐘 Using PostgreSQL (Neon)')
} else {
  console.log('🗄️  DATABASE_URL not set — using SQLite for local dev')
}

// ── Param converter: $1,$2 → ? for SQLite ───────────────────────
function toSQLite(sql: string): string {
  let i = 0
  return sql.replace(/\$\d+/g, () => { i++; return '?' })
}

// ── Universal Query Interface ────────────────────────────────────
export async function queryAll(sql: string, params: any[] = []): Promise<any[]> {
  if (pool) {
    const { rows } = await pool.query(sql, params)
    return rows
  }
  // SQLite fallback — convert $1,$2 → ?
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { db } = require('./db-sqlite') as { db: any }
  return db.prepare(toSQLite(sql)).all(...params) as any[]
}

export async function queryOne(sql: string, params: any[] = []): Promise<any | null> {
  const rows = await queryAll(sql, params)
  return rows[0] ?? null
}

export async function run(sql: string, params: any[] = []): Promise<void> {
  if (pool) {
    await pool.query(sql, params)
    return
  }
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const { db } = require('./db-sqlite') as { db: any }
  db.prepare(toSQLite(sql)).run(...params)
}

export function newId(): string {
  return randomUUID()
}

// ── Schema Init (PostgreSQL only) ────────────────────────────────
export async function initSchema(): Promise<void> {
  if (!pool) return

  await pool.query(`
    CREATE TABLE IF NOT EXISTS companies (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
      industry TEXT, size TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
      role TEXT DEFAULT 'staff', department TEXT, avatar TEXT,
      color TEXT DEFAULT '#C4956A', phone TEXT, salary TEXT,
      leave_total INTEGER DEFAULT 15, leave_used INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id), description TEXT NOT NULL, amount NUMERIC NOT NULL,
      type TEXT NOT NULL CHECK (type IN ('income','expense')), category TEXT DEFAULT 'ค่าใช้จ่าย',
      status TEXT DEFAULT 'pending', date DATE DEFAULT CURRENT_DATE, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS deals (
      id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id), name TEXT NOT NULL, value NUMERIC DEFAULT 0,
      stage TEXT DEFAULT 'ติดต่อ', probability INTEGER DEFAULT 50,
      contact TEXT, email TEXT, phone TEXT, notes TEXT,
      created_at TIMESTAMPTZ DEFAULT NOW(), updated_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS meetings (
      id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id), title TEXT NOT NULL, summary TEXT, decisions TEXT,
      sentiment TEXT DEFAULT 'neutral', duration_minutes INTEGER DEFAULT 60,
      participants INTEGER DEFAULT 1, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS action_items (
      id TEXT PRIMARY KEY, meeting_id TEXT REFERENCES meetings(id) ON DELETE CASCADE,
      company_id TEXT REFERENCES companies(id) ON DELETE CASCADE, task TEXT NOT NULL,
      assigned_to TEXT, due_date TEXT, priority TEXT DEFAULT 'med',
      done INTEGER DEFAULT 0, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id), session_id TEXT NOT NULL DEFAULT 'default',
      role TEXT NOT NULL CHECK (role IN ('user','ai')), content TEXT NOT NULL,
      created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS documents (
      id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id), name TEXT NOT NULL, size TEXT,
      status TEXT DEFAULT 'pending', risk_score INTEGER, risk_level TEXT,
      risks TEXT DEFAULT '[]', summary TEXT, created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS campaigns (
      id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id), name TEXT NOT NULL, channel TEXT,
      budget NUMERIC DEFAULT 0, spent NUMERIC DEFAULT 0, reach INTEGER DEFAULT 0,
      clicks INTEGER DEFAULT 0, conversions INTEGER DEFAULT 0,
      status TEXT DEFAULT 'active', created_at TIMESTAMPTZ DEFAULT NOW()
    );
    CREATE TABLE IF NOT EXISTS ai_logs (
      id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
      user_id TEXT REFERENCES users(id), agent TEXT NOT NULL, action TEXT NOT NULL,
      tokens_used INTEGER DEFAULT 0, cost_thb NUMERIC DEFAULT 0,
      status TEXT DEFAULT 'success', created_at TIMESTAMPTZ DEFAULT NOW()
    );
  `)

  await seedDemoPG()
  console.log('✅ PostgreSQL schema ready')
}

// ── Demo Seed (PostgreSQL) ───────────────────────────────────────
async function seedDemoPG(): Promise<void> {
  const existing = await queryOne('SELECT COUNT(*)::int as c FROM users', [])
  if ((existing?.c ?? 0) > 0) return

  const companyId = newId(), userId = newId()
  const hash = bcrypt.hashSync('demo1234', 10)

  await run(`INSERT INTO companies (id,name,slug,industry,size) VALUES ($1,$2,$3,$4,$5) ON CONFLICT (slug) DO NOTHING`,
    [companyId, 'Autosoft Demo Company', 'autosoft-demo', 'Technology', 'SME'])
  await run(`INSERT INTO users (id,company_id,name,email,password_hash,role,department,color,phone,salary,status)
    VALUES ($1,$2,$3,$4,$5,'CEO','Executive','#C4956A','081-234-5678','120,000','active') ON CONFLICT (email) DO NOTHING`,
    [userId, companyId, 'คุณสมชาย วงศ์ใหญ่', 'demo@autosoft.com', hash])

  const emps = [
    ['คุณสมหญิง รักงาน','hr@demo.com','HR Manager','HR','#6B8E6E','082-111-2222','65,000'],
    ['คุณประสิทธิ์ บัญชีดี','finance@demo.com','Finance Manager','Finance','#3498DB','083-333-4444','70,000'],
    ['คุณวิภา ขายเก่ง','sales@demo.com','Sales Manager','Sales','#9B59B6','084-555-6666','60,000'],
    ['คุณมานะ ตั้งใจทำ','dev@demo.com','Developer','IT','#E67E22','085-777-8888','55,000'],
    ['คุณสมศรี ใจดี','marketing@demo.com','Marketing Lead','Marketing','#1ABC9C','086-999-0000','58,000'],
  ]
  for (const [n,e,r,d,c,p,s] of emps) {
    await run(`INSERT INTO users (id,company_id,name,email,password_hash,role,department,color,phone,salary,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active') ON CONFLICT (email) DO NOTHING`,
      [newId(),companyId,n,e,bcrypt.hashSync('demo1234',10),r,d,c,p,s])
  }
  const txns: any[][] = [
    ['ค่าเช่าออฟฟิศ เดือน พ.ค.',45000,'expense','ค่าใช้จ่าย','approved'],
    ['รายได้จากโปรเจค Website ABC Corp',180000,'income','รายได้','approved'],
    ['ค่าไฟ + น้ำ เดือน เม.ย.',8500,'expense','ค่าใช้จ่าย','approved'],
    ['ซื้อ MacBook Pro สำหรับทีม Dev',89000,'expense','IT & อุปกรณ์','pending'],
    ['รายได้ Consulting บริษัท XYZ',75000,'income','รายได้','approved'],
    ['ค่า Google Workspace / เดือน',12000,'expense','IT & อุปกรณ์','approved'],
    ['ค่าโฆษณา Facebook Ads',25000,'expense','Marketing','pending'],
    ['รายได้ App Development',250000,'income','รายได้','approved'],
  ]
  for (const [d,a,t,c,s] of txns) {
    await run(`INSERT INTO transactions (id,company_id,user_id,description,amount,type,category,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [newId(),companyId,userId,d,a,t,c,s])
  }
  const deals: any[][] = [
    ['โปรเจค E-Commerce บริษัท AAA',450000,'เจรจา',70,'คุณแดง'],
    ['ระบบ CRM สำหรับ BBB Corp',320000,'ติดต่อ',40,'คุณน้ำ'],
    ['Mobile App สำหรับ CCC Inc',680000,'เสนอราคา',85,'คุณบุญ'],
    ['ดูแลระบบ IT / DDD Co.',120000,'ปิดการขาย',95,'คุณมี'],
    ['Dashboard Analytics EEE',200000,'ติดต่อ',30,'คุณใจ'],
  ]
  for (const [n,v,st,pr,co] of deals) {
    await run(`INSERT INTO deals (id,company_id,user_id,name,value,stage,probability,contact)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`, [newId(),companyId,userId,n,v,st,pr,co])
  }
  const camps: any[][] = [
    ['Facebook Lead Gen Q2','Facebook',50000,32000,45000,1200,85],
    ['Google Ads — Brand Awareness','Google',30000,18000,28000,900,42],
    ['LinkedIn B2B Campaign','LinkedIn',25000,12000,15000,600,28],
  ]
  for (const [n,ch,b,sp,r,cl,cv] of camps) {
    await run(`INSERT INTO campaigns (id,company_id,user_id,name,channel,budget,spent,reach,clicks,conversions,status)
      VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active')`,
      [newId(),companyId,userId,n,ch,b,sp,r,cl,cv])
  }
  console.log('🌱 Demo data seeded! Login: demo@autosoft.com / demo1234')
}
