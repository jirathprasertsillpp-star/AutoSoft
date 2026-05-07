import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'

// ── Try Gemini text ───────────────────────────────────────────────
async function tryGemini(prompt: string): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('no key')
    const { askGemini } = await import('../lib/gemini')
    return await askGemini(prompt)
  } catch (e) {
    console.warn('Gemini chat fallback:', (e as Error).message)
    return 'สวัสดีครับ! ผมคือ Company GPT ของบริษัทคุณ พร้อมช่วยตอบคำถามด้าน HR, นโยบาย, ข้อมูลพนักงาน และการดำเนินงานทั่วไป กรุณาถามได้เลยครับ 😊'
  }
}

// ── POST /api/chat ────────────────────────────────────────────────
export async function sendMessage(req: Request, res: Response): Promise<void> {
  const { message, sessionId = 'default' } = req.body
  if (!message || !message.trim()) {
    res.status(400).json({ error: 'message is required' }); return
  }
  const { company_id, id: user_id, companies } = req.user

  // Save user message
  await run(
    `INSERT INTO chat_messages (id,company_id,user_id,session_id,role,content)
     VALUES ($1,$2,$3,$4,'user',$5)`,
    [newId(), company_id, user_id, sessionId, message.trim()],
  )

  // Fetch last 10 messages for context
  const history = await queryAll(
    `SELECT role, content FROM chat_messages
     WHERE company_id = $1 AND session_id = $2
     ORDER BY created_at DESC LIMIT 10`,
    [company_id, sessionId],
  )
  const historyText = history
    .reverse()
    .map(m => `${m.role === 'user' ? 'ผู้ใช้' : 'AI'}: ${m.content}`)
    .join('\n')

  const companyName = companies?.name || 'บริษัท'

  // ── RAG: Fetch Deep Context ──────────────────────────────────
  const [mtgs, docs, emps, txs] = await Promise.all([
    queryAll('SELECT title, summary, decisions FROM meetings WHERE company_id = $1 ORDER BY date DESC LIMIT 3', [company_id]),
    queryAll('SELECT name, type, summary FROM documents WHERE company_id = $1 ORDER BY created_at DESC LIMIT 3', [company_id]),
    queryAll('SELECT name, role, department FROM users WHERE company_id = $1 AND status = "active"', [company_id]),
    queryAll('SELECT SUM(amount) as total FROM transactions WHERE company_id = $1', [company_id])
  ])

  const contextData = `
ข้อมูลบริษัทเรียลไทม์:
• พนักงานทั้งหมด: ${emps.length} คน (${emps.slice(0,5).map((e:any)=>e.name).join(', ')}...)
• สรุปการเงิน: ยอดเงินหมุนเวียนรวม ฿${Number(txs[0]?.total || 0).toLocaleString()}
• การประชุมล่าสุด: ${mtgs.map((m:any)=>`[${m.title}: ${m.summary}]`).join(', ')}
• เอกสารสำคัญล่าสุด: ${docs.map((d:any)=>`[${d.name} (${d.type}): ${d.summary}]`).join(', ')}
`

  const prompt = `คุณคือ Company GPT ผู้ช่วย AI อัจฉริยะของ ${companyName}
คุณมีความเชี่ยวชาญด้าน HR, กฎหมายแรงงาน, การจัดการองค์กร, และข้อมูลภายในบริษัท
ตอบเป็นภาษาไทยที่กระชับ ชัดเจน เป็นมิตร และให้ข้อมูลที่ถูกต้อง

${contextData}

นโยบาย HR พื้นฐาน:
• วันลาพักร้อน: 15 วัน/ปี, วันลาป่วย: 30 วัน/ปี, วันลากิจ: 3 วัน/ปี
• เงินเดือนออก: วันที่ 25, ประกันสังคม: 5% (สูงสุด 750 บาท)

ประวัติการสนทนา:
${historyText}

คำถามปัจจุบัน: ${message}`

  const aiText = await tryGemini(prompt)

  // Save AI response
  await run(
    `INSERT INTO chat_messages (id,company_id,user_id,session_id,role,content)
     VALUES ($1,$2,$3,$4,'ai',$5)`,
    [newId(), company_id, user_id, sessionId, aiText],
  )

  // Log usage — estimate tokens from character count
  const estimatedTokens = Math.ceil((prompt.length + aiText.length) / 3.5)
  const estimatedCost = parseFloat((estimatedTokens * 0.0002).toFixed(4))
  await run(
    `INSERT INTO ai_logs (id,company_id,user_id,agent,action,tokens_used,cost_thb)
     VALUES ($1,$2,$3,'Company GPT',$4,$5,$6)`,
    [newId(), company_id, user_id, `ตอบ: ${message.slice(0, 60)}`, estimatedTokens, estimatedCost],
  )

  res.json({ text: aiText })
}

// ── GET /api/chat/history ─────────────────────────────────────────
export async function getHistory(req: Request, res: Response): Promise<void> {
  const { sessionId = 'default', limit = '50' } = req.query
  const data = await queryAll(
    `SELECT * FROM chat_messages
     WHERE company_id = $1 AND session_id = $2
     ORDER BY created_at ASC LIMIT $3`,
    [req.user.company_id, sessionId as string, parseInt(limit as string) || 50],
  )
  res.json({ data })
}

// ── DELETE /api/chat/history ──────────────────────────────────────
export async function clearHistory(req: Request, res: Response): Promise<void> {
  const { sessionId = 'default' } = req.query
  await run(
    'DELETE FROM chat_messages WHERE company_id = $1 AND session_id = $2',
    [req.user.company_id, sessionId as string],
  )
  res.json({ success: true })
}
