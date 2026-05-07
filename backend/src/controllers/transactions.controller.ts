import { Request, Response } from 'express'
import { queryAll, queryOne, run, newId } from '../lib/db'

// ── GET /api/transactions ─────────────────────────────────────────
export async function getAll(req: Request, res: Response): Promise<void> {
  const data = await queryAll(
    'SELECT * FROM transactions WHERE company_id = $1 ORDER BY created_at DESC',
    [req.user.company_id],
  )
  res.json({ data })
}

// ── POST /api/transactions ────────────────────────────────────────
export async function create(req: Request, res: Response): Promise<void> {
  const { description, desc, amount, type, category, cat, date, status } = req.body
  const finalDesc = description || desc
  if (!finalDesc || !amount || !type) {
    res.status(400).json({ error: 'description, amount, type จำเป็น' }); return
  }
  if (!['income', 'expense'].includes(type)) {
    res.status(400).json({ error: 'type ต้องเป็น income หรือ expense' }); return
  }

  const id = newId()
  await run(
    `INSERT INTO transactions (id,company_id,user_id,description,amount,type,category,status,date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9)`,
    [
      id, req.user.company_id, req.user.id,
      finalDesc, Number(amount), type,
      category || cat || 'ค่าใช้จ่าย',
      status || 'pending',
      date || new Date().toISOString().slice(0, 10),
    ],
  )
  const data = await queryOne('SELECT * FROM transactions WHERE id = $1', [id])
  res.json({ data })
}

// ── PATCH /api/transactions/:id ───────────────────────────────────
export async function updateStatus(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const { status } = req.body
  if (!status) { res.status(400).json({ error: 'status จำเป็น' }); return }

  const tx = await queryOne(
    'SELECT id FROM transactions WHERE id = $1 AND company_id = $2',
    [id, req.user.company_id],
  )
  if (!tx) { res.status(404).json({ error: 'Transaction not found' }); return }

  await run(
    'UPDATE transactions SET status = $1 WHERE id = $2 AND company_id = $3',
    [status, id, req.user.company_id],
  )
  const data = await queryOne('SELECT * FROM transactions WHERE id = $1', [id])
  res.json({ data })
}

// ── DELETE /api/transactions/:id ──────────────────────────────────
export async function remove(req: Request, res: Response): Promise<void> {
  const { id } = req.params
  const tx = await queryOne(
    'SELECT id FROM transactions WHERE id = $1 AND company_id = $2',
    [id, req.user.company_id],
  )
  if (!tx) { res.status(404).json({ error: 'Transaction not found' }); return }
  await run(
    'DELETE FROM transactions WHERE id = $1 AND company_id = $2',
    [id, req.user.company_id],
  )
  res.json({ success: true })
}
