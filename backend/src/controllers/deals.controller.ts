import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'

export async function getAll(req: Request, res: Response): Promise<void> {
  const data = await queryAll(
    'SELECT * FROM deals WHERE company_id = $1 ORDER BY created_at DESC',
    [req.user.company_id]
  )
  res.json({ data })
}

export async function create(req: Request, res: Response): Promise<void> {
  const { name, value, stage, probability, contact, email, phone, notes } = req.body
  if (!name) { res.status(400).json({ error: 'name จำเป็น' }); return }
  const id = newId()
  await run(
    `INSERT INTO deals (id,company_id,user_id,name,value,stage,probability,contact,email,phone,notes)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, req.user.company_id, req.user.id, name,
     Number(value)||0, stage||'ติดต่อ', Number(probability)||50,
     contact||'', email||'', phone||'', notes||'']
  )
  const data = await queryOne('SELECT * FROM deals WHERE id = $1', [id])
  res.json({ data })
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const fields = ['name','value','stage','probability','contact','email','phone','notes']
  const updates: string[] = []
  const vals: any[] = []
  let i = 1
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); vals.push(req.body[f]) }
  }
  updates.push(`updated_at = $${i++}`)
  vals.push(new Date().toISOString())
  vals.push(id, req.user.company_id)
  await run(`UPDATE deals SET ${updates.join(', ')} WHERE id = $${i++} AND company_id = $${i}`, vals)
  const data = await queryOne('SELECT * FROM deals WHERE id = $1', [id])
  res.json({ data })
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  await run('DELETE FROM deals WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
  res.json({ success: true })
}
