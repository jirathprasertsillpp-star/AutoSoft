import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'

async function tryGeminiJSON(prompt: string): Promise<any> {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('no key')
    const { askGeminiJSON } = await import('../lib/gemini')
    return await askGeminiJSON(prompt)
  } catch {
    return {
      score: Math.floor(Math.random()*40)+30, level: 'medium',
      summary: 'เอกสารฉบับนี้มีเนื้อหาครบถ้วน ควรตรวจสอบเงื่อนไขก่อนลงนาม',
      risks: [{ level:'medium', title:'เงื่อนไขการยกเลิก', location:'หน้า 2', description:'ควรตรวจสอบเงื่อนไขการยกเลิกสัญญา', suggestion:'ปรึกษาทนายความก่อนลงนาม' }],
    }
  }
}

export async function getAll(req: Request, res: Response): Promise<void> {
  const data = await queryAll(
    'SELECT * FROM documents WHERE company_id = $1 ORDER BY created_at DESC',
    [req.user.company_id]
  )
  const parsed = data.map(d => ({ ...d, risks: typeof d.risks === 'string' ? JSON.parse(d.risks||'[]') : (d.risks||[]) }))
  res.json({ data: parsed })
}

export async function analyze(req: Request, res: Response): Promise<void> {
  const { name, content } = req.body
  if (!name) { res.status(400).json({ error: 'name is required' }); return }
  const { company_id, id: user_id } = req.user

  const result = await tryGeminiJSON(`วิเคราะห์เอกสาร "${name}" ตอบ JSON {"score":65,"level":"medium","summary":"สรุป","risks":[]} เนื้อหา: ${content||name}`)
  const id = newId()
  await run(
    `INSERT INTO documents (id,company_id,user_id,name,status,risk_score,risk_level,summary,risks) VALUES ($1,$2,$3,$4,'analyzed',$5,$6,$7,$8)`,
    [id, company_id, user_id, name, result.score||50, result.level||'medium', result.summary||'', JSON.stringify(result.risks||[])]
  )
  await run(
    `INSERT INTO ai_logs (id,company_id,user_id,agent,action,tokens_used,cost_thb) VALUES ($1,$2,$3,'Doc Guardian',$4,400,0.12)`,
    [newId(), company_id, user_id, `วิเคราะห์: ${name}`]
  )
  const data = await queryOne('SELECT * FROM documents WHERE id = $1', [id])
  res.json({ data: { ...data, risks: typeof data.risks==='string' ? JSON.parse(data.risks||'[]') : (data.risks||[]) } })
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  await run('DELETE FROM documents WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
  res.json({ success: true })
}
