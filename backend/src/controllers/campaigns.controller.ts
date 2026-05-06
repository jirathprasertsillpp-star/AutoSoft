import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'

export async function getAll(req: Request, res: Response): Promise<void> {
  const data = await queryAll('SELECT * FROM campaigns WHERE company_id = $1 ORDER BY created_at DESC', [req.user.company_id])
  res.json({ data })
}

export async function create(req: Request, res: Response): Promise<void> {
  const { name, channel, budget, spent, reach, clicks, conversions, status } = req.body
  if (!name) { res.status(400).json({ error: 'name จำเป็น' }); return }
  const id = newId()
  await run(
    `INSERT INTO campaigns (id,company_id,user_id,name,channel,budget,spent,reach,clicks,conversions,status)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11)`,
    [id, req.user.company_id, req.user.id, name, channel||'Social Media',
     Number(budget)||0, Number(spent)||0, Number(reach)||0, Number(clicks)||0,
     Number(conversions)||0, status||'active']
  )
  const data = await queryOne('SELECT * FROM campaigns WHERE id = $1', [id])
  res.json({ data })
}

export async function update(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const fields = ['name','channel','budget','spent','reach','clicks','conversions','status']
  const updates: string[] = []
  const vals: any[] = []
  let i = 1
  for (const f of fields) {
    if (req.body[f] !== undefined) { updates.push(`${f} = $${i++}`); vals.push(req.body[f]) }
  }
  if (!updates.length) { res.status(400).json({ error: 'No fields' }); return }
  vals.push(id, req.user.company_id)
  await run(`UPDATE campaigns SET ${updates.join(', ')} WHERE id = $${i++} AND company_id = $${i}`, vals)
  const data = await queryOne('SELECT * FROM campaigns WHERE id = $1', [id])
  res.json({ data })
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  await run('DELETE FROM campaigns WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
  res.json({ success: true })
}
