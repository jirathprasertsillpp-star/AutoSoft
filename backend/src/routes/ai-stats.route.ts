import { Router } from 'express'
import * as c from '../controllers/ai-stats.controller'
import { authMiddleware } from '../middleware/auth'
const r = Router()
r.use(authMiddleware)
r.get('/', c.getStats)
export default r
