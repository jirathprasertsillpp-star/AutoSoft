import cors from 'cors'
import dotenv from 'dotenv'
dotenv.config()

export const corsMiddleware = cors({
  origin: [
    process.env.FRONTEND_URL || 'http://localhost:3000',
    'https://autosoft.vercel.app',
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
})
