import { Router } from 'express'
import * as c from '../controllers/documents.controller'
import { authMiddleware } from '../middleware/auth'
const r = Router()
r.use(authMiddleware)
r.get('/', c.getAll)
r.post('/analyze', c.analyze)
r.delete('/:id', c.remove)
export default r
