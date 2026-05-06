import { GoogleGenerativeAI } from '@google/generative-ai'
import dotenv from 'dotenv'
dotenv.config()

let genAI: GoogleGenerativeAI | null = null
let geminiModel: any = null

if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== 'your_gemini_api_key') {
  genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY)
  geminiModel = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' })
  console.log('✅ Gemini AI ready')
} else {
  console.log('⚠️  GEMINI_API_KEY not set — AI features will use fallback responses')
}

export async function askGemini(prompt: string): Promise<string> {
  if (!geminiModel) {
    throw new Error('Gemini API key not configured')
  }
  const result = await geminiModel.generateContent(prompt)
  return result.response.text()
}

export async function askGeminiJSON(prompt: string): Promise<any> {
  const text = await askGemini(prompt)
  const clean = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()
  try {
    return JSON.parse(clean)
  } catch {
    throw new Error(`Gemini did not return valid JSON: ${clean.slice(0, 200)}`)
  }
}
