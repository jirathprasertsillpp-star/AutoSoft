import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'

async function tryGemini(prompt: string): Promise<string> {
  try {
    if (!process.env.GEMINI_API_KEY) throw new Error('no key')
    const { askGemini } = await import('../lib/gemini')
    return await askGemini(prompt)
  } catch {
    return 'สวัสดีครับ! ผมคือ Company GPT ของคุณ พร้อมช่วยตอบคำถามเกี่ยวกับ HR, นโยบายบริษัท, และการทำงาน กรุณาถามได้เลยครับ'
  }
}

export async function sendMessage(req: Request, res: Response): Promise<void> {
  const { message, sessionId = 'default' } = req.body
  if (!message) { res.status(400).json({ error: 'message is required' }); return }
  const { company_id, id: user_id, companies } = req.user

  await run(
    `INSERT INTO chat_messages (id,company_id,user_id,session_id,role,content) VALUES ($1,$2,$3,$4,'user',$5)`,
    [newId(), company_id, user_id, sessionId, message]
  )

  const prompt = `คุณคือ Company GPT ของ ${companies?.name||'บริษัท'}
นโยบาย HR: ลาพักร้อน 15 วัน/ปี ลาป่วย 30 วัน/ปี ลากิจ 3 วัน/ปี เงินเดือนวันที่ 25 ของเดือน
ตอบเป็นภาษาไทย กระชับ เป็นมิตร คำถาม: ${message}`

  const aiText = await tryGemini(prompt)
  await run(
    `INSERT INTO chat_messages (id,company_id,user_id,session_id,role,content) VALUES ($1,$2,$3,$4,'ai',$5)`,
    [newId(), company_id, user_id, sessionId, aiText]
  )
  await run(
    `INSERT INTO ai_logs (id,company_id,user_id,agent,action,tokens_used,cost_thb) VALUES ($1,$2,$3,'Company GPT',$4,$5,$6)`,
    [newId(), company_id, user_id, `ตอบ: ${message.slice(0,50)}`,
     Math.ceil(aiText.length/4), parseFloat((aiText.length/4*0.0003).toFixed(4))]
  )
  res.json({ text: aiText })
}

export async function getHistory(req: Request, res: Response): Promise<void> {
  const { sessionId = 'default' } = req.query
  const data = await queryAll(
    `SELECT * FROM chat_messages WHERE company_id = $1 AND session_id = $2 ORDER BY created_at ASC`,
    [req.user.company_id, sessionId as string]
  )
  res.json({ data })
}
