'use client'
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react'
import { DataProvider } from '@/lib/data'

// ─── Types ────────────────────────────────────────────────────────
type Theme = 'dark' | 'light'
type Lang  = 'th' | 'en'

interface AppContextType {
  theme: Theme
  lang: Lang
  toggleTheme: () => void
  toggleLang: () => void
  t: (key: string) => string
  colors: typeof darkColors
}

// ─── Color Palettes ───────────────────────────────────────────────
export const darkColors = {
  bg:         '#0A0604',
  bg2:        'rgba(19, 12, 6, 0.5)',
  bg3:        'rgba(28, 17, 8, 0.4)',
  sidebar:    'rgba(16, 10, 5, 0.4)',
  surface:    'rgba(255,255,255,0.03)',
  surface2:   'rgba(255,255,255,0.06)',
  border:     'rgba(255,255,255,0.06)',
  border2:    'rgba(255,255,255,0.12)',
  gold:       '#E2B989',
  gold2:      '#B48648',
  goldLight:  'rgba(196,149,106,0.15)',
  text:       'rgba(255,255,255,0.92)',
  text2:      'rgba(255,255,255,0.60)',
  text3:      'rgba(255,255,255,0.35)',
  green:      '#4CAF7D',
  greenL:     'rgba(76,175,125,0.12)',
  red:        '#E05252',
  redL:       'rgba(224,82,82,0.12)',
  blue:       '#4A9EDB',
  blueL:      'rgba(74,158,219,0.12)',
  purple:     '#9B72CF',
  purpleL:    'rgba(155,114,207,0.12)',
  shadow:     '0 8px 32px rgba(0,0,0,0.5)',
}

export const lightColors = {
  bg:         '#FFFFFF',
  bg2:        'rgba(255, 255, 255, 0.5)',
  bg3:        'rgba(243, 244, 246, 0.4)',
  sidebar:    'rgba(255, 255, 255, 0.4)',
  surface:    'rgba(255, 255, 255, 0.6)',
  surface2:   'rgba(249, 250, 251, 0.7)',
  border:     'rgba(0,0,0,0.05)',
  border2:    'rgba(0,0,0,0.1)',
  gold:       '#B48648',
  gold2:      '#9C713B',
  goldLight:  'rgba(180,134,72,0.1)',
  text:       '#111827',
  text2:      '#4B5563',
  text3:      '#9CA3AF',
  green:      '#059669',
  greenL:     'rgba(5,150,105,0.1)',
  red:        '#DC2626',
  redL:       'rgba(220,38,38,0.1)',
  blue:       '#2563EB',
  blueL:      'rgba(37,99,235,0.1)',
  purple:     '#7C3AED',
  purpleL:    'rgba(124,58,237,0.1)',
  shadow:     '0 4px 24px rgba(0,0,0,0.04)',
}

