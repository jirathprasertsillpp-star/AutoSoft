# 🗄️ Autosoft Database Setup

## Stack
- **Supabase** — PostgreSQL + Auth + Storage
- **Row Level Security** — แยกข้อมูลแต่ละบริษัทอัตโนมัติ

---

## 🚀 Setup Steps

### Step 1 — สร้าง Supabase Project
1. ไปที่ [supabase.com](https://supabase.com) → **New Project**
2. ตั้งชื่อ project: `autosoft`
3. เลือก region: `Southeast Asia (Singapore)`
4. จด **Project URL** และ **API Keys**

### Step 2 — รัน SQL ตามลำดับ
เปิด **SQL Editor** ใน Supabase Dashboard:

```
1. schema.sql  → สร้าง Tables ทั้งหมด + Indexes
2. rls.sql     → เปิด Row Level Security + Policies
3. seed.sql    → Demo Data (optional)
```

### Step 3 — เปิด Email Authentication
```
Authentication → Providers → Email → Enable
```

### Step 4 — Copy Keys ไป .env
```bash
# backend/.env
SUPABASE_URL=https://xxxx.supabase.co
SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
```

---

## 📋 Tables

| Table | Description |
|-------|-------------|
| `companies` | ข้อมูลบริษัท — 1 บริษัท / account |
| `users` | พนักงานทั้งหมด — linked to Supabase Auth |
| `transactions` | รายรับ-รายจ่าย — Finance module |
| `deals` | CRM Deals — Sales Copilot |
| `meetings` | การประชุม + AI Summary |
| `action_items` | Action Items จากการประชุม |
| `chat_messages` | ประวัติ Company GPT Chat |
| `documents` | เอกสาร + Risk Analysis |
| `campaigns` | Marketing Campaigns |
| `ai_logs` | Usage Log ของทุก AI Agent |

---

## 🔒 Security
- **RLS** เปิดทุก table — user เห็นเฉพาะข้อมูลบริษัทตัวเอง
- **Service Role Key** ใช้เฉพาะ backend — ไม่ expose ที่ frontend
- **Supabase Auth** จัดการ JWT อัตโนมัติ

---

## 🧪 Test Connection
```bash
curl http://localhost:4000/health
# → { "status": "OK", "app": "Autosoft Backend" }

curl -X POST http://localhost:4000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@company.com","password":"test1234","name":"Test User","companyName":"Test Company"}'
```
