import { Request, Response } from 'express'
import { queryAll } from '../lib/db'

export async function getStats(req: Request, res: Response): Promise<void> {
  const logs = await queryAll(
    'SELECT * FROM ai_logs WHERE company_id = $1 ORDER BY created_at DESC LIMIT 100',
    [req.user.company_id]
  )
  const total_tokens  = logs.reduce((s,l) => s + (Number(l.tokens_used)||0), 0)
  const total_cost    = logs.reduce((s,l) => s + (Number(l.cost_thb)||0), 0)
  const by_agent: Record<string, any> = {}
  for (const l of logs) {
    if (!by_agent[l.agent]) by_agent[l.agent] = { count:0, tokens:0, cost:0 }
    by_agent[l.agent].count++
    by_agent[l.agent].tokens += Number(l.tokens_used)||0
    by_agent[l.agent].cost   += Number(l.cost_thb)||0
  }
  res.json({ data: { total_actions: logs.length, total_tokens, total_cost, by_agent, logs } })
}
