// Local SQLite database (used only when DATABASE_URL is not set)
import Database from 'better-sqlite3'
import path from 'path'
import fs from 'fs'
import bcrypt from 'bcryptjs'
import { randomUUID } from 'crypto'

const DATA_DIR = path.join(process.cwd(), 'data')
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true })

// eslint-disable-next-line @typescript-eslint/no-var-requires
const BetterSqlite3 = require('better-sqlite3')
export const db = new BetterSqlite3(path.join(DATA_DIR, 'autosoft.db')) as any
db.pragma('journal_mode = WAL')
db.pragma('foreign_keys = ON')

db.exec(`
  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY, name TEXT NOT NULL, slug TEXT UNIQUE NOT NULL,
    industry TEXT, size TEXT, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL,
    role TEXT DEFAULT 'staff', department TEXT, avatar TEXT, color TEXT DEFAULT '#C4956A',
    phone TEXT, salary TEXT, leave_total INTEGER DEFAULT 15, leave_used INTEGER DEFAULT 0,
    status TEXT DEFAULT 'active', created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS transactions (
    id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id), description TEXT NOT NULL, amount REAL NOT NULL,
    type TEXT NOT NULL, category TEXT DEFAULT 'ค่าใช้จ่าย', status TEXT DEFAULT 'pending',
    date TEXT DEFAULT (date('now')), created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS deals (
    id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id), name TEXT NOT NULL, value REAL DEFAULT 0,
    stage TEXT DEFAULT 'ติดต่อ', probability INTEGER DEFAULT 50, contact TEXT,
    email TEXT, phone TEXT, notes TEXT,
    created_at TEXT DEFAULT (datetime('now')), updated_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS meetings (
    id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id), title TEXT NOT NULL, summary TEXT,
    decisions TEXT, sentiment TEXT DEFAULT 'neutral',
    duration_minutes INTEGER DEFAULT 60, participants INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS action_items (
    id TEXT PRIMARY KEY, meeting_id TEXT REFERENCES meetings(id) ON DELETE CASCADE,
    company_id TEXT REFERENCES companies(id) ON DELETE CASCADE, task TEXT NOT NULL,
    assigned_to TEXT, due_date TEXT, priority TEXT DEFAULT 'med',
    done INTEGER DEFAULT 0, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id), session_id TEXT NOT NULL DEFAULT 'default',
    role TEXT NOT NULL, content TEXT NOT NULL, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id), name TEXT NOT NULL, size TEXT,
    status TEXT DEFAULT 'pending', risk_score INTEGER, risk_level TEXT,
    risks TEXT DEFAULT '[]', summary TEXT, created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS campaigns (
    id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id), name TEXT NOT NULL, channel TEXT,
    budget REAL DEFAULT 0, spent REAL DEFAULT 0, reach INTEGER DEFAULT 0,
    clicks INTEGER DEFAULT 0, conversions INTEGER DEFAULT 0, status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
  );
  CREATE TABLE IF NOT EXISTS ai_logs (
    id TEXT PRIMARY KEY, company_id TEXT REFERENCES companies(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id), agent TEXT NOT NULL, action TEXT NOT NULL,
    tokens_used INTEGER DEFAULT 0, cost_thb REAL DEFAULT 0, status TEXT DEFAULT 'success',
    created_at TEXT DEFAULT (datetime('now'))
  );
`)

