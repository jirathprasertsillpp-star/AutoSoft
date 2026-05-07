import { GoogleGenerativeAI, SchemaType } from '@google/generative-ai'
import { NextResponse } from 'next/server'

const MAX_FILE_SIZE = 20 * 1024 * 1024 // 20MB

export async function POST(req: Request) {
  try {
    const apiKey = process.env.GEMINI_API_KEY
    if (!apiKey || apiKey === 'your_gemini_api_key') {
      return NextResponse.json({ error: 'GEMINI_API_KEY not configured' }, { status: 500 })
    }

    const genAI = new GoogleGenerativeAI(apiKey)
    const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const promptOverride = formData.get('prompt') as string | null
    const mode = (formData.get('mode') as string) || 'general'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json({ error: 'ไฟล์ขนาดใหญ่เกินไป (สูงสุด 20MB)' }, { status: 400 })
    }

    const bytes = await file.arrayBuffer()
    const base64Data = Buffer.from(bytes).toString('base64')
    const mimeType = file.type || 'application/octet-stream'

    // ── Finance OCR ──────────────────────────────────────────────
    if (mode === 'finance') {
      const financePrompt = promptOverride ||
        `วิเคราะห์ใบเสร็จหรือใบกำกับภาษีนี้อย่างละเอียด
         สกัดข้อมูลร้านค้า, วันที่ (DD/MM/YYYY), ยอดรวมสุทธิ, และภาษี (VAT 7%)
         ตอบเป็น JSON ตามโครงสร้างที่กำหนด`

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: financePrompt },
            { inlineData: { data: base64Data, mimeType } }
          ]
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              name:  { type: SchemaType.STRING },
              date:  { type: SchemaType.STRING },
              total: { type: SchemaType.NUMBER },
              tax:   { type: SchemaType.NUMBER },
              cat:   { type: SchemaType.STRING },
            },
            required: ['name', 'date', 'total', 'tax', 'cat'],
          },
        },
      })

      const response = await result.response
      return NextResponse.json({ result: JSON.parse(response.text()) })
    }

    // ── Guardian Analysis ────────────────────────────────────────
    if (mode === 'guardian') {
      const guardianPrompt = promptOverride ||
        `วิเคราะห์เอกสารทางกฎหมายหรือสัญญาฉบับนี้
         ค้นหาความเสี่ยง ประเด็นที่ควรระวัง และข้อเสนอแนะในการแก้ไข
         ตอบเป็น JSON พร้อมคะแนนความปลอดภัย (0-100)`

      const result = await model.generateContent({
        contents: [{
          role: 'user',
          parts: [
            { text: guardianPrompt },
            { inlineData: { data: base64Data, mimeType } }
          ]
        }],
        generationConfig: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: SchemaType.OBJECT,
            properties: {
              score: { type: SchemaType.NUMBER },
              level: { type: SchemaType.STRING },
              summary: { type: SchemaType.STRING },
              risks: {
                type: SchemaType.ARRAY,
                items: {
                  type: SchemaType.OBJECT,
                  properties: {
                    title: { type: SchemaType.STRING },
                    level: { type: SchemaType.STRING },
                    location: { type: SchemaType.STRING },
                    description: { type: SchemaType.STRING },
                    suggestion: { type: SchemaType.STRING },
                  },
                  required: ['title', 'level', 'location', 'description', 'suggestion'],
                },
              },
            },
            required: ['score', 'level', 'summary', 'risks'],
          },
        },
      })

      const response = await result.response
      return NextResponse.json({ result: JSON.parse(response.text()) })
    }

    // ── Meeting Summary ──────────────────────────────────────────
    if (mode === 'meeting') {
      const meetingPrompt = promptOverride ||
        `สรุปการประชุมจากไฟล์นี้ (เสียง/วิดีโอ/เอกสาร)
         สกัดประเด็นสำคัญ, การตัดสินใจ และ Action Items
         ตอบเป็นภาษาไทย`

      const result = await model.generateContent([
        meetingPrompt,
        { inlineData: { data: base64Data, mimeType } }
      ])

      const response = await result.response
      return NextResponse.json({ result: response.text() })
    }

    // ── General ──────────────────────────────────────────────────
    const result = await model.generateContent([
      promptOverride || 'ช่วยสรุปและวิเคราะห์ไฟล์นี้เป็นภาษาไทยอย่างละเอียด',
      { inlineData: { data: base64Data, mimeType } }
    ])

    const response = await result.response
    return NextResponse.json({ result: response.text() })

  } catch (error: any) {
    console.error('Gemini Route Error:', error)
    return NextResponse.json({ 
      error: error?.message || 'Internal Server Error',
      details: error?.stack 
    }, { status: 500 })
  }
}