// ─── Translations ─────────────────────────────────────────────────
const translations: Record<Lang, Record<string, string>> = {
  th: {
    // Nav
    'nav.dashboard':  'แดชบอร์ด',
    'nav.people':     'HR & People',
    'nav.finance':    'Finance Center',
    'nav.sales':      'Sales Copilot',
    'nav.marketing':  'Marketing',
    'nav.meeting':    'Meeting Brain',
    'nav.gpt':        'Company GPT',
    'nav.guardian':   'Doc Guardian',
    'nav.ai':         'AI Control Tower',
    'nav.settings':   'การตั้งค่า',
    // Nav sections
    'nav.section.modules': 'MODULES',
    'nav.section.ai':      'AI',
    'nav.section.system':  'SYSTEM',
    // Header
    'header.search':    'ค้นหาทั้งระบบ...',
    'header.company':   'บริษัท',
    // Dashboard
    'dash.greeting':    'สวัสดีตอนเช้า, คุณ',
    'dash.pending':     'งาน รอดำเนินการ',
    'dash.ask_ai':      'ถาม AI',
    'dash.summarize':   'สรุปประชุม',
    'dash.upload':      'อัพโลดใบเสร็จ',
    'dash.modules':     'Modules',
    'dash.tasks':       'Tasks วันนี้',
    'dash.ai_activity': 'AI Activity',
    'dash.ai_saved':    'AI ประหยัดให้คุณวันนี้',
    'dash.ai_actions':  'จาก 342 actions อัตโนมัติ',
    'dash.target':      '% ของเป้าหมายรายเดือน',
    // KPIs
    'kpi.employees':   'พนักงานทั้งหมด',
    'kpi.revenue':     'รายได้เดือนนี้',
    'kpi.pipeline':    'Sales Pipeline',
    'kpi.ai_actions':  'AI Actions วันนี้',
    'kpi.deals':       '18 deals active',
    'kpi.save':        'ประหยัด ฿24K',
    // Login
    'login.tagline':   'AI OPERATING SYSTEM',
    'login.hero1':     'จัดการธุรกิจ',
    'login.hero2':     'ด้วย AI อัจฉริยะ',
    'login.desc':      'ครบทุก Module — HR, Finance, Sales, Marketing และ AI ในที่เดียว พร้อมใช้งานทันที',
    'login.trust':     '500+ บริษัทไว้วางใจ',
    'login.tab_in':    'เข้าสู่ระบบ',
    'login.tab_up':    'สมัครใช้งาน',
    'login.welcome':   'ยินดีต้อนรับกลับ 👋',
    'login.sub':       'เข้าสู่ระบบเพื่อจัดการธุรกิจของคุณ',
    'login.email':     'อีเมล',
    'login.password':  'รหัสผ่าน',
    'login.forgot':    'ลืมรหัสผ่าน?',
    'login.remember':  'จดจำฉันไว้ 30 วัน',
    'login.btn_in':    'เข้าสู่ระบบ →',
    'login.loading':   'กำลังเข้าสู่ระบบ...',
    'login.or':        'หรือ',
    'login.demo':      '🎮 ทดลองใช้ Demo Account',
    'login.signup_title': 'สร้างบัญชีใหม่ ✨',
    'login.signup_sub':   'ทดลองใช้ฟรี 14 วัน — ไม่ต้องใส่บัตรเครดิต',
    'login.name':      'ชื่อ-นามสกุล',
    'login.company':   'ชื่อบริษัท',
    'login.btn_up':    'เริ่มใช้งานฟรี →',
    'login.terms':     'โดยการสมัคร คุณยอมรับ',
    'login.and':       'และ',
    'login.tos':       'Terms of Service',
    'login.privacy':   'Privacy Policy',
    // Features
    'feat.ai_title':   'AI ทำงานอัตโนมัติ 24/7',
    'feat.ai_sub':     'ประหยัดเวลาและต้นทุนได้สูงสุด 60%',
    'feat.sec_title':  'ปลอดภัยระดับ Enterprise',
    'feat.sec_sub':    'ข้อมูลเข้ารหัส AES-256 + 2FA',
    'feat.setup_title':'ตั้งค่าใช้งานได้ใน 5 นาที',
    'feat.setup_sub':  'ไม่ต้องมีทักษะ IT ทีมช่วย 24/7',
    // Common
    'common.logout':   'ออกจากระบบ',
    'common.save':     'บันทึก',
    'common.cancel':   'ยกเลิก',
    'common.add':      'เพิ่ม',
    'common.delete':   'ลบ',
    'common.edit':     'แก้ไข',
    'common.view':     'ดู',
    'common.search':   'ค้นหา',
  },
  en: {
    'nav.dashboard':  'Dashboard',
    'nav.people':     'HR & People',
    'nav.finance':    'Finance Center',
    'nav.sales':      'Sales Copilot',
    'nav.marketing':  'Marketing',
    'nav.meeting':    'Meeting Brain',
    'nav.gpt':        'Company GPT',
    'nav.guardian':   'Doc Guardian',
    'nav.ai':         'AI Control Tower',
    'nav.settings':   'Settings',
    'nav.section.modules': 'MODULES',
    'nav.section.ai':      'AI',
    'nav.section.system':  'SYSTEM',
    'header.search':    'Search everything...',
    'header.company':   'Company',
    'dash.greeting':    'Good morning,',
    'dash.pending':     'tasks pending',
    'dash.ask_ai':      'Ask AI',
    'dash.summarize':   'Summarize Meeting',
    'dash.upload':      'Upload Receipt',
    'dash.modules':     'Modules',
    'dash.tasks':       "Today's Tasks",
    'dash.ai_activity': 'AI Activity',
    'dash.ai_saved':    'AI Saved You Today',
    'dash.ai_actions':  'From 342 automated actions',
    'dash.target':      '% of monthly target',
    'kpi.employees':   'Total Employees',
    'kpi.revenue':     'Monthly Revenue',
    'kpi.pipeline':    'Sales Pipeline',
    'kpi.ai_actions':  'AI Actions Today',
    'kpi.deals':       '18 deals active',
    'kpi.save':        'Saved ฿24K',
    'login.tagline':   'AI OPERATING SYSTEM',
    'login.hero1':     'Manage Your Business',
    'login.hero2':     'with AI Intelligence',
    'login.desc':      'All Modules — HR, Finance, Sales, Marketing & AI in one place, ready to use.',
    'login.trust':     '500+ companies trust us',
    'login.tab_in':    'Sign In',
    'login.tab_up':    'Sign Up',
    'login.welcome':   'Welcome back 👋',
    'login.sub':       'Sign in to manage your business',
    'login.email':     'Email',
    'login.password':  'Password',
    'login.forgot':    'Forgot password?',
    'login.remember':  'Remember me for 30 days',
    'login.btn_in':    'Sign In →',
    'login.loading':   'Signing in...',
    'login.or':        'or',
    'login.demo':      '🎮 Try Demo Account',
    'login.signup_title': 'Create New Account ✨',
    'login.signup_sub':   '14-day free trial — No credit card required',
    'login.name':      'Full Name',
    'login.company':   'Company Name',
    'login.btn_up':    'Start Free →',
    'login.terms':     'By signing up, you agree to our',
    'login.and':       'and',
    'login.tos':       'Terms of Service',
    'login.privacy':   'Privacy Policy',
    'feat.ai_title':   'AI Automation 24/7',
    'feat.ai_sub':     'Save up to 60% time and costs',
    'feat.sec_title':  'Enterprise-grade Security',
    'feat.sec_sub':    'AES-256 encryption + 2FA',
    'feat.setup_title':'Setup in 5 Minutes',
    'feat.setup_sub':  'No IT skills needed, 24/7 support',
    'common.logout':   'Sign Out',
    'common.save':     'Save',
    'common.cancel':   'Cancel',
    'common.add':      'Add',
    'common.delete':   'Delete',
    'common.edit':     'Edit',
    'common.view':     'View',
    'common.search':   'Search',
  },
}

