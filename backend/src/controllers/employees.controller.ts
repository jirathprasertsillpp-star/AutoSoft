import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'
import bcrypt from 'bcryptjs'

const COLORS = ['#6B8E6E','#8B6F47','#C4956A','#3498DB','#9B59B6','#E67E22','#1ABC9C','#E74C3C']

export async function getAll(req: Request, res: Response): Promise<void> {
  const data = await queryAll(
    'SELECT * FROM users WHERE company_id = $1 ORDER BY created_at DESC',
    [req.user.company_id]
  )
  res.json({ data })
}

export async function create(req: Request, res: Response): Promise<void> {
  const { email, password, name, role, department, phone, salary, color } = req.body
  if (!email || !password || !name) { res.status(400).json({ error: 'Email, Password และชื่อจำเป็น' }); return }
  const existing = await queryOne('SELECT id FROM users WHERE email = $1', [email])
  if (existing) { res.status(400).json({ error: 'Email นี้มีผู้ใช้งานแล้ว' }); return }

  const id = newId()
  const hash = await bcrypt.hash(password, 10)
  const all = await queryAll('SELECT COUNT(*) as c FROM users WHERE company_id = $1', [req.user.company_id])
  const count = parseInt(all[0]?.c ?? '0')

  await run(
    `INSERT INTO users (id,company_id,name,email,password_hash,role,department,phone,salary,color,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,'active')`,
    [id, req.user.company_id, name, email, hash,
     role||'staff', department||'HR', phone||'', salary||'',
     color||COLORS[count%COLORS.length]]
  )
  const data = await queryOne('SELECT * FROM users WHERE id = $1', [id])
  res.json({ data })
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const fields = ['name','role','department','phone','salary','color','status','leave_used']
  const updates: string[] = []
  const vals: any[] = []
  let i = 1
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); vals.push(req.body[f]) }
  }
  if (!updates.length) { res.status(400).json({ error: 'No fields' }); return }
  vals.push(id, req.user.company_id)
  await run(`UPDATE users SET ${updates.join(', ')} WHERE id = $${i++} AND company_id = $${i}`, vals)
  const data = await queryOne('SELECT * FROM users WHERE id = $1', [id])
  res.json({ data })
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  if (id === req.user.id) { res.status(400).json({ error: 'ไม่สามารถลบตัวเองได้' }); return }
  await run('DELETE FROM users WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
  res.json({ success: true })
}

// ── POST /api/employees/:id/review ───────────────────────────────
export async function reviewPerformance(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const emp = await queryOne('SELECT * FROM users WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
  if (!emp) { res.status(404).json({ error: 'ไม่พบข้อมูลพนักงาน' }); return }

  const prompt = `คุณคือผู้เชี่ยวชาญด้านทรัพยากรบุคคล (HR Expert)
วิเคราะห์ประสิทธิภาพการทำงานของพนักงานคนนี้:
ชื่อ: ${emp.name}
ตำแหน่ง: ${emp.role}
แผนก: ${emp.department}
เงินเดือน: ${emp.salary}

ให้ประเมินในหัวข้อ:
1. จุดแข็งและศักยภาพ
2. ประเด็นที่ควรปรับปรุง
3. ข้อแนะนำในการพัฒนาอาชีพ (Career Path)
4. การพิจารณาเงินเดือน/โบนัส

ตอบเป็น JSON:
{
  "rating": 4.5,
  "summary": "สรุปภาพรวม",
  "strengths": ["ข้อดี 1", "ข้อดี 2"],
  "improvements": ["สิ่งที่ต้องแก้ 1"],
  "advice": "คำแนะนำสั้นๆ"
}`

  try {
    const { askGeminiJSON } = await import('../lib/gemini')
    const result = await askGeminiJSON(prompt)
    
    // Log AI usage
    await run(
      `INSERT INTO ai_logs (id,company_id,user_id,agent,action,tokens_used,cost_thb)
       VALUES ($1,$2,$3,'HR AI','ประเมินผล: ${emp.name}',400,0.12)`,
      [newId(), req.user.company_id, req.user.id]
    )

    res.json({ data: result })
  } catch (e) {
    res.status(500).json({ error: 'AI ประเมินผลล้มเหลว' })
  }
}