// Seed demo data
const existing = db.prepare('SELECT COUNT(*) as c FROM users').get() as any
if (parseInt(existing.c) === 0) {
  const cid = randomUUID(), uid = randomUUID()
  const hash = bcrypt.hashSync('demo1234', 10)
  db.prepare('INSERT INTO companies (id,name,slug,industry,size) VALUES (?,?,?,?,?)').run(cid,'Autosoft Demo Company','autosoft-demo','Technology','SME')
  
  // ── Users Seed (Simple: Name + Role) ──────────────────────────
  const users = [
    [randomUUID(), 'Admin', 'admin@autosoft.com', 'admin', 'Management', '#B48648'],
    [randomUUID(), 'Somsak (Finance)', 'finance@autosoft.com', 'finance', 'Finance', '#3498DB'],
    [randomUUID(), 'Somying (HR)', 'hr@autosoft.com', 'hr', 'HR', '#6B8E6E'],
    [randomUUID(), 'Wipa (Sales)', 'sales@autosoft.com', 'sales', 'Sales', '#9B59B6'],
    [randomUUID(), 'Mana (IT)', 'it@autosoft.com', 'it', 'IT', '#E67E22'],
    [randomUUID(), 'Somsri (Marketing)', 'marketing@autosoft.com', 'marketing', 'Marketing', '#1ABC9C'],
  ]
  const ins = db.prepare(`INSERT INTO users (id,company_id,name,email,password_hash,role,department,color,status) VALUES (?,?,?,?,?,?,?,?,'active')`)
  for (const [id,n,e,r,d,c] of users) ins.run(id,cid,n,e,hash,r,d,c)

  const txns = [
    ['ค่าเช่าออฟฟิศ เดือน พ.ค.',45000,'expense','ค่าใช้จ่าย','approved'],
    ['รายได้จากโปรเจค Website ABC Corp',180000,'income','รายได้','approved'],
    ['ค่าไฟ + น้ำ เดือน เม.ย.',8500,'expense','ค่าใช้จ่าย','approved'],
    ['ซื้อ MacBook Pro สำหรับทีม Dev',89000,'expense','IT & อุปกรณ์','pending'],
    ['รายได้ Consulting บริษัท XYZ',75000,'income','รายได้','approved'],
    ['ค่า Google Workspace / เดือน',12000,'expense','IT & อุปกรณ์','approved'],
    ['ค่าโฆษณา Facebook Ads',25000,'expense','Marketing','pending'],
    ['รายได้ App Development',250000,'income','รายได้','approved'],
  ]
  const insTx = db.prepare(`INSERT INTO transactions (id,company_id,user_id,description,amount,type,category,status) VALUES (?,?,?,?,?,?,?,?)`)
  for (const [d,a,t,c,s] of txns) insTx.run(randomUUID(),cid,uid,d,a,t,c,s)
  db.prepare(`INSERT INTO deals (id,company_id,user_id,name,value,stage,probability,contact) VALUES (?,?,?,?,?,?,?,?)`).run(randomUUID(),cid,uid,'โปรเจค E-Commerce บริษัท AAA',450000,'เจรจา',70,'คุณแดง')
  db.prepare(`INSERT INTO deals (id,company_id,user_id,name,value,stage,probability,contact) VALUES (?,?,?,?,?,?,?,?)`).run(randomUUID(),cid,uid,'Mobile App สำหรับ CCC Inc',680000,'เสนอราคา',85,'คุณบุญ')
  db.prepare(`INSERT INTO deals (id,company_id,user_id,name,value,stage,probability,contact) VALUES (?,?,?,?,?,?,?,?)`).run(randomUUID(),cid,uid,'ดูแลระบบ IT / DDD Co.',120000,'ปิดการขาย',95,'คุณมี')
  db.prepare(`INSERT INTO campaigns (id,company_id,user_id,name,channel,budget,spent,reach,clicks,conversions,status) VALUES (?,?,?,?,?,?,?,?,?,?,'active')`).run(randomUUID(),cid,uid,'Facebook Lead Gen Q2','Facebook',50000,32000,45000,1200,85)
  db.prepare(`INSERT INTO campaigns (id,company_id,user_id,name,channel,budget,spent,reach,clicks,conversions,status) VALUES (?,?,?,?,?,?,?,?,?,?,'active')`).run(randomUUID(),cid,uid,'Google Ads — Brand Awareness','Google',30000,18000,28000,900,42)
  console.log('🌱 SQLite demo seeded! Login: demo@autosoft.com / demo1234')
}
