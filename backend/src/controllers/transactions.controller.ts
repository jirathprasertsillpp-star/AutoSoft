import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'

export async function getAll(req: Request, res: Response): Promise<void> {
  const data = await queryAll(
    'SELECT * FROM transactions WHERE company_id = $1 ORDER BY created_at DESC',
    [req.user.company_id]
  )
  res.json({ data })
}

export async function create(req: Request, res: Response): Promise<void> {
  const { description, amount, type, category, date } = req.body
  if (!description || !amount || !type) { res.status(400).json({ error: 'description, amount, type จำเป็น' }); return }
  const id = newId()
  await run(
    `INSERT INTO transactions (id,company_id,user_id,description,amount,type,category,date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8)`,
    [id, req.user.company_id, req.user.id, description,
     Number(amount), type, category||'ค่าใช้จ่าย',
     date||new Date().toISOString().slice(0,10)]
  )
  const data = await queryOne('SELECT * FROM transactions WHERE id = $1', [id])
  res.json({ data })
}

export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const { status } = req.body
  if (!status) { res.status(400).json({ error: 'status จำเป็น' }); return }
  await run('UPDATE transactions SET status = $1 WHERE id = $2 AND company_id = $3', [status, id, req.user.company_id])
  const data = await queryOne('SELECT * FROM transactions WHERE id = $1', [id])
  res.json({ data })
}

export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  await run('DELETE FROM transactions WHERE id = $1 AND company_id = $2', [id, req.user.company_id])
  res.json({ success: true })
}