// ─── Context ──────────────────────────────────────────────────────
import AnimatedBackground from '@/components/AnimatedBackground'

const AppContext = createContext<AppContextType>({
  theme: 'dark', lang: 'th',
  toggleTheme: () => {}, toggleLang: () => {},
  t: (k) => k, colors: darkColors,
})

export function AppProvider({ children }: { children: ReactNode }) {
  const [theme, setTheme] = useState<Theme>('dark')
  const [lang,  setLang]  = useState<Lang>('th')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    const savedTheme = (localStorage.getItem('autosoft_theme') as Theme) || 'dark'
    const savedLang  = (localStorage.getItem('autosoft_lang')  as Lang)  || 'th'
    setTheme(savedTheme)
    setLang(savedLang)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (mounted) {
      document.documentElement.className = theme === 'light' ? 'light-mode' : ''
    }
  }, [theme, mounted])

  const toggleTheme = () => {
    const next = theme === 'dark' ? 'light' : 'dark'
    setTheme(next)
    localStorage.setItem('autosoft_theme', next)
  }

  const toggleLang = () => {
    const next = lang === 'th' ? 'en' : 'th'
    setLang(next)
    localStorage.setItem('autosoft_lang', next)
  }

  const t = (key: string) => translations[lang][key] ?? translations['th'][key] ?? key

  const colors = theme === 'dark' ? darkColors : lightColors

  if (!mounted) return null

  return (
    <AppContext.Provider value={{ theme, lang, toggleTheme, toggleLang, t, colors }}>
      <AnimatedBackground />
      <div style={{
        background: 'transparent',
        color: colors.text,
        minHeight: '100vh',
        transition: 'color 0.3s',
      }}>
        <DataProvider>
          {children}
        </DataProvider>
      </div>
    </AppContext.Provider>
  )
}

export const useApp = () => useContext(AppContext)
