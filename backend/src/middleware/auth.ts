import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import { queryOne } from '../lib/db'

const JWT_SECRET = process.env.JWT_SECRET || 'autosoft_super_secret_2026'

export async function authMiddleware(req: Request, res: Response, next: NextFunction): Promise<void> {
  const token = req.headers.authorization?.replace('Bearer ', '')
  if (!token) { res.status(401).json({ error: 'Unauthorized — no token' }); return }

  try {
    const payload = jwt.verify(token, JWT_SECRET) as any
    const user = await queryOne(
      `SELECT u.*, c.name as company_name FROM users u
       LEFT JOIN companies c ON c.id = u.company_id WHERE u.id = $1`,
      [payload.id]
    )
    if (!user) { res.status(401).json({ error: 'User not found' }); return }
    req.user = { ...user, companies: { id: user.company_id, name: user.company_name } }
    next()
  } catch {
    res.status(401).json({ error: 'Invalid or expired token' })
  }
}

declare global {
  namespace Express {
    interface Request { user?: any }
  }
}
