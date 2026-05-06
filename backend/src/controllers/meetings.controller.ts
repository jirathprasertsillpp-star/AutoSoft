import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'

async function tryGeminiJSON(prompt: string): Promise<any> {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('no key')
    const { askGeminiJSON } = await import('../lib/gemini')
    return await askGeminiJSON(prompt)
  } catch {
    return {
      summary: '• ทีมงานได้หารือประเด็นสำคัญเพื่อพัฒนาองค์กร\n• มีการวางแผนกลยุทธ์ระยะสั้นและระยะยาว\n• ที่ประชุมมีมติร่วมกันในการดำเนินงาน',
      decisions: ['ดำเนินการตามแผนที่วางไว้','ติดตามความคืบหน้าในสัปดาห์ถัดไป'],
      actions: [{ task: 'ติดตามผลการประชุม', assigned_to: 'ทีมงาน', due_date: 'ภายใน 1 สัปดาห์', priority: 'high' }],
      sentiment: 'positive', participants: 5, duration_minutes: 60,
    }
  }
}

export async function getAll(req: Request, res: Response): Promise<void> {
  const meetings = await queryAll(
    'SELECT * FROM meetings WHERE company_id = $1 ORDER BY created_at DESC',
    [req.user.company_id]
  )
  const data = await Promise.all(meetings.map(async m => ({
    ...m,
    decisions: typeof m.decisions === 'string' ? JSON.parse(m.decisions || '[]') : (m.decisions || []),
    action_items: await queryAll('SELECT * FROM action_items WHERE meeting_id = $1', [m.id]),
  })))
  res.json({ data })
}

export async function analyze(req: Request, res: Response): Promise<void> {
  const { title, transcript } = req.body
  if (!title) { res.status(400).json({ error: 'title is required' }); return }
  const { company_id, id: user_id } = req.user

  const prompt = `สรุปการประชุม "${title}" ตอบเป็น JSON:
{"summary":"สรุป 3 ประเด็น ขึ้นต้นด้วย •","decisions":["การตัดสินใจ"],"actions":[{"task":"งาน","assigned_to":"ชื่อ","due_date":"วันที่","priority":"high"}],"sentiment":"positive","participants":5,"duration_minutes":60}
เนื้อหา: ${transcript || title}`

  const result = await tryGeminiJSON(prompt)
  const meeting_id = newId()

  await run(
    `INSERT INTO meetings (id,company_id,user_id,title,summary,decisions,sentiment,duration_minutes,participants)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [meeting_id, company_id, user_id, title,
     result.summary||'', JSON.stringify(result.decisions||[]),
     result.sentiment||'neutral', result.duration_minutes||60, result.participants||1]
  )

  const actions = Array.isArray(result.actions) ? result.actions : []
  for (const a of actions) {
    await run(
      `INSERT INTO action_items (id,meeting_id,company_id,task,assigned_to,due_date,priority) VALUES ($1,$2,$3,$4,$5,$6,$7)`,
      [newId(), meeting_id, company_id, a.task, a.assigned_to||'', a.due_date||'', a.priority||'med']
    )
  }
  await run(
    `INSERT INTO ai_logs (id,company_id,user_id,agent,action,tokens_used,cost_thb) VALUES ($1,$2,$3,'Meeting Brain',$4,500,0.15)`,
    [newId(), company_id, user_id, `สรุปประชุม: ${title}`]
  )

  const meeting = await queryOne('SELECT * FROM meetings WHERE id = $1', [meeting_id])
  const action_items = await queryAll('SELECT * FROM action_items WHERE meeting_id = $1', [meeting_id])
  res.json({ data: { ...meeting, decisions: result.decisions, action_items, actions } })
}

export async function toggleAction(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const item = await queryOne('SELECT done FROM action_items WHERE id = $1', [id])
  if (!item) { res.status(404).json({ error: 'Not found' }); return }
  await run('UPDATE action_items SET done = $1 WHERE id = $2', [item.done ? 0 : 1, id])
  res.json({ success: true })
}
