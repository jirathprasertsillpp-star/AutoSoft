import { GoogleGenAI, Type } from '@google/genai';
import { NextResponse } from 'next/server';

export async function POST(req: Request) {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY || '' });
    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const prompt = formData.get('prompt') as string;
    const mode = formData.get('mode') as string; // 'finance', 'guardian', 'meeting'

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    const mimeType = file.type;

    let response;

    if (mode === 'finance') {
      const p = prompt || 'วิเคราะห์ใบเสร็จหรืออินวอยซ์นี้ ดึงข้อมูล: ชื่อร้านหรือผู้ขาย (name), วันที่ (date รูปแบบ DD/MM/YYYY), ยอดรวมสุทธิ (total ไม่ต้องมีสกุลเงิน), ภาษี (tax), หมวดหมู่ (cat เลือก 1 อย่าง: ค่าใช้จ่าย, Marketing, IT & อุปกรณ์, ทรัพย์สิน, อื่นๆ) แล้วคืนค่าเป็น JSON';
      
      const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          p,
          {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType
            }
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              name: { type: Type.STRING },
              date: { type: Type.STRING },
              total: { type: Type.STRING },
              tax: { type: Type.STRING },
              cat: { type: Type.STRING },
            },
            required: ["name", "date", "total", "tax", "cat"]
          }
        }
      });
      response = res.text;
    } else if (mode === 'guardian') {
       const p = prompt || 'วิเคราะห์เอกสารสัญญานี้ ค้นหาความเสี่ยงและให้คะแนนความปลอดภัย (0-100 ยิ่งสูงยิ่งดี) พร้อมชี้จุดที่มีความเสี่ยง (loc) และอธิบายความเสี่ยง (desc) คืนค่าเป็น JSON';
       
       const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          p,
          {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType
            }
          }
        ],
        config: {
          responseMimeType: "application/json",
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              score: { type: Type.INTEGER },
              risks: { 
                type: Type.ARRAY, 
                items: {
                  type: Type.OBJECT,
                  properties: {
                    loc: { type: Type.STRING },
                    desc: { type: Type.STRING },
                  },
                  required: ["loc", "desc"]
                }
              }
            },
            required: ["score", "risks"]
          }
        }
      });
      response = res.text;
    } else {
       const res = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [
          prompt || 'กรุณาอธิบายไฟล์นี้',
          {
            inlineData: {
              data: buffer.toString('base64'),
              mimeType
            }
          }
        ]
      });
      response = res.text;
    }

    return NextResponse.json({ result: response });
  } catch (error: any) {
    console.error('Gemini API Error:', error);
    return NextResponse.json({ error: error.message || 'Error processing request' }, { status: 500 });
  }
}
