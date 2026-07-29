import { AnimatePresence, motion } from 'framer-motion'
import {
  Activity, Archive, ArrowLeft, ArrowRight, Bell, Bookmark, BriefcaseBusiness, Building2, Check,
  CheckCircle2, ChevronDown, CircleDollarSign, Clock3, Eye, FileCheck2,
  Download, FileText, Filter, Gauge, HeartHandshake, LayoutDashboard, MapPin, Menu,
  Languages, Moon, MoreHorizontal, Plus, ReceiptText, Search, Settings, ShieldCheck,
  SlidersHorizontal, Sparkles, Sun, Trash2, UploadCloud, UserCheck, Users,
  X, XCircle,
} from 'lucide-react'
import { FormEvent, ReactNode, useEffect, useMemo, useState } from 'react'
import { initialApplicants, jobs as seedJobs, type Applicant, type AppStatus, type Job, type Role, type View } from './data'
import { archiveFile, deleteArchivedFile, downloadArchivedFile, listArchive, type ArchiveCategory, type ArchiveEntry } from './archive'
import { apiRequest } from './api'
import { type AppLanguage, useInterfaceLanguage } from './i18n'

const roleStart: Record<Role, View> = { seeker: 'discover', employer: 'dashboard', owner: 'admin' }
const statusText: Record<AppStatus, string> = { review: 'تحت المراجعة', accepted: 'مقبول', rejected: 'مرفوض' }
const jobCategories = ['الصحة', 'التجارة', 'هندسة إلكترونيات', 'هندسة معمارية', 'مشاريع صغيرة', 'برمجة', 'توصيل', 'هندسة اتصالات', 'تعليم', 'أعمال ديكور', 'مبيعات', 'إدارة', 'إنشاءات', 'أعمال حرة', 'تقنية المعلومات', 'التسويق', 'التصميم', 'المالية', 'المنظمات', 'أخرى']
const yemenCities = ['أمانة العاصمة', 'صنعاء', 'عدن', 'تعز', 'الحديدة', 'إب', 'حضرموت', 'مأرب', 'ذمار', 'صعدة', 'حجة', 'عمران', 'المحويت', 'ريمة', 'البيضاء', 'الضالع', 'لحج', 'أبين', 'شبوة', 'الجوف', 'المهرة', 'سقطرى']
const arabicMonths = ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر']

type LicenseStatus = 'not_submitted' | 'review' | 'approved' | 'rejected'
type CompanyLicense = {
  companyName: string
  legalType: string
  licenseNumber: string
  imageData: string
  imageName: string
  submittedAt: string
  status: LicenseStatus
  archived: boolean
}

const emptyLicense: CompanyLicense = {
  companyName: '',
  legalType: 'شركة',
  licenseNumber: '',
  imageData: '',
  imageName: '',
  submittedAt: '',
  status: 'not_submitted',
  archived: false,
}

function stored<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key)
    return value ? JSON.parse(value) as T : fallback
  } catch {
    return fallback
  }
}

async function derivePasswordHash(password: string, salt: Uint8Array) {
  const material = await crypto.subtle.importKey('raw', new TextEncoder().encode(password), 'PBKDF2', false, ['deriveBits'])
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', hash: 'SHA-256', salt: salt as BufferSource, iterations: 120000 }, material, 256)
  return btoa(String.fromCharCode(...new Uint8Array(bits)))
}

const ownerBuild = import.meta.env.VITE_OWNER_BUILD !== 'false'
const manualPaymentsEnabled = import.meta.env.VITE_MANUAL_PAYMENTS === 'true'
const ownerPaymentMethod = import.meta.env.VITE_OWNER_PAYMENT_METHOD || ''
const ownerPaymentRecipient = import.meta.env.VITE_OWNER_PAYMENT_RECIPIENT || ''
const ownerPaymentAccount = import.meta.env.VITE_OWNER_PAYMENT_ACCOUNT || ''
const ownerPhone = import.meta.env.VITE_OWNER_PHONE || ''
const requestedRole = new URLSearchParams(window.location.search).get('role') as Role | null
const initialRole: Role = requestedRole === 'employer' || requestedRole === 'seeker' || (requestedRole === 'owner' && ownerBuild) ? requestedRole : 'seeker'
const requestedView = new URLSearchParams(window.location.search).get('view') as View | null
const initialView: View = requestedView || roleStart[initialRole]
const requestedLanguage = new URLSearchParams(window.location.search).get('lang') as AppLanguage | null

function Logo({ compact = false, nameEn = 'Hazar-Job.com', nameAr = 'هازار للوظائف' }: { compact?: boolean; nameEn?: string; nameAr?: string }) {
  return (
    <div className="brand">
      <div className="brand-mark"><img src="./hazar-logo.svg" alt="" /></div>
      {!compact && <div><strong>{nameEn}</strong><small>{nameAr}</small></div>}
    </div>
  )
}

function Stat({ icon, label, value, note, tone = 'blue' }: { icon: ReactNode; label: string; value: string; note: string; tone?: string }) {
  return (
    <motion.div className="stat-card" whileHover={{ y: -3 }}>
      <div className={`stat-icon ${tone}`}>{icon}</div>
      <div><span>{label}</span><strong>{value}</strong><small>{note}</small></div>
    </motion.div>
  )
}

function MatchRing({ value, small = false }: { value: number; small?: boolean }) {
  const color = value >= 90 ? '#19b784' : value >= 80 ? '#4b9eff' : '#f4bd50'
  return (
    <div className={`match-ring ${small ? 'small' : ''}`} style={{ background: `conic-gradient(${color} ${value * 3.6}deg, var(--ring-track) 0deg)` }}>
      <div><strong>{value}%</strong>{!small && <span>تطابق</span>}</div>
    </div>
  )
}

function OwnerViewShell({ onBack, children }: { onBack: () => void; children: ReactNode }) {
  return (
    <section className="owner-view-shell">
      <div className="owner-view-nav">
        <button className="secondary-button" onClick={onBack}>
          <ArrowRight /> الرجوع إلى مركز التحكم
        </button>
      </div>
      {children}
    </section>
  )
}

function EmptyState({ icon, title, text, action }: { icon: ReactNode; title: string; text: string; action?: ReactNode }) {
  return <div className="empty-state"><div>{icon}</div><h3>{title}</h3><p>{text}</p>{action}</div>
}

function NotificationsPanel({ unread, onReadAll, onClose, onNavigate, role, ownerMode }: { unread: number; onReadAll: () => void; onClose: () => void; onNavigate: (view: View) => void; role: Role; ownerMode: boolean }) {
  const notifications = ownerMode ? [
    { title: 'دفعة جديدة بانتظار التحقق', text: 'أرسلت شركة الأمل التجارية إيصال دفع جديداً.', time: 'منذ 8 دقائق', icon: <ReceiptText />, view: 'moderation' as View },
    { title: 'وظيفة جديدة للمراجعة', text: 'تم إرسال وظيفة “مهندس شبكات” للموافقة قبل النشر.', time: 'منذ 32 دقيقة', icon: <FileCheck2 />, view: 'moderation' as View },
    { title: 'طلب توثيق شركة', text: 'يوجد ترخيص منشأة جديد بانتظار المعاينة والموافقة.', time: 'منذ ساعتين', icon: <ShieldCheck />, view: 'licenses' as View },
  ] : role === 'employer' ? [
    { title: 'مرشح جديد للوظيفة', text: 'وصل طلب جديد لوظيفة مهندس برمجيات.', time: 'منذ 12 دقيقة', icon: <Users />, view: 'applicants' as View },
    { title: 'تمت مراجعة الإعلان', text: 'إعلانك الأخير قيد المراجعة بعد استلام الحوالة.', time: 'منذ ساعة', icon: <FileCheck2 />, view: 'dashboard' as View },
    { title: 'حالة توثيق المنشأة', text: 'يمكنك متابعة طلب التوثيق من لوحة المنشأة.', time: 'منذ 3 ساعات', icon: <ShieldCheck />, view: 'verification' as View },
  ] : [
    { title: 'وظائف جديدة تناسبك', text: 'أضيفت 6 وظائف مطابقة لمهارات ملفك.', time: 'منذ 20 دقيقة', icon: <Sparkles />, view: 'discover' as View },
    { title: 'تحديث حالة طلب', text: 'انتقل أحد طلباتك إلى مرحلة المراجعة.', time: 'منذ ساعتين', icon: <FileCheck2 />, view: 'applications' as View },
    { title: 'تنبيه بحث محفوظ', text: 'توجد وظائف جديدة في صنعاء وعدن.', time: 'اليوم', icon: <Bell />, view: 'alerts' as View },
  ]
  return (
    <motion.div className="notifications-panel" initial={{ opacity: 0, y: -8, scale: .98 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -6, scale: .98 }}>
      <div className="notifications-head"><div><strong>الإشعارات</strong><span>{unread ? `${unread} غير مقروءة` : 'تمت قراءة الكل'}</span></div><button onClick={onClose}><X /></button></div>
      <div className="notifications-list">
        {notifications.map((item, index) => <button key={item.title} onClick={() => onNavigate(item.view)} className={index < unread ? 'unread' : ''}><span className="notification-icon">{item.icon}</span><div><strong>{item.title}</strong><p>{item.text}</p><small>{item.time}</small></div></button>)}
      </div>
      <button className="read-all-button" onClick={onReadAll}><CheckCircle2 /> تحديد الكل كمقروء</button>
    </motion.div>
  )
}

function App() {
  const [role, setRole] = useState<Role>(initialRole)
  const [view, setView] = useState<View>(initialView)
  const [dark, setDark] = useState(() => stored('hazar-dark', true))
  const [language, setLanguage] = useState<AppLanguage>(() => requestedLanguage === 'en' || requestedLanguage === 'ar' ? requestedLanguage : stored('hazar-language', 'ar'))
  const [mobileMenu, setMobileMenu] = useState(false)
  const [toast, setToast] = useState('')
  const [notificationsOpen, setNotificationsOpen] = useState(false)
  const [unreadNotifications, setUnreadNotifications] = useState(3)
  const [ownerName, setOwnerName] = useState(() => stored('hazar-owner-name', 'صاحب المشروع'))
  const [ownerEmail, setOwnerEmail] = useState(() => stored('hazar-owner-email', 'hazarjob2020@gmail.com'))
  const [ownerEmailVerified, setOwnerEmailVerified] = useState(() => stored('hazar-owner-email-verified', true))
  const [platformNameAr, setPlatformNameAr] = useState(() => stored('hazar-platform-name-ar', 'هازار للوظائف'))
  const [platformNameEn, setPlatformNameEn] = useState(() => stored('hazar-platform-name-en', 'Hazar-Job.com'))
  const [feedbacks, setFeedbacks] = useState<{ id: number; name: string; email: string; message: string; createdAt: string }[]>(() => stored('hazar-feedbacks', []))
  const [allJobs, setAllJobs] = useState<Job[]>(seedJobs)
  const [expanded, setExpanded] = useState<number | null>(1)
  const [saved, setSaved] = useState<number[]>(() => stored('hazar-saved', [3]))
  const [applied, setApplied] = useState<number[]>(() => stored('hazar-applied', [2]))
  const [applications, setApplications] = useState<Applicant[]>(initialApplicants)
  const [cvReady, setCvReady] = useState(false)
  const [parsing, setParsing] = useState(false)
  const [search, setSearch] = useState('')
  const [city, setCity] = useState('الكل')
  const [type, setType] = useState('الكل')
  const [selectedApplicant, setSelectedApplicant] = useState<Applicant | null>(null)
  const [companyLicense, setCompanyLicense] = useState<CompanyLicense>(() => stored('hazar-company-license', emptyLicense))

  useInterfaceLanguage(language)

  useEffect(() => {
    let active = true
    const sync = async () => {
      try {
        const snapshot = await apiRequest<{ jobs: Job[]; applicants: Applicant[]; settings?: { platformNameAr?: string; platformNameEn?: string } }>('/api/snapshot')
        if (!active) return
        setAllJobs(snapshot.jobs)
        setApplications(snapshot.applicants)
        if (snapshot.settings?.platformNameAr) setPlatformNameAr(snapshot.settings.platformNameAr)
        if (snapshot.settings?.platformNameEn) setPlatformNameEn(snapshot.settings.platformNameEn)
      } catch {
        // Keep the bundled data available while the central service is offline.
      }
    }
    void sync()
    const interval = window.setInterval(() => void sync(), 12000)
    const onFocus = () => void sync()
    window.addEventListener('focus', onFocus)
    return () => {
      active = false
      window.clearInterval(interval)
      window.removeEventListener('focus', onFocus)
    }
  }, [])

  useEffect(() => localStorage.setItem('hazar-saved', JSON.stringify(saved)), [saved])
  useEffect(() => localStorage.setItem('hazar-applied', JSON.stringify(applied)), [applied])
  useEffect(() => localStorage.setItem('hazar-dark', JSON.stringify(dark)), [dark])
  useEffect(() => localStorage.setItem('hazar-owner-name', JSON.stringify(ownerName)), [ownerName])
  useEffect(() => localStorage.setItem('hazar-owner-email', JSON.stringify(ownerEmail)), [ownerEmail])
  useEffect(() => localStorage.setItem('hazar-owner-email-verified', JSON.stringify(ownerEmailVerified)), [ownerEmailVerified])
  useEffect(() => localStorage.setItem('hazar-company-license', JSON.stringify(companyLicense)), [companyLicense])
  useEffect(() => localStorage.setItem('hazar-platform-name-ar', JSON.stringify(platformNameAr)), [platformNameAr])
  useEffect(() => localStorage.setItem('hazar-platform-name-en', JSON.stringify(platformNameEn)), [platformNameEn])
  useEffect(() => { localStorage.setItem('hazar-feedbacks', JSON.stringify(feedbacks)) }, [feedbacks])
  useEffect(() => { document.title = `${platformNameEn} | ${platformNameAr}` }, [platformNameAr, platformNameEn])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2800)
  }

  const switchRole = (nextRole: Role) => {
    setRole(nextRole)
    setView(roleStart[nextRole])
    setMobileMenu(false)
  }

  const filteredJobs = useMemo(() => allJobs.filter(job => {
    const q = search.trim().toLowerCase()
    return (!q || `${job.title} ${job.company} ${job.skills.join(' ')}`.toLowerCase().includes(q))
      && (city === 'الكل' || job.city === city)
      && (type === 'الكل' || job.type === type)
  }), [allJobs, search, city, type])

  const toggleSaved = (id: number) => {
    setSaved(current => current.includes(id) ? current.filter(item => item !== id) : [...current, id])
    notify(saved.includes(id) ? 'تمت إزالة الوظيفة من المحفوظات' : 'تم حفظ الوظيفة بنجاح')
  }

  const apply = (job: Job) => {
    if (applied.includes(job.id)) return notify('سبق أن تقدمت لهذه الوظيفة')
    setApplied(current => [...current, job.id])
    notify(`تم إرسال طلبك إلى ${job.company}`)
  }

  const parseCv = () => {
    setParsing(true)
    window.setTimeout(() => { setParsing(false); setCvReady(true); notify('اكتمل تحليل سيرتك الذاتية') }, 1700)
  }

  const updateApplicant = (id: number, status: AppStatus) => {
    setApplications(list => list.map(item => item.id === id ? { ...item, status } : item))
    setSelectedApplicant(current => current?.id === id ? { ...current, status } : current)
    void apiRequest(`/api/applicants/${id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }).catch(() => undefined)
    notify(`تم تحديث حالة المرشح إلى: ${statusText[status]}`)
  }

  const navItems = role === 'seeker'
    ? [
      ['discover', <Search />, 'اكتشف الوظائف'],
      ['applications', <FileCheck2 />, 'طلباتي'],
      ['saved', <Bookmark />, 'المحفوظات'],
      ['alerts', <Bell />, 'تنبيهات الوظائف'],
      ['features', <Sparkles />, 'مميزات التطبيق'],
      ['feedback', <FileText />, 'Feedback'],
      ['privacy', <ShieldCheck />, 'الخصوصية والأمان'],
    ]
    : role === 'employer'
      ? [
        ['verification', <ShieldCheck />, 'توثيق المنشأة'],
        ['dashboard', <LayoutDashboard />, 'نظرة عامة'],
        ['post', <Plus />, 'إضافة وظيفة'],
        ['applicants', <Users />, 'إدارة المتقدمين'],
        ['features', <Sparkles />, 'مميزات التطبيق'],
        ['feedback', <FileText />, 'Feedback'],
        ['privacy', <ShieldCheck />, 'الخصوصية والأمان'],
      ]
      : [
        ['admin', <Gauge />, 'مركز التحكم'],
        ['moderation', <ShieldCheck />, 'الوظائف والمدفوعات'],
        ['licenses', <Building2 />, 'تراخيص المنشآت'],
        ['archive', <Archive />, 'أرشيف المستندات'],
        ['feedback', <FileText />, 'رسائل Feedback'],
        ['users', <Users />, 'المستخدمون'],
        ['settings', <Settings />, 'إعدادات المنصة'],
      ]

  const renderView = () => {
    if (role === 'seeker') {
      if (view === 'features') return <FeaturesPage />
      if (view === 'feedback') return <FeedbackPage ownerEmail={ownerEmail} onSubmit={item => setFeedbacks(list => [item, ...list])} notify={notify} />
      if (view === 'privacy') return <PrivacyPage />
      if (view === 'applications') return <Applications jobs={allJobs} applied={applied} />
      if (view === 'saved') return <SavedJobs jobs={allJobs.filter(j => saved.includes(j.id))} onOpen={(id) => { setView('discover'); setExpanded(id) }} />
      if (view === 'alerts') return <Alerts notify={notify} />
      return <Discover jobs={filteredJobs} expanded={expanded} setExpanded={setExpanded} saved={saved} applied={applied} onSave={toggleSaved} onApply={apply} search={search} setSearch={setSearch} city={city} setCity={setCity} type={type} setType={setType} cvReady={cvReady} parsing={parsing} onParseCv={parseCv} />
    }
    if (role === 'employer') {
      if (view === 'features') return <FeaturesPage />
      if (view === 'feedback') return <FeedbackPage ownerEmail={ownerEmail} onSubmit={item => setFeedbacks(list => [item, ...list])} notify={notify} />
      if (view === 'privacy') return <PrivacyPage />
      if (view === 'verification') return <EmployerLicenseVerification license={companyLicense} setLicense={setCompanyLicense} notify={notify} />
      if (companyLicense.status !== 'approved') return <EmployerLicenseVerification license={companyLicense} setLicense={setCompanyLicense} notify={notify} />
      if (view === 'post') return <PostJob notify={notify} onPublish={(job) => {
        setAllJobs(list => [job, ...list])
        void apiRequest('/api/jobs', { method: 'POST', body: JSON.stringify(job) }).catch(() => undefined)
        setView('dashboard')
      }} />
      if (view === 'applicants') return <Applicants applicants={applications} jobs={allJobs} onSelect={setSelectedApplicant} onUpdate={updateApplicant} />
      return <EmployerDashboard jobs={allJobs} applicants={applications} goTo={setView} />
    }
    if (view === 'moderation') return <OwnerViewShell onBack={() => setView('admin')}><Moderation jobs={allJobs} setJobs={setAllJobs} notify={notify} /></OwnerViewShell>
    if (view === 'licenses') return <OwnerViewShell onBack={() => setView('admin')}><LicenseManagement license={companyLicense} setLicense={setCompanyLicense} notify={notify} /></OwnerViewShell>
    if (view === 'archive') return <OwnerViewShell onBack={() => setView('admin')}><DocumentArchive notify={notify} /></OwnerViewShell>
    if (view === 'feedback') return <OwnerViewShell onBack={() => setView('admin')}><FeedbackInbox feedbacks={feedbacks} notify={notify} /></OwnerViewShell>
    if (view === 'users') return <OwnerViewShell onBack={() => setView('admin')}><UsersAdmin notify={notify} /></OwnerViewShell>
    if (view === 'settings') return <PlatformSettings notify={notify} dark={dark} setDark={setDark} language={language} setLanguage={setLanguage} ownerName={ownerName} setOwnerName={setOwnerName} ownerEmail={ownerEmail} setOwnerEmail={setOwnerEmail} ownerEmailVerified={ownerEmailVerified} setOwnerEmailVerified={setOwnerEmailVerified} platformNameAr={platformNameAr} setPlatformNameAr={setPlatformNameAr} platformNameEn={platformNameEn} setPlatformNameEn={setPlatformNameEn} onBack={() => setView('admin')} />
    return <OwnerDashboard jobs={allJobs} applicants={applications} goTo={setView} ownerName={ownerName} />
  }

  return (
    <div className={dark ? 'app dark' : 'app'}>
      <aside className={`sidebar ${mobileMenu ? 'open' : ''}`}>
        <div className="side-head"><Logo nameAr={platformNameAr} nameEn={platformNameEn} /><button className="icon-button mobile-only" onClick={() => setMobileMenu(false)}><X /></button></div>
        <div className="role-caption">{role === 'seeker' ? 'معاينة لوحة طالب العمل' : role === 'employer' ? 'معاينة لوحة صاحب العمل' : 'لوحة المالك الوحيد'}</div>
        <nav>
          {navItems.map(([id, icon, label]) => (
            <button key={id as string} className={view === id ? 'active' : ''} onClick={() => { setView(id as View); setMobileMenu(false) }}>
              {icon}<span>{label}</span>{id === 'applications' && <b>1</b>}{id === 'moderation' && <b>3</b>}{id === 'licenses' && companyLicense.status === 'review' && <b>1</b>}
            </button>
          ))}
        </nav>
        <div className="side-bottom">
          {ownerBuild && <div className="owner-access"><ShieldCheck /><div><strong>صلاحيات المالك الكاملة</strong><span>لا يوجد مالك آخر للمنصة</span></div></div>}
          <div className="profile-mini"><div className="avatar">{ownerBuild ? ownerName.slice(0, 2) : role === 'employer' ? 'شـ' : 'طـ'}</div><div><strong>{ownerBuild ? ownerName : role === 'employer' ? 'حساب صاحب العمل' : 'حساب طالب العمل'}</strong><span>{ownerBuild ? 'المالك الرئيسي الوحيد' : 'نسخة المستخدم العامة'}</span></div><MoreHorizontal /></div>
        </div>
      </aside>

      <main>
        <header className="topbar">
          <button className="icon-button mobile-only" onClick={() => setMobileMenu(true)}><Menu /></button>
          <div className="role-switch">
            <button onClick={() => switchRole('seeker')} className={role === 'seeker' ? 'active' : ''}>طالب عمل</button>
            <button onClick={() => switchRole('employer')} className={role === 'employer' ? 'active' : ''}>صاحب عمل</button>
            {ownerBuild && <button onClick={() => switchRole('owner')} className={role === 'owner' ? 'active owner' : ''}><ShieldCheck /> المالك</button>}
          </div>
          <div className="top-actions">
            <div className="language-switch" role="group" aria-label="لغة التطبيق">
              <Languages />
              <button type="button" className={language === 'ar' ? 'active' : ''} onClick={() => setLanguage('ar')} title="العربية">ع</button>
              <button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')} title="English">EN</button>
            </div>
            <button className="icon-button" onClick={() => setDark(!dark)}>{dark ? <Sun /> : <Moon />}</button>
            <button className={`icon-button ${unreadNotifications ? 'has-dot' : ''}`} onClick={() => setNotificationsOpen(!notificationsOpen)} aria-label="فتح الإشعارات"><Bell /></button>
          </div>
          <AnimatePresence>
            {notificationsOpen && <NotificationsPanel unread={unreadNotifications} role={role} ownerMode={ownerBuild && role === 'owner'} onReadAll={() => setUnreadNotifications(0)} onClose={() => setNotificationsOpen(false)} onNavigate={(nextView) => { setView(nextView); setNotificationsOpen(false) }} />}
          </AnimatePresence>
        </header>
        <div className="content">{renderView()}</div>
      </main>
      <AnimatePresence>{mobileMenu && <motion.div className="backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setMobileMenu(false)} />}</AnimatePresence>
      <AnimatePresence>{toast && <motion.div className="toast" initial={{ opacity: 0, y: 24 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 12 }}><CheckCircle2 />{toast}</motion.div>}</AnimatePresence>
      <AnimatePresence>{selectedApplicant && <ApplicantModal applicant={selectedApplicant} onClose={() => setSelectedApplicant(null)} onUpdate={updateApplicant} />}</AnimatePresence>
    </div>
  )
}

type DiscoverProps = {
  jobs: Job[]
  expanded: number | null
  setExpanded: (id: number | null) => void
  saved: number[]
  applied: number[]
  onSave: (id: number) => void
  onApply: (job: Job) => void
  search: string
  setSearch: (value: string) => void
  city: string
  setCity: (value: string) => void
  type: string
  setType: (value: string) => void
  cvReady: boolean
  parsing: boolean
  onParseCv: () => void
}

function Discover(props: DiscoverProps) {
  const cities = ['الكل', ...yemenCities]
  const types = ['الكل', 'دوام كامل', 'دوام جزئي', 'عن بعد', 'عقد', 'عمل حر']
  const [advancedOpen, setAdvancedOpen] = useState(false)
  const [category, setCategory] = useState('الكل')
  const [minimumMatch, setMinimumMatch] = useState(0)
  const [sortByMatch, setSortByMatch] = useState(true)
  const [profileDocuments, setProfileDocuments] = useState<Record<string, string>>({})
  const saveProfileDocument = async (file: File | undefined, category: ArchiveCategory, label: string) => {
    if (!file) return
    await archiveFile(file, category, 'طالب العمل')
    setProfileDocuments(current => ({ ...current, [category]: file.name }))
    if (category === 'cv') props.onParseCv()
    else alert(`تم حفظ ${label} في أرشيف المستندات الخاص بالتطبيق`)
  }
  const visibleJobs = [...props.jobs]
    .filter(job => (category === 'الكل' || job.category === category) && job.match >= minimumMatch)
    .sort((a, b) => sortByMatch ? b.match - a.match : b.id - a.id)
  const activeAdvancedFilters = (category === 'الكل' ? 0 : 1) + (minimumMatch ? 1 : 0)
  return (
    <>
      <section className="welcome-row">
        <div><span className="eyebrow"><Sparkles /> بحث ذكي مدعوم بالذكاء الاصطناعي</span><h1>مساء الخير، أحمد</h1><p>اكتشف الفرص الأقرب إلى خبراتك وطموحك المهني.</p></div>
        <div className="profile-score"><div className="score-ring"><strong>{props.cvReady ? '92' : '68'}%</strong></div><div><span>اكتمال الملف الشخصي</span><strong>{props.cvReady ? 'ملفك جاهز للتقديم' : 'أضف سيرتك لفرص أفضل'}</strong></div></div>
      </section>

      <motion.section className={`cv-banner ${props.cvReady ? 'ready' : ''}`} layout>
        <div className="cv-visual"><FileText /><Sparkles /></div>
        <div className="cv-copy">
          <span className="mini-label">{props.cvReady ? 'تم التحليل بنجاح' : 'ميزة المطابقة الذكية'}</span>
          <h2>{props.cvReady ? 'سيرتك الذاتية أصبحت جاهزة' : 'دع الذكاء الاصطناعي يفهم خبراتك'}</h2>
          <p>{props.cvReady ? 'استخرجنا 12 مهارة و3 خبرات. سنستخدمها لترتيب الوظائف الأنسب لك.' : 'ارفع سيرتك الذاتية وسنستخرج مهاراتك وخبراتك لنمنحك نسبة تطابق دقيقة مع كل فرصة.'}</p>
          {props.cvReady && <div className="skills-line"><span>React</span><span>TypeScript</span><span>إدارة المشاريع</span><span>+9</span></div>}
        </div>
        <label className={`upload-button ${props.parsing ? 'loading' : ''}`}>
          <input type="file" accept=".pdf,.doc,.docx" onChange={props.onParseCv} />
          {props.parsing ? <><span className="loader" /> جارٍ تحليل السيرة...</> : props.cvReady ? <><UploadCloud /> تحديث السيرة</> : <><UploadCloud /> ارفع سيرتك الآن</>}
        </label>
      </motion.section>
      <section className="profile-documents">
        <div><h2>ملفاتك المهنية</h2><p>ارفع مستنداتك مرة واحدة لتكون جاهزة عند التقديم.</p></div>
        <label className={profileDocuments.cv ? 'uploaded' : ''}><input type="file" accept=".pdf,.doc,.docx" onChange={event => void saveProfileDocument(event.target.files?.[0], 'cv', 'السيرة الذاتية')} /><FileText /><span><strong>السيرة الذاتية</strong><small>{profileDocuments.cv || 'PDF أو DOCX'}</small></span>{profileDocuments.cv && <CheckCircle2 />}</label>
        <label className={profileDocuments.experience_certificate ? 'uploaded' : ''}><input type="file" accept=".pdf,image/*" onChange={event => void saveProfileDocument(event.target.files?.[0], 'experience_certificate', 'شهادة الخبرة')} /><BriefcaseBusiness /><span><strong>شهادات الخبرة</strong><small>{profileDocuments.experience_certificate || 'PDF أو صورة'}</small></span>{profileDocuments.experience_certificate && <CheckCircle2 />}</label>
        <label className={profileDocuments.training_certificate ? 'uploaded' : ''}><input type="file" accept=".pdf,image/*" onChange={event => void saveProfileDocument(event.target.files?.[0], 'training_certificate', 'شهادة الدورة')} /><FileCheck2 /><span><strong>شهادات الدورات</strong><small>{profileDocuments.training_certificate || 'PDF أو صورة'}</small></span>{profileDocuments.training_certificate && <CheckCircle2 />}</label>
      </section>

      <section className="search-zone">
        <div className="search-field"><Search /><input value={props.search} onChange={e => props.setSearch(e.target.value)} placeholder="ابحث بالمسمى الوظيفي، الشركة، أو المهارة..." />{props.search && <button onClick={() => props.setSearch('')}><X /></button>}</div>
        <label className="select-field"><MapPin /><select value={props.city} onChange={e => props.setCity(e.target.value)}>{cities.map(item => <option key={item}>{item}</option>)}</select><ChevronDown /></label>
        <label className="select-field"><BriefcaseBusiness /><select value={props.type} onChange={e => props.setType(e.target.value)}>{types.map(item => <option key={item}>{item}</option>)}</select><ChevronDown /></label>
        <button className="filter-button" onClick={() => setAdvancedOpen(!advancedOpen)}><SlidersHorizontal /><span>فلاتر متقدمة</span>{activeAdvancedFilters > 0 && <b>{activeAdvancedFilters}</b>}</button>
      </section>
      <AnimatePresence>
        {advancedOpen && <motion.section className="advanced-filters" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
          <label><span>التصنيف</span><select value={category} onChange={event => setCategory(event.target.value)}><option>الكل</option>{jobCategories.map(item => <option key={item}>{item}</option>)}</select></label>
          <label><span>الحد الأدنى للتطابق</span><select value={minimumMatch} onChange={event => setMinimumMatch(Number(event.target.value))}><option value="0">أي نسبة</option><option value="70">70% فأعلى</option><option value="80">80% فأعلى</option><option value="90">90% فأعلى</option></select></label>
          <button onClick={() => { setCategory('الكل'); setMinimumMatch(0) }}><X /> مسح الفلاتر</button>
        </motion.section>}
      </AnimatePresence>

      <div className="section-heading"><div><h2>وظائف مناسبة لك</h2><p>{visibleJobs.length} فرصة متاحة وفق الفلاتر الحالية</p></div><button className="text-button" onClick={() => setSortByMatch(!sortByMatch)}>{sortByMatch ? 'الأعلى تطابقاً' : 'الأحدث أولاً'} <ChevronDown /></button></div>
      <div className="jobs-list">
        <AnimatePresence mode="popLayout">
          {visibleJobs.map(job => <JobCard key={job.id} job={job} open={props.expanded === job.id} saved={props.saved.includes(job.id)} applied={props.applied.includes(job.id)} onToggle={() => props.setExpanded(props.expanded === job.id ? null : job.id)} onSave={() => props.onSave(job.id)} onApply={() => props.onApply(job)} />)}
        </AnimatePresence>
        {!visibleJobs.length && <EmptyState icon={<Search />} title="لا توجد نتائج مطابقة" text="جرّب تغيير كلمات البحث أو إزالة بعض الفلاتر." />}
      </div>
    </>
  )
}

function JobCard({ job, open, saved, applied, onToggle, onSave, onApply }: { job: Job; open: boolean; saved: boolean; applied: boolean; onToggle: () => void; onSave: () => void; onApply: () => void }) {
  return (
    <motion.article className={`job-card ${open ? 'expanded' : ''}`} layout initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
      <div className="job-main" onClick={onToggle}>
        <div className="company-logo" style={{ background: job.logoColor }}>{job.initials}</div>
        <div className="job-copy">
          <div className="job-title-line"><h3>{job.title}</h3>{job.featured && <span className="featured"><Sparkles /> مميزة</span>}</div>
          <div className="company-name">{job.company}{job.verified && <CheckCircle2 />}</div>
          <div className="job-meta"><span><MapPin />{job.city}</span><span><BriefcaseBusiness />{job.type}</span><span><CircleDollarSign />{job.salary}</span><span><Clock3 />{job.posted}</span></div>
          <div className="skill-tags">{job.skills.slice(0, 3).map(skill => <span key={skill}>{skill}</span>)}</div>
        </div>
        <div className="job-side">
          <MatchRing value={job.match} />
          <button className={`save-button ${saved ? 'saved' : ''}`} onClick={e => { e.stopPropagation(); onSave() }} aria-label="حفظ الوظيفة"><Bookmark fill={saved ? 'currentColor' : 'none'} /></button>
          <ChevronDown className={`expand-icon ${open ? 'up' : ''}`} />
        </div>
      </div>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div className="job-details" initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: .28 }}>
            <div className="detail-grid">
              <div><h4>عن الوظيفة</h4><p>{job.description}</p><h4>المتطلبات</h4><ul>{job.requirements.map(item => <li key={item}><Check />{item}</li>)}</ul></div>
              <aside><div><span>آخر موعد للتقديم</span><strong>{job.deadline}</strong></div><div><span>فئة الوظيفة</span><strong>{job.category}</strong></div><div><span>المتقدمون</span><strong>{job.applicants} متقدم</strong></div></aside>
            </div>
            <div className="apply-bar"><div><ShieldCheck /><span>تقديم سريع وآمن باستخدام ملفك المحلل</span></div><button className={applied ? 'applied-button' : 'primary-button'} onClick={onApply}>{applied ? <><Check /> تم التقديم</> : <>تقديم سريع <ArrowLeft /></>}</button></div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.article>
  )
}

function PageTitle({ eyebrow, title, text, action }: { eyebrow?: string; title: string; text: string; action?: ReactNode }) {
  return <div className="page-title"><div>{eyebrow && <span className="eyebrow">{eyebrow}</span>}<h1>{title}</h1><p>{text}</p></div>{action}</div>
}

function Applications({ jobs, applied }: { jobs: Job[]; applied: number[] }) {
  const visible = jobs.filter(job => applied.includes(job.id))
  return (
    <>
      <PageTitle eyebrow="رحلتك المهنية" title="طلبات التوظيف" text="تابع حالة طلباتك وتحديثاتها من مكان واحد." />
      <div className="status-summary"><div className="blue"><FileCheck2 /><strong>{visible.length}</strong><span>إجمالي الطلبات</span></div><div className="amber"><Clock3 /><strong>{visible.length}</strong><span>تحت المراجعة</span></div><div className="green"><CheckCircle2 /><strong>0</strong><span>تم قبولها</span></div></div>
      {visible.length ? <div className="table-shell"><div className="table-head"><span>الوظيفة</span><span>تاريخ التقديم</span><span>نسبة التطابق</span><span>الحالة</span></div>{visible.map(job => <div className="table-row" key={job.id}><div className="table-job"><div className="company-logo small-logo" style={{ background: job.logoColor }}>{job.initials}</div><div><strong>{job.title}</strong><span>{job.company} · {job.city}</span></div></div><span>{job.posted}</span><MatchRing value={job.match} small /><span className="status-pill review"><Clock3 />تحت المراجعة</span></div>)}</div>
        : <EmptyState icon={<FileCheck2 />} title="لم تتقدم لأي وظيفة بعد" text="عندما ترسل أول طلب توظيف ستتمكن من متابعته هنا." />}
    </>
  )
}

function SavedJobs({ jobs, onOpen }: { jobs: Job[]; onOpen: (id: number) => void }) {
  return (
    <>
      <PageTitle eyebrow="قائمتك المختارة" title="الوظائف المحفوظة" text="ارجع للفرص التي لفتت انتباهك عندما تكون مستعداً." />
      {jobs.length ? <div className="saved-grid">{jobs.map(job => <motion.button whileHover={{ y: -3 }} className="saved-card" key={job.id} onClick={() => onOpen(job.id)}><div className="company-logo" style={{ background: job.logoColor }}>{job.initials}</div><MatchRing value={job.match} small /><h3>{job.title}</h3><p>{job.company}</p><div><span><MapPin />{job.city}</span><span><Clock3 />{job.posted}</span></div><strong>عرض التفاصيل <ArrowLeft /></strong></motion.button>)}</div>
        : <EmptyState icon={<Bookmark />} title="لا توجد وظائف محفوظة" text="استخدم أيقونة الحفظ بجانب الوظائف للعودة إليها لاحقاً." />}
    </>
  )
}

function Alerts({ notify }: { notify: (message: string) => void }) {
  const [enabled, setEnabled] = useState(true)
  const [frequency, setFrequency] = useState('يومياً')
  return (
    <>
      <PageTitle eyebrow="لا تفوّت فرصة" title="تنبيهات الوظائف" text="سنخبرك عند نشر فرص جديدة تناسب تفضيلاتك ومهاراتك." action={<button className="primary-button" onClick={() => notify('تم إنشاء تنبيه جديد')}><Plus /> تنبيه جديد</button>} />
      <div className="settings-panel">
        <div className="alert-card"><div className="alert-icon"><Bell /></div><div className="grow"><div className="alert-head"><div><h3>وظائف التقنية في صنعاء</h3><p>React · TypeScript · تطوير الويب</p></div><label className="switch"><input type="checkbox" checked={enabled} onChange={() => setEnabled(!enabled)} /><span /></label></div><div className="alert-options"><span><MapPin />صنعاء</span><span><BriefcaseBusiness />دوام كامل أو عن بعد</span><label>التكرار<select value={frequency} onChange={e => setFrequency(e.target.value)}><option>فوراً</option><option>يومياً</option><option>أسبوعياً</option></select></label></div></div></div>
        <div className="email-box"><div><strong>البريد المرتبط بالتنبيهات</strong><span>ahmed.alaraqi@email.com</span></div><button className="secondary-button" onClick={() => notify('يمكن تعديل البريد من إعدادات الحساب')}>تعديل</button></div>
      </div>
    </>
  )
}

function EmployerDashboard({ jobs, applicants, goTo }: { jobs: Job[]; applicants: Applicant[]; goTo: (view: View) => void }) {
  return (
    <>
      <PageTitle eyebrow="الخميس، 16 يوليو 2026" title="مرحباً، فريق يمن تك" text="إليك آخر مستجدات وظائفك والمتقدمين اليوم." action={<button className="primary-button" onClick={() => goTo('post')}><Plus /> نشر وظيفة جديدة</button>} />
      <div className="stats-grid"><Stat icon={<BriefcaseBusiness />} label="الوظائف النشطة" value="4" note="+1 هذا الشهر" /><Stat icon={<Users />} label="إجمالي المتقدمين" value="127" note="+18 هذا الأسبوع" tone="green" /><Stat icon={<Eye />} label="مرات الظهور" value="2,840" note="+12.5% عن الشهر الماضي" tone="gold" /><Stat icon={<Activity />} label="متوسط التطابق" value="84%" note="أعلى من متوسط المنصة" tone="violet" /></div>
      <div className="dashboard-grid">
        <section className="panel"><div className="panel-head"><div><h2>وظائفك النشطة</h2><p>أداء آخر 30 يوماً</p></div><button onClick={() => goTo('post')}><Plus /></button></div><div className="active-jobs">{jobs.slice(0, 3).map(job => <div key={job.id}><div className="company-logo small-logo" style={{ background: job.logoColor }}>{job.initials}</div><div className="grow"><strong>{job.title}</strong><span>{job.city} · {job.type}</span></div><div className="mini-metric"><strong>{job.applicants}</strong><span>متقدم</span></div><div className="mini-metric"><strong>{job.views}</strong><span>مشاهدة</span></div><button onClick={() => goTo('applicants')} title="عرض المتقدمين"><MoreHorizontal /></button></div>)}</div></section>
        <section className="panel"><div className="panel-head"><div><h2>أفضل المتقدمين</h2><p>مرتّبون بالمطابقة الذكية</p></div><button className="text-button" onClick={() => goTo('applicants')}>عرض الكل</button></div><div className="top-applicants">{applicants.slice(0, 3).map(item => <div key={item.id}><div className="avatar">{item.name.slice(0, 2)}</div><div className="grow"><strong>{item.name}</strong><span>{item.title}</span></div><MatchRing value={item.match} small /></div>)}</div></section>
      </div>
    </>
  )
}

function EmployerLicenseVerification({ license, setLicense, notify }: { license: CompanyLicense; setLicense: (license: CompanyLicense) => void; notify: (message: string) => void }) {
  const [draft, setDraft] = useState<CompanyLicense>(license.status === 'not_submitted' ? license : { ...license })
  const [previewOpen, setPreviewOpen] = useState(false)

  const selectImage = (file?: File) => {
    if (!file) return
    if (!file.type.startsWith('image/')) return notify('اختر صورة صالحة للترخيص')
    if (file.size > 2 * 1024 * 1024) return notify('يجب ألا يتجاوز حجم صورة الترخيص 2MB')
    const reader = new FileReader()
    reader.onload = () => setDraft(current => ({ ...current, imageData: String(reader.result), imageName: file.name }))
    reader.readAsDataURL(file)
  }

  const submitLicense = async (event: FormEvent) => {
    event.preventDefault()
    if (!draft.companyName.trim()) return notify('أدخل اسم الشركة أو المنشأة أو المشروع')
    if (!draft.licenseNumber.trim()) return notify('أدخل رقم الترخيص')
    if (!draft.imageData) return notify('أرفق صورة الترخيص')
    const submitted = { ...draft, status: 'review' as LicenseStatus, submittedAt: '19 يوليو 2026', archived: false }
    const blob = await fetch(draft.imageData).then(response => response.blob())
    await archiveFile(new File([blob], draft.imageName || `license-${draft.licenseNumber}.jpg`, { type: blob.type }), 'license', draft.companyName)
    setLicense(submitted)
    setDraft(submitted)
    notify('تم إرسال الترخيص إلى مالك المنصة للمراجعة')
  }

  if (license.status === 'review') {
    return <><EmptyState icon={<Clock3 />} title="طلب التوثيق تحت المراجعة" text={`استلمنا ترخيص ${license.companyName} رقم ${license.licenseNumber}. ستفتح لوحة صاحب العمل تلقائياً بعد موافقة المالك.`} action={<button className="secondary-button" onClick={() => setPreviewOpen(true)}><Eye /> معاينة الطلب المرسل</button>} /><AnimatePresence>{previewOpen && <LicensePreview license={license} title="الطلب المرسل للمراجعة" onClose={() => setPreviewOpen(false)} />}</AnimatePresence></>
  }

  if (license.status === 'approved') {
    return <div className="license-approved"><div className="approved-seal"><ShieldCheck /></div><span className="eyebrow">توثيق مكتمل</span><h1>منشأتك موثقة ومعتمدة</h1><p>تم اعتماد ترخيص {license.companyName} رقم <b>{license.licenseNumber}</b>. لن نطلب هذه الخطوة منك مرة أخرى.</p><span className="status-pill accepted"><CheckCircle2 /> حساب صاحب عمل موثّق</span></div>
  }

  return (
    <>
      <PageTitle eyebrow="خطوة التسجيل الأولى" title="توثيق الشركة أو المنشأة" text="يُطلب هذا التحقق مرة واحدة فقط لحماية أصحاب الأعمال وطالبي العمل." />
      <section className="license-intro">
        <div className="license-intro-icon"><ShieldCheck /></div>
        <div><h2>لماذا نطلب صورة الترخيص؟</h2><p>أهلاً بك في هازار للوظائف. نطلب وثيقة الترخيص عند التسجيل الأول فقط للتأكد من أن فرص العمل تُنشر من جهات حقيقية وموثوقة. هذا الإجراء يحمي سمعة منشأتك، ويزيد ثقة المتقدمين بإعلاناتك، ويساعدنا على الحد من الحسابات الوهمية. ستبقى الوثيقة خاصة، ولن تظهر لطالبي العمل أو للعامة، وسيتمكن مالك المنصة وحده من مراجعتها وأرشفتها بأمان.</p></div>
      </section>
      {license.status === 'rejected' && <div className="license-rejected-note"><XCircle /><div><strong>يحتاج طلب التوثيق إلى إعادة إرسال</strong><span>راجع رقم الترخيص ووضوح الصورة، ثم أرسل الطلب مجدداً.</span></div></div>}
      <form className="job-form license-form" onSubmit={submitLicense}>
        <div className="form-section-head"><div><Building2 /><div><h2>بيانات الترخيص</h2><p>أدخل البيانات كما تظهر في الوثيقة الرسمية.</p></div></div><span className="required-note">جميع الحقول مطلوبة</span></div>
        <div className="form-grid">
          <label className="wide"><span>اسم الشركة أو المنشأة أو المشروع *</span><input value={draft.companyName} onChange={event => setDraft({ ...draft, companyName: event.target.value })} placeholder="مثال: شركة الأمل للتجارة والخدمات" /></label>
          <label><span>نوع الجهة *</span><select value={draft.legalType} onChange={event => setDraft({ ...draft, legalType: event.target.value })}><option>شركة</option><option>مؤسسة</option><option>منشأة</option><option>مشروع</option><option>منظمة</option></select></label>
          <label><span>رقم الترخيص الرسمي *</span><input value={draft.licenseNumber} onChange={event => setDraft({ ...draft, licenseNumber: event.target.value })} placeholder="أدخل رقم الترخيص" dir="ltr" /></label>
        </div>
        <label className={`license-upload ${draft.imageData ? 'has-image' : ''}`}>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={event => selectImage(event.target.files?.[0])} />
          {draft.imageData ? <><img src={draft.imageData} alt="معاينة مصغرة للترخيص" /><div><CheckCircle2 /><strong>تم إرفاق صورة الترخيص</strong><span>{draft.imageName}</span></div><button type="button" onClick={event => { event.preventDefault(); setPreviewOpen(true) }}><Eye /> معاينة</button></> : <><UploadCloud /><div><strong>ارفع صورة واضحة للترخيص</strong><span>JPG أو PNG أو WEBP، بحد أقصى 2MB</span></div></>}
        </label>
        <div className="privacy-note"><ShieldCheck /><span>الوثيقة سرية ولا يراها سوى مالك المنصة لغرض التحقق والأرشفة.</span></div>
        <div className="form-footer"><span>لن يُطلب الترخيص مرة أخرى بعد اعتماده.</span><div className="form-actions">{draft.imageData && <button type="button" className="secondary-button" onClick={() => setPreviewOpen(true)}><Eye /> معاينة الطلب</button>}<button className="primary-button" type="submit"><ShieldCheck /> إرسال للتوثيق</button></div></div>
      </form>
      <AnimatePresence>{previewOpen && <LicensePreview license={draft} title="معاينة طلب التوثيق" onClose={() => setPreviewOpen(false)} />}</AnimatePresence>
    </>
  )
}

function LicensePreview({ license, title, onClose, actions }: { license: CompanyLicense; title: string; onClose: () => void; actions?: ReactNode }) {
  return <motion.div className="modal-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}><motion.div className="modal license-preview-modal" initial={{ scale: .96, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96 }} onClick={event => event.stopPropagation()}><button className="modal-close" onClick={onClose}><X /></button><div className="license-preview-head"><ShieldCheck /><div><span className="eyebrow">وثيقة خاصة</span><h2>{title}</h2><p>{license.companyName || 'لم يُدخل اسم الجهة بعد'}</p></div></div><div className="license-preview-image">{license.imageData ? <img src={license.imageData} alt="صورة ترخيص المنشأة" /> : <EmptyState icon={<FileText />} title="لا توجد صورة" text="أرفق صورة الترخيص أولاً." />}</div><div className="license-preview-data"><div><span>اسم الجهة</span><strong>{license.companyName || '—'}</strong></div><div><span>نوع الجهة</span><strong>{license.legalType}</strong></div><div><span>رقم الترخيص</span><strong dir="ltr">{license.licenseNumber || '—'}</strong></div><div><span>تاريخ الإرسال</span><strong>{license.submittedAt || 'قبل الإرسال'}</strong></div></div>{actions && <div className="modal-actions">{actions}</div>}</motion.div></motion.div>
}

function LicenseManagement({ license, setLicense, notify }: { license: CompanyLicense; setLicense: (license: CompanyLicense) => void; notify: (message: string) => void }) {
  const [previewOpen, setPreviewOpen] = useState(false)
  const downloadImage = (archive = false) => {
    if (!license.imageData) return notify('لا توجد صورة ترخيص لتنزيلها')
    const extension = license.imageName.split('.').pop() || 'jpg'
    const link = document.createElement('a')
    link.href = license.imageData
    link.download = `${archive ? 'HazarJob-License-Archive' : 'HazarJob-License'}-${license.companyName}-${license.licenseNumber}.${extension}`
    document.body.appendChild(link)
    link.click()
    link.remove()
    if (archive) {
      setLicense({ ...license, archived: true })
      notify('تم تنزيل صورة الترخيص وأرشفتها على جهازك')
    } else notify('تم تنزيل صورة الترخيص')
  }
  const approve = () => { setLicense({ ...license, status: 'approved' }); notify(`تم توثيق ${license.companyName} وفتح لوحة صاحب العمل`) }
  const reject = () => { setLicense({ ...license, status: 'rejected' }); setPreviewOpen(false); notify('تم رفض الطلب وإعادته لصاحب العمل للتصحيح') }

  return <>
    <PageTitle eyebrow="توثيق أصحاب العمل" title="تراخيص المنشآت" text="عاين وثائق التسجيل واعتمد الجهات الموثوقة، ثم احتفظ بنسخة مؤرشفة على جهازك." />
    {license.status === 'not_submitted' ? <EmptyState icon={<Building2 />} title="لا توجد طلبات توثيق حالياً" text="سيظهر هنا أول طلب ترخيص يرسله صاحب عمل جديد." /> :
      <div className="license-admin-card"><div className="license-admin-thumb">{license.imageData ? <img src={license.imageData} alt="صورة الترخيص" /> : <FileText />}</div><div className="license-admin-info"><div><span className={`status-pill ${license.status === 'approved' ? 'accepted' : license.status === 'rejected' ? 'rejected' : 'review'}`}>{license.status === 'approved' ? 'معتمد' : license.status === 'rejected' ? 'مرفوض' : 'بانتظار المراجعة'}</span>{license.archived && <span className="status-pill accepted"><Archive /> مؤرشف على الجهاز</span>}</div><h2>{license.companyName}</h2><p>{license.legalType} · رقم الترخيص <b dir="ltr">{license.licenseNumber}</b></p><small>أُرسل في {license.submittedAt}</small></div><div className="license-admin-actions"><button className="view-button" onClick={() => setPreviewOpen(true)}><Eye /> معاينة</button><button className="secondary-button" onClick={() => downloadImage(false)}><Download /> تنزيل الصورة</button><button className="secondary-button" onClick={() => downloadImage(true)}><Archive /> أرشفة على جهازي</button>{license.status !== 'approved' && <button className="primary-button" onClick={approve}><Check /> موافقة وتوثيق</button>}{license.status !== 'rejected' && <button className="reject-action" onClick={reject}><XCircle /> رفض</button>}</div></div>}
    <AnimatePresence>{previewOpen && <LicensePreview license={license} title="مراجعة ترخيص صاحب العمل" onClose={() => setPreviewOpen(false)} actions={<><button className="reject-action" onClick={reject}><XCircle /> رفض وإعادة للتصحيح</button><button className="secondary-button" onClick={() => downloadImage(true)}><Archive /> أرشفة الصورة</button><button className="primary-button" onClick={approve}><Check /> موافقة وتوثيق</button></>} />}</AnimatePresence>
  </>
}

function PostJob({ notify, onPublish }: { notify: (message: string) => void; onPublish: (job: Job) => void }) {
  const [step, setStep] = useState(1)
  const [receipt, setReceipt] = useState(false)
  const [transactionRef, setTransactionRef] = useState('')
  const [title, setTitle] = useState('')
  const [skills, setSkills] = useState('React, TypeScript')
  const [category, setCategory] = useState('برمجة')
  const [jobCity, setJobCity] = useState('صنعاء')
  const [jobType, setJobType] = useState('دوام كامل')
  const [deadlineDay, setDeadlineDay] = useState('31')
  const [deadlineMonth, setDeadlineMonth] = useState('يوليو')
  const [deadlineYear, setDeadlineYear] = useState('2026')
  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!title) return notify('أدخل المسمى الوظيفي أولاً')
    if (step === 1) return setStep(2)
    if (manualPaymentsEnabled && !transactionRef.trim()) return notify('أدخل رقم الحوالة الموجود في الإيصال')
    if (manualPaymentsEnabled && !receipt) return notify('أرفق صورة إيصال التحويل')
    onPublish({
      id: Date.now(), title, company: 'يمن تك للحلول', city: jobCity, type: jobType,
      category, salary: 'يحدد بعد المقابلة', posted: 'الآن', deadline: `${deadlineDay} ${deadlineMonth} ${deadlineYear}`,
      match: 89, verified: false, description: 'فرصة وظيفية جديدة ببيئة عمل احترافية وفريق طموح.',
      requirements: ['خبرة مناسبة في المجال', 'مهارات تواصل وعمل جماعي'],
      skills: skills.split(',').map(item => item.trim()).filter(Boolean),
      initials: 'YT', logoColor: '#1378e5', applicants: 0, views: 0,
    })
    notify(manualPaymentsEnabled ? 'تم إرسال الوظيفة للمراجعة والتحقق من الدفع' : 'تم إرسال الوظيفة إلى إدارة المنصة للمراجعة')
  }
  return (
    <>
      <PageTitle eyebrow="فرصة جديدة" title="نشر وظيفة" text="أدخل تفاصيل واضحة لتحصل على مرشحين أكثر ملاءمة." />
      <div className="steps"><div className={step >= 1 ? 'active' : ''}><b>1</b><span>تفاصيل الوظيفة</span></div><i /><div className={step >= 2 ? 'active' : ''}><b>2</b><span>{manualPaymentsEnabled ? 'المستندات والدفع' : 'المستندات'}</span></div><i /><div><b>3</b><span>المراجعة والنشر</span></div></div>
      <form className="job-form" onSubmit={submit}>
        {step === 1 ? (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="form-section-head"><div><BriefcaseBusiness /><h2>بيانات الوظيفة الأساسية</h2></div><p>الحقول المعلّمة مطلوبة</p></div>
            <div className="form-grid">
              <label className="wide"><span>المسمى الوظيفي *</span><input value={title} onChange={e => setTitle(e.target.value)} placeholder="مثال: مهندس برمجيات أول" /></label>
              <label><span>التصنيف *</span><select value={category} onChange={event => setCategory(event.target.value)}>{jobCategories.map(item => <option key={item}>{item}</option>)}</select></label>
              <label><span>نوع الدوام *</span><select value={jobType} onChange={event => setJobType(event.target.value)}><option>دوام كامل</option><option>دوام جزئي</option><option>عن بعد</option><option>عقد</option><option>عمل حر</option></select></label>
              <label><span>المدينة *</span><select value={jobCity} onChange={event => setJobCity(event.target.value)}>{yemenCities.map(item => <option key={item}>{item}</option>)}</select></label>
              <label><span>آخر موعد للتقديم (سنة / شهر / يوم)</span><div className="date-parts"><select value={deadlineYear} onChange={event => setDeadlineYear(event.target.value)}>{[2026, 2027, 2028, 2029, 2030].map(year => <option key={year}>{year}</option>)}</select><select value={deadlineMonth} onChange={event => setDeadlineMonth(event.target.value)}>{arabicMonths.map(month => <option key={month}>{month}</option>)}</select><select value={deadlineDay} onChange={event => setDeadlineDay(event.target.value)}>{Array.from({ length: 31 }, (_, index) => String(index + 1)).map(day => <option key={day}>{day}</option>)}</select></div></label>
              <label className="wide"><span>وصف الوظيفة *</span><textarea rows={5} placeholder="اشرح المسؤوليات وطبيعة العمل والنتائج المتوقعة..." /></label>
              <label className="wide"><span>المهارات المطلوبة</span><input value={skills} onChange={e => setSkills(e.target.value)} placeholder="افصل بين المهارات بفاصلة" /><small>تُستخدم هذه المهارات لحساب نسبة التطابق بالذكاء الاصطناعي.</small></label>
            </div>
            <div className="form-footer"><span>سيتم حفظ المسودة تلقائياً</span><button className="primary-button" type="submit">التالي: {manualPaymentsEnabled ? 'المستندات والدفع' : 'المستندات'} <ArrowLeft /></button></div>
          </motion.div>
        ) : (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <div className="form-section-head"><div>{manualPaymentsEnabled ? <ReceiptText /> : <FileCheck2 />}<h2>{manualPaymentsEnabled ? 'المستندات وتأكيد الدفع' : 'المستندات المطلوبة'}</h2></div><button type="button" className="text-button" onClick={() => setStep(1)}>تعديل التفاصيل</button></div>
            <div className="documents-choice"><h3>المستندات المطلوبة من المتقدم</h3><label><input type="radio" name="docs" defaultChecked /><div><FileText /><strong>السيرة الذاتية فقط</strong><span>تقديم أسرع وعدد متقدمين أكبر</span></div></label><label><input type="radio" name="docs" /><div><FileCheck2 /><strong>السيرة + الشهادات</strong><span>مناسب للوظائف المتخصصة</span></div></label><label><input type="radio" name="docs" /><div><FileText /><strong>السيرة + خطاب تغطية</strong><span>CV + Cover Letter</span></div></label></div>
            {manualPaymentsEnabled && <div className="payment-box">
              <div className="payment-price"><span>رسوم نشر وظيفة واحدة</span><strong>5,000 <small>ريال يمني</small></strong><p>نشطة لمدة 30 يوماً مع مطابقة ذكية للمرشحين</p></div>
              <div className="payment-details"><div><span>حوّل الرسوم إلى {ownerPaymentMethod}</span>{ownerBuild && <strong>{ownerPaymentRecipient}</strong>}<b dir="ltr">رقم الحساب: {ownerPaymentAccount}</b></div><label><span>أدخل رقم الحوالة من الإيصال *</span><input value={transactionRef} onChange={event => setTransactionRef(event.target.value)} placeholder="أدخل رقم الحوالة كما يظهر في الإيصال" dir="ltr" /></label><label className={`receipt-upload ${receipt ? 'done' : ''}`}><input type="file" accept="image/*" onChange={() => setReceipt(true)} />{receipt ? <><CheckCircle2 /><strong>تم إرفاق الإيصال</strong><span>receipt-payment.jpg</span></> : <><UploadCloud /><strong>ارفع صورة الإيصال</strong><span>PNG أو JPG بحد أقصى 5MB</span></>}</label></div>
            </div>}
            {manualPaymentsEnabled ? <div className="verification-note"><ShieldCheck /><div><strong>تأكيد سريع بعد التحويل</strong><span>بعد نجاح التحويل، أدخل رقم الحوالة من الإيصال ليتم تفعيل الإعلان وإرساله للمراجعة الفورية من الإدارة.</span></div></div> : <div className="verification-note"><ShieldCheck /><div><strong>مراجعة الإعلان قبل النشر</strong><span>سيصل الإعلان إلى إدارة المنصة للتحقق من بيانات المنشأة وجودة تفاصيل الوظيفة قبل نشره.</span></div></div>}
            <div className="form-footer"><button type="button" className="secondary-button" onClick={() => setStep(1)}>السابق</button><button className="primary-button" type="submit">{manualPaymentsEnabled ? 'تحقق وإرسال للمراجعة' : 'إرسال للمراجعة'} <ArrowLeft /></button></div>
          </motion.div>
        )}
      </form>
    </>
  )
}

function Applicants({ applicants, jobs, onSelect, onUpdate }: { applicants: Applicant[]; jobs: Job[]; onSelect: (item: Applicant) => void; onUpdate: (id: number, status: AppStatus) => void }) {
  const [filter, setFilter] = useState('الكل')
  const visible = applicants.filter(item => filter === 'الكل' || statusText[item.status] === filter).sort((a, b) => b.match - a.match)
  return (
    <>
      <PageTitle eyebrow="الاختيار الذكي" title="إدارة المتقدمين" text="راجع أفضل المرشحين واتخذ قرارك بسرعة." />
      <div className="toolbar"><div className="search-field compact"><Search /><input placeholder="ابحث عن مرشح..." /></div><label className="select-field compact"><Filter /><select value={filter} onChange={e => setFilter(e.target.value)}><option>الكل</option><option>تحت المراجعة</option><option>مقبول</option><option>مرفوض</option></select></label><span>{visible.length} متقدم</span></div>
      <div className="applicants-list">
        {visible.map(item => <motion.div layout className="applicant-card" key={item.id}>
          <div className="avatar large">{item.name.slice(0, 2)}</div><div className="applicant-info"><strong>{item.name}</strong><span>{item.title} · {item.city}</span><small>لـ {jobs.find(job => job.id === item.jobId)?.title} · {item.appliedAt}</small><div className="skill-tags">{item.skills.map(skill => <span key={skill}>{skill}</span>)}</div></div>
          <MatchRing value={item.match} />
          <div className="applicant-actions"><button className="view-button" onClick={() => onSelect(item)}><Eye /> عرض الملف</button><div><button title="قبول" onClick={() => onUpdate(item.id, 'accepted')} className="accept"><Check /></button><button title="مراجعة" onClick={() => onUpdate(item.id, 'review')} className="review"><Clock3 /></button><button title="رفض" onClick={() => onUpdate(item.id, 'rejected')} className="reject"><X /></button></div></div>
          <span className={`status-pill ${item.status}`}>{statusText[item.status]}</span>
        </motion.div>)}
      </div>
    </>
  )
}

function ApplicantModal({ applicant, onClose, onUpdate }: { applicant: Applicant; onClose: () => void; onUpdate: (id: number, status: AppStatus) => void }) {
  return (
    <motion.div className="modal-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal" initial={{ scale: .96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96 }} onClick={e => e.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X /></button>
        <div className="resume-head"><div className="avatar xlarge">{applicant.name.slice(0, 2)}</div><div><span className="eyebrow"><Sparkles /> ملف محلل بالذكاء الاصطناعي</span><h2>{applicant.name}</h2><p>{applicant.title} · {applicant.city}</p></div><MatchRing value={applicant.match} /></div>
        <div className="resume-section"><h3>التعليم</h3><p>{applicant.education}</p></div>
        <div className="resume-section"><h3>المهارات</h3><div className="skill-tags">{applicant.skills.map(skill => <span key={skill}>{skill}</span>)}</div></div>
        <div className="resume-section"><h3>الخبرات</h3><p>{applicant.experience}</p></div>
        <div className="resume-section"><h3>الدورات التدريبية</h3><ul className="resume-list">{applicant.courses.map(course => <li key={course}><Check />{course}</li>)}</ul></div>
        <div className="resume-section"><h3>اللغات</h3><ul className="resume-list">{applicant.languages.map(language => <li key={language}><Check />{language}</li>)}</ul></div>
        <div className="modal-actions"><button className="reject-action" onClick={() => onUpdate(applicant.id, 'rejected')}><XCircle /> رفض</button><button className="secondary-button" onClick={() => onUpdate(applicant.id, 'review')}><Clock3 /> للمراجعة</button><button className="primary-button" onClick={() => onUpdate(applicant.id, 'accepted')}><UserCheck /> قبول المرشح</button></div>
      </motion.div>
    </motion.div>
  )
}

function OwnerDashboard({ jobs, applicants, goTo, ownerName }: { jobs: Job[]; applicants: Applicant[]; goTo: (view: View) => void; ownerName: string }) {
  const [showFullActivity, setShowFullActivity] = useState(false)
  return (
    <>
      <div className="owner-hero"><div><span className="eyebrow"><ShieldCheck /> حساب المالك الرئيسي</span><h1>مركز قيادة هازار</h1><p>تحكم كامل بالمنصة والمحتوى والمستخدمين والمدفوعات من مكان واحد.</p></div><div className="system-live"><i /> جميع الأنظمة تعمل</div></div>
      <div className="stats-grid owner-stats"><Stat icon={<CircleDollarSign />} label="إيرادات الشهر" value="1.24M ر.ي" note="+18.4% عن يونيو" tone="gold" /><Stat icon={<Users />} label="المستخدمون" value="8,492" note="+213 هذا الشهر" tone="blue" /><Stat icon={<BriefcaseBusiness />} label="إجمالي الوظائف" value="326" note={`${jobs.length} وظائف نشطة`} tone="green" /><Stat icon={<HeartHandshake />} label="توظيف ناجح" value="1,128" note="منذ إطلاق المنصة" tone="violet" /></div>
      <div className="admin-grid">
        <section className="panel revenue-panel"><div className="panel-head"><div><h2>نمو المنصة</h2><p>الوظائف والمتقدمون خلال 7 أشهر</p></div><select><option>آخر 7 أشهر</option></select></div><div className="chart">
          {[38, 49, 44, 61, 68, 76, 92].map((h, i) => <div key={i}><div className="bar applicants-bar" style={{ height: `${h}%` }} /><div className="bar jobs-bar" style={{ height: `${Math.max(20, h - 24)}%` }} /><span>{['ينا', 'فبر', 'مار', 'أبر', 'ماي', 'يون', 'يول'][i]}</span></div>)}
        </div><div className="chart-legend"><span><i className="blue-dot" /> المتقدمون</span><span><i className="gold-dot" /> الوظائف</span></div></section>
        <section className="panel quick-admin"><div className="panel-head"><div><h2>إجراءات عاجلة</h2><p>بانتظار تدخلك</p></div></div>
          <button onClick={() => goTo('moderation')}><span className="quick-icon amber"><ReceiptText /></span><div><strong>3 مدفوعات معلقة</strong><small>تحتاج تحققاً يدوياً</small></div><ArrowLeft /></button>
          <button onClick={() => goTo('moderation')}><span className="quick-icon blue"><FileCheck2 /></span><div><strong>5 وظائف للمراجعة</strong><small>محتوى جديد قبل النشر</small></div><ArrowLeft /></button>
          <button onClick={() => goTo('users')}><span className="quick-icon red"><Users /></span><div><strong>بلاغان من المستخدمين</strong><small>أولوية متوسطة</small></div><ArrowLeft /></button>
        </section>
      </div>
      <section className="panel activity-panel"><div className="panel-head"><div><h2>آخر نشاطات الإدارة</h2><p>سجل العمليات الحساسة على المنصة</p></div><button className="text-button" onClick={() => setShowFullActivity(!showFullActivity)}>{showFullActivity ? 'عرض المختصر' : 'عرض السجل الكامل'}</button></div><div className={`activity-list ${showFullActivity ? 'full' : ''}`}>
        <div><span className="quick-icon green"><Check /></span><p><strong>اعتمدت وظيفة “مدير عمليات”</strong><small>اليوم، 11:32 ص · بواسطة {ownerName}</small></p></div>
        <div><span className="quick-icon blue"><UserCheck /></span><p><strong>تم توثيق حساب شركة سبأفون</strong><small>اليوم، 9:15 ص · بواسطة {ownerName}</small></p></div>
        <div><span className="quick-icon amber"><Settings /></span><p><strong>تم تحديث رسوم نشر الوظائف</strong><small>أمس، 6:40 م · بواسطة {ownerName}</small></p></div>
        {showFullActivity && <><div><span className="quick-icon blue"><Bell /></span><p><strong>تم تفعيل جميع إشعارات المالك</strong><small>اليوم، 4:18 م · بواسطة {ownerName}</small></p></div><div><span className="quick-icon green"><ReceiptText /></span><p><strong>تم تحديث بيانات محفظة جيب</strong><small>اليوم، 4:24 م · بواسطة {ownerName}</small></p></div><div><span className="quick-icon amber"><ShieldCheck /></span><p><strong>تم تأكيد حساب المالك الوحيد</strong><small>اليوم، 4:31 م · بواسطة النظام</small></p></div></>}
      </div></section>
    </>
  )
}

function Moderation({ jobs, setJobs, notify }: { jobs: Job[]; setJobs: (jobs: Job[]) => void; notify: (message: string) => void }) {
  const [tab, setTab] = useState('الوظائف')
  const [editingJob, setEditingJob] = useState<Job | null>(null)
  const approve = (id: number) => {
    setJobs(jobs.map(job => job.id === id ? { ...job, verified: true } : job))
    void apiRequest(`/api/jobs/${id}`, { method: 'PATCH', body: JSON.stringify({ verified: true }) }).catch(() => undefined)
    notify('تم اعتماد الوظيفة ونشرها')
  }
  const remove = (id: number) => {
    setJobs(jobs.filter(job => job.id !== id))
    void apiRequest(`/api/jobs/${id}`, { method: 'DELETE' }).catch(() => undefined)
    notify('تم حذف الوظيفة من المنصة')
  }
  const saveJob = (updatedJob: Job) => {
    setJobs(jobs.map(job => job.id === updatedJob.id ? updatedJob : job))
    void apiRequest(`/api/jobs/${updatedJob.id}`, { method: 'PATCH', body: JSON.stringify(updatedJob) }).catch(() => undefined)
    setEditingJob(null)
    notify('تم حفظ تعديلات الوظيفة')
  }
  const exportReport = () => {
    const rows = [
      ['المسمى الوظيفي', 'الشركة', 'المدينة', 'نوع الدوام', 'الحالة', 'المشاهدات', 'المتقدمون', 'تاريخ النشر'],
      ...jobs.map(job => [job.title, job.company, job.city, job.type, job.verified ? 'منشورة' : 'بانتظار الاعتماد', String(job.views), String(job.applicants), job.posted]),
    ]
    const escapeCell = (value: string) => `"${value.replace(/"/g, '""')}"`
    const csv = `\uFEFF${rows.map(row => row.map(escapeCell).join(',')).join('\r\n')}`
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }))
    const link = document.createElement('a')
    link.href = url
    link.download = `hazar-job-report-2026-07-16.csv`
    document.body.appendChild(link)
    link.click()
    link.remove()
    URL.revokeObjectURL(url)
    notify('تم تنزيل تقرير الوظائف بنجاح')
  }
  return (
    <>
      <PageTitle eyebrow="صلاحيات المالك" title="الوظائف والمدفوعات" text="راجع المحتوى، تحقق من الإيصالات، وتحكم بحالة النشر." action={<button className="primary-button" onClick={exportReport}><Download /> تصدير التقرير</button>} />
      <div className="tabs"><button className={tab === 'الوظائف' ? 'active' : ''} onClick={() => setTab('الوظائف')}>الوظائف <b>{jobs.length}</b></button><button className={tab === 'المدفوعات' ? 'active' : ''} onClick={() => setTab('المدفوعات')}>المدفوعات المعلقة <b>3</b></button></div>
      {tab === 'الوظائف' ? <div className="admin-table">
        <div className="admin-table-head"><span>الوظيفة والشركة</span><span>الحالة</span><span>الإحصاءات</span><span>تاريخ النشر</span><span>الإجراءات</span></div>
        {jobs.map(job => <div className="admin-table-row" key={job.id}><div className="table-job"><div className="company-logo small-logo" style={{ background: job.logoColor }}>{job.initials}</div><div><strong>{job.title}</strong><span>{job.company} · {job.city}</span></div></div><span className={`status-pill ${job.verified ? 'accepted' : 'review'}`}>{job.verified ? 'منشورة' : 'بانتظار الاعتماد'}</span><span>{job.views} مشاهدة · {job.applicants} متقدم</span><span>{job.posted}</span><div className="row-actions">{!job.verified && <button className="accept" title="اعتماد" onClick={() => approve(job.id)}><Check /></button>}<button className="view-button" onClick={() => setEditingJob(job)}><Eye /> تعديل</button><button className="reject" title="حذف" onClick={() => remove(job.id)}><Trash2 /></button></div></div>)}
      </div> : <Payments notify={notify} />}
      <AnimatePresence>{editingJob && <JobEditorModal job={editingJob} onClose={() => setEditingJob(null)} onSave={saveJob} />}</AnimatePresence>
    </>
  )
}

function JobEditorModal({ job, onClose, onSave }: { job: Job; onClose: () => void; onSave: (job: Job) => void }) {
  const [draft, setDraft] = useState(job)
  const [requirements, setRequirements] = useState(job.requirements.join('\n'))
  const [skills, setSkills] = useState(job.skills.join('، '))
  const update = (field: keyof Job, value: string | boolean) => setDraft(current => ({ ...current, [field]: value }))
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!draft.title.trim() || !draft.company.trim() || !draft.description.trim()) return
    onSave({
      ...draft,
      requirements: requirements.split('\n').map(item => item.trim()).filter(Boolean),
      skills: skills.split(/[،,]/).map(item => item.trim()).filter(Boolean),
      initials: draft.company.trim().slice(0, 2),
    })
  }
  return (
    <motion.div className="modal-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.form className="modal editor-modal" initial={{ scale: .97, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .97 }} onClick={event => event.stopPropagation()} onSubmit={submit}>
        <button type="button" className="modal-close" onClick={onClose}><X /></button>
        <div className="modal-title"><span className="quick-icon blue"><BriefcaseBusiness /></span><div><span className="eyebrow">محرر الوظائف</span><h2>تعديل بيانات الوظيفة</h2><p>تظهر التغييرات مباشرة في جميع واجهات التطبيق.</p></div></div>
        <div className="form-grid editor-form">
          <label><span>المسمى الوظيفي *</span><input required value={draft.title} onChange={event => update('title', event.target.value)} /></label>
          <label><span>الشركة *</span><input required value={draft.company} onChange={event => update('company', event.target.value)} /></label>
          <label><span>التصنيف</span><select value={draft.category} onChange={event => update('category', event.target.value)}>{jobCategories.map(item => <option key={item}>{item}</option>)}</select></label>
          <label><span>المدينة</span><select value={draft.city} onChange={event => update('city', event.target.value)}>{yemenCities.map(item => <option key={item}>{item}</option>)}</select></label>
          <label><span>نوع الدوام</span><select value={draft.type} onChange={event => update('type', event.target.value)}>{['دوام كامل', 'دوام جزئي', 'عن بعد', 'عقد', 'عمل حر'].map(item => <option key={item}>{item}</option>)}</select></label>
          <label><span>الراتب</span><input value={draft.salary} onChange={event => update('salary', event.target.value)} /></label>
          <label><span>آخر موعد للتقديم</span><input value={draft.deadline} onChange={event => update('deadline', event.target.value)} /></label>
          <label className="wide"><span>المهارات المطلوبة</span><input value={skills} onChange={event => setSkills(event.target.value)} placeholder="React، إدارة، مبيعات" /></label>
          <label className="wide"><span>الوصف *</span><textarea required rows={5} value={draft.description} onChange={event => update('description', event.target.value)} /></label>
          <label className="wide"><span>المتطلبات، متطلب في كل سطر</span><textarea rows={5} value={requirements} onChange={event => setRequirements(event.target.value)} /></label>
        </div>
        <div className="setting-row compact-row"><div><strong>حالة النشر</strong><span>يمكن إيقاف الوظيفة مؤقتاً أو نشرها فوراً.</span></div><label className="switch"><input type="checkbox" checked={draft.verified} onChange={() => update('verified', !draft.verified)} /><span /></label></div>
        <div className="modal-actions"><button type="button" className="secondary-button" onClick={onClose}>إلغاء</button><button className="primary-button" type="submit"><Check /> حفظ التعديلات</button></div>
      </motion.form>
    </motion.div>
  )
}

type Payment = { reference: string; method: string; company: string; amount: string; date: string; status: 'review' | 'accepted' | 'rejected' }

function Payments({ notify }: { notify: (message: string) => void }) {
  const [payments, setPayments] = useState<Payment[]>([
    { reference: 'TRX-2840193', method: 'بنك اليمن الدولي', company: 'يمن تك للحلول', amount: '15,000 ر.ي', date: '16 يوليو 2026، 10:14 ص', status: 'review' },
    { reference: 'CW-827410', method: 'محفظة كاش', company: 'شركة الأمل التجارية', amount: '15,000 ر.ي', date: '16 يوليو 2026، 9:42 ص', status: 'review' },
    { reference: 'ONE-992841', method: 'ون كاش', company: 'مؤسسة بناء', amount: '30,000 ر.ي', date: '15 يوليو 2026، 6:21 م', status: 'review' },
  ])
  const [selected, setSelected] = useState<Payment | null>(null)
  const updateStatus = (reference: string, status: Payment['status']) => {
    setPayments(list => list.map(payment => payment.reference === reference ? { ...payment, status } : payment))
    setSelected(current => current?.reference === reference ? { ...current, status } : current)
    notify(status === 'accepted' ? `تم اعتماد الدفعة رقم ${reference}` : 'تم رفض الدفعة وإبلاغ صاحب العمل')
  }
  return (
    <>
      <div className="payment-list">{payments.map(payment => <div key={payment.reference}><div className="receipt-thumb"><ReceiptText /></div><div className="grow"><strong>{payment.company}</strong><span>{payment.method} · المرجع: <b>{payment.reference}</b></span></div><strong>{payment.amount}</strong><span className={`status-pill ${payment.status}`}>{payment.status === 'review' ? <><Clock3 /> قيد التحقق</> : payment.status === 'accepted' ? <><Check /> معتمدة</> : <><X /> مرفوضة</>}</span><button className="view-button" onClick={() => setSelected(payment)}><Eye /> الإيصال</button><button className="accept-action" disabled={payment.status === 'accepted'} onClick={() => updateStatus(payment.reference, 'accepted')}><Check /> اعتماد</button><button className="reject" title="رفض" disabled={payment.status === 'rejected'} onClick={() => updateStatus(payment.reference, 'rejected')}><X /></button></div>)}</div>
      <AnimatePresence>{selected && <PaymentReceiptModal payment={selected} onClose={() => setSelected(null)} onUpdate={updateStatus} />}</AnimatePresence>
    </>
  )
}

function PaymentReceiptModal({ payment, onClose, onUpdate }: { payment: Payment; onClose: () => void; onUpdate: (reference: string, status: Payment['status']) => void }) {
  return (
    <motion.div className="modal-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal receipt-modal" initial={{ scale: .96, y: 20 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .96 }} onClick={event => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X /></button>
        <div className="receipt-modal-head"><span className="quick-icon blue"><ReceiptText /></span><div><span className="eyebrow">مراجعة إثبات الدفع</span><h2>إيصال {payment.company}</h2><p>تحقق من البيانات قبل اعتماد نشر الوظيفة.</p></div></div>
        <div className="receipt-preview">
          <div className="receipt-paper">
            <div className="receipt-brand"><strong>{payment.method}</strong><span>إيصال تحويل إلكتروني</span></div>
            <div className="receipt-amount"><span>المبلغ المحول</span><strong>{payment.amount}</strong></div>
            <dl><div><dt>المرسل</dt><dd>{payment.company}</dd></div><div><dt>رقم الحوالة</dt><dd dir="ltr">{payment.reference}</dd></div><div><dt>تاريخ الحوالة</dt><dd>{payment.date}</dd></div><div><dt>حالة الحوالة</dt><dd className="receipt-success"><CheckCircle2 /> ناجحة</dd></div></dl>
            <div className="receipt-stamp"><ShieldCheck /> نسخة مرفوعة من صاحب العمل</div>
          </div>
        </div>
            <div className="receipt-summary"><div><span>حالة المراجعة</span><strong>{payment.status === 'review' ? 'بانتظار قرارك' : payment.status === 'accepted' ? 'تم الاعتماد' : 'تم الرفض'}</strong></div><div><span>رقم الحوالة</span><strong dir="ltr">{payment.reference}</strong></div></div>
        <div className="modal-actions"><button className="reject-action" onClick={() => onUpdate(payment.reference, 'rejected')}><XCircle /> رفض الدفعة</button><button className="primary-button" onClick={() => onUpdate(payment.reference, 'accepted')}><Check /> اعتماد الدفعة</button></div>
      </motion.div>
    </motion.div>
  )
}

type ManagedUser = {
  id: number
  name: string
  email: string
  role: 'طالب عمل' | 'صاحب عمل'
  status: 'نشط' | 'موثّق' | 'بانتظار التوثيق' | 'موقوف'
  joined: string
  city: string
  phone: string
  activity: string
}

function UsersAdmin({ notify }: { notify: (message: string) => void }) {
  const [users, setUsers] = useState<ManagedUser[]>([
    { id: 1, name: 'سارة محمد القباطي', email: 'sarah.q@email.com', role: 'طالب عمل', status: 'نشط', joined: '12 يوليو 2026', city: 'صنعاء', phone: '+967 777 213 490', activity: 'تقدمت إلى 4 وظائف وحفظت وظيفتين.' },
    { id: 2, name: 'يمن تك للحلول', email: 'hr@yemente.ch', role: 'صاحب عمل', status: 'موثّق', joined: '4 يوليو 2026', city: 'صنعاء', phone: '+967 1 440 290', activity: 'نشرت 3 وظائف واستقبلت 41 متقدماً.' },
    { id: 3, name: 'عمار علي الصبري', email: 'ammar.s@email.com', role: 'طالب عمل', status: 'نشط', joined: '28 يونيو 2026', city: 'تعز', phone: '+967 735 810 642', activity: 'أكمل ملفه المهني بنسبة 92%.' },
    { id: 4, name: 'شركة الأمل التجارية', email: 'jobs@alamal.ye', role: 'صاحب عمل', status: 'بانتظار التوثيق', joined: '19 يوليو 2026', city: 'عدن', phone: '+967 2 352 711', activity: 'رفعت طلب توثيق وترخيص منشأة.' },
  ])
  const [query, setQuery] = useState('')
  const [selectedUser, setSelectedUser] = useState<ManagedUser | null>(null)
  const updateStatus = (id: number, status: ManagedUser['status']) => {
    setUsers(list => list.map(user => user.id === id ? { ...user, status } : user))
    setSelectedUser(current => current?.id === id ? { ...current, status } : current)
    notify(`تم تحديث حالة الحساب إلى: ${status}`)
  }
  const toggle = (user: ManagedUser) => updateStatus(user.id, user.status === 'موقوف' ? 'نشط' : 'موقوف')
  const visibleUsers = users.filter(user => `${user.name} ${user.email}`.toLowerCase().includes(query.trim().toLowerCase()))
  return (
    <>
      <PageTitle eyebrow="إدارة كاملة" title="المستخدمون" text="إدارة حسابات طالبي العمل وأصحاب العمل، بينما يبقى حساب المالك منفصلاً ووحيداً." action={<span className="owner-only-badge"><ShieldCheck /> المالك الوحيد: صاحب المشروع</span>} />
      <div className="user-toolbar"><div className="search-field compact"><Search /><input value={query} onChange={event => setQuery(event.target.value)} placeholder="ابحث بالاسم أو البريد..." /></div><div className="user-count"><Users /><strong>{users.length.toLocaleString('ar-YE')}</strong><span>حساب في النسخة المحلية</span></div></div>
      <div className="admin-table users-table"><div className="admin-table-head"><span>المستخدم</span><span>نوع الحساب</span><span>الحالة</span><span>تاريخ الانضمام</span><span>الصلاحيات</span></div>
        {visibleUsers.map(user => <div className="admin-table-row" key={user.email}><div className="table-job"><div className="avatar">{user.name.slice(0, 2)}</div><div><strong>{user.name}</strong><span>{user.email}</span></div></div><span>{user.role}</span><span className={`status-pill ${user.status === 'موقوف' ? 'rejected' : user.status === 'بانتظار التوثيق' ? 'review' : 'accepted'}`}>{user.status}</span><span>{user.joined}</span><div className="row-actions">{user.status === 'بانتظار التوثيق' && <button className="accept" title="توثيق" onClick={() => updateStatus(user.id, 'موثّق')}><ShieldCheck /></button>}<button className="view-button" onClick={() => setSelectedUser(user)}><Eye /> عرض</button><button className="reject" title="تفعيل أو إيقاف" onClick={() => toggle(user)}>{user.status === 'موقوف' ? <Check /> : <X />}</button></div></div>)}
      </div>
      <AnimatePresence>{selectedUser && <UserProfileModal user={selectedUser} onClose={() => setSelectedUser(null)} onUpdate={updateStatus} />}</AnimatePresence>
    </>
  )
}

function UserProfileModal({ user, onClose, onUpdate }: { user: ManagedUser; onClose: () => void; onUpdate: (id: number, status: ManagedUser['status']) => void }) {
  return (
    <motion.div className="modal-wrap" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onClose}>
      <motion.div className="modal user-profile-modal" initial={{ scale: .97, y: 18 }} animate={{ scale: 1, y: 0 }} exit={{ scale: .97 }} onClick={event => event.stopPropagation()}>
        <button className="modal-close" onClick={onClose}><X /></button>
        <div className="user-profile-head"><div className="avatar xlarge">{user.name.slice(0, 2)}</div><div><span className="eyebrow">{user.role}</span><h2>{user.name}</h2><p>{user.city} · انضم في {user.joined}</p></div><span className={`status-pill ${user.status === 'موقوف' ? 'rejected' : user.status === 'بانتظار التوثيق' ? 'review' : 'accepted'}`}>{user.status}</span></div>
        <div className="user-profile-details">
          <div><span>البريد الإلكتروني</span><strong dir="ltr">{user.email}</strong></div>
          <div><span>رقم الهاتف</span><strong dir="ltr">{user.phone}</strong></div>
          <div className="wide"><span>آخر نشاط</span><strong>{user.activity}</strong></div>
        </div>
        <div className="owner-identity-box"><ShieldCheck /><div><strong>صلاحيات محددة حسب نوع الحساب</strong><span>هذا المستخدم لا يملك ولا يمكن منحه صلاحية مالك المنصة.</span></div></div>
        <div className="modal-actions">
          {user.role === 'صاحب عمل' && user.status === 'بانتظار التوثيق' && <button className="primary-button" onClick={() => onUpdate(user.id, 'موثّق')}><ShieldCheck /> توثيق الحساب</button>}
          <button className="secondary-button" onClick={() => onUpdate(user.id, user.status === 'موقوف' ? 'نشط' : 'موقوف')}>{user.status === 'موقوف' ? <><Check /> تفعيل الحساب</> : <><XCircle /> إيقاف الحساب</>}</button>
          <button className="secondary-button" onClick={onClose}>إغلاق</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

function FeaturesPage() {
  const features = [
    [<Sparkles />, 'المطابقة الذكية', 'حساب نسبة التوافق بين خبرات طالب العمل ومتطلبات كل وظيفة.'],
    [<FileText />, 'ملف مهني متكامل', 'السيرة الذاتية وشهادات الخبرة والدورات وخطاب التغطية في مكان واحد.'],
    [<Search />, 'بحث وفلاتر يمنية', 'تصنيفات واسعة وجميع مدن ومحافظات اليمن وأنواع الدوام المختلفة.'],
    [<BriefcaseBusiness />, 'نشر وإدارة الوظائف', 'محرر وظائف متكامل، دفع يدوي موثق، وتتبع أداء الإعلان.'],
    [<Users />, 'إدارة المتقدمين', 'فرز المرشحين بالمطابقة ومعاينة الخبرات والدورات واللغات واتخاذ القرار.'],
    [<ShieldCheck />, 'توثيق أصحاب العمل', 'مراجعة تراخيص المنشآت عند التسجيل الأول لحماية المستخدمين.'],
    [<Archive />, 'أرشيف خاص على الجهاز', 'حفظ مستندات الترخيص والسيرة والشهادات داخل مساحة التطبيق الخاصة.'],
    [<Bell />, 'تنبيهات وFeedback', 'إشعارات الوظائف والمدفوعات ورسائل المستخدمين الموجهة لمالك المنصة.'],
  ]
  return <><PageTitle eyebrow="كل ما تحتاجه" title="مميزات هازار للوظائف" text="منصة واحدة تربط الباحثين عن العمل وأصحاب الأعمال في السوق اليمني." /><div className="features-grid">{features.map(([icon, title, text]) => <motion.article whileHover={{ y: -3 }} key={String(title)}><span>{icon}</span><h2>{title}</h2><p>{text}</p></motion.article>)}</div><section className="features-trust"><ShieldCheck /><div><h2>ملكية وتحكم كاملان</h2><p>المالك يتحكم في الوظائف والتراخيص والمدفوعات والمستخدمين والإعدادات والأرشيف، بينما تبقى صلاحية المالك مخفية من النسخ العامة.</p></div></section></>
}

function FeedbackPage({ ownerEmail, onSubmit, notify }: { ownerEmail: string; onSubmit: (item: { id: number; name: string; email: string; message: string; createdAt: string }) => void; notify: (message: string) => void }) {
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [message, setMessage] = useState('')
  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (!name.trim() || !email.trim() || !message.trim()) return notify('أكمل الاسم والبريد والرسالة')
    const item = { id: Date.now(), name, email, message, createdAt: '19 يوليو 2026' }
    onSubmit(item)
    const subject = encodeURIComponent(`Feedback من ${name} عبر Hazar-Job.com`)
    const body = encodeURIComponent(`${message}\n\nالمرسل: ${name}\nالبريد: ${email}`)
    window.open(`mailto:${ownerEmail}?subject=${subject}&body=${body}`, '_blank')
    setMessage('')
    notify('تم حفظ رسالتك وفتح البريد لإرسالها إلى مالك المنصة')
  }
  return <><PageTitle eyebrow="صوتك يهمنا" title="Feedback وملاحظاتك" text="أرسل اقتراحاً أو بلاغاً أو فكرة تطوير لتصل مباشرة إلى بريد مالك المنصة." /><form className="feedback-form" onSubmit={submit}><div className="feedback-letter"><Bell /><div><h2>ساعدنا على تحسين هازار</h2><p>نقرأ كل رسالة بعناية. اشرح اقتراحك أو المشكلة بوضوح، ولن يظهر بريدك أو محتوى رسالتك لأي مستخدم آخر.</p></div></div><div className="form-grid"><label><span>الاسم</span><input value={name} onChange={event => setName(event.target.value)} /></label><label><span>البريد الإلكتروني</span><input value={email} onChange={event => setEmail(event.target.value)} dir="ltr" type="email" /></label><label className="wide"><span>الملاحظة أو الاقتراح</span><textarea rows={7} value={message} onChange={event => setMessage(event.target.value)} placeholder="اكتب رسالتك هنا..." /></label></div><div className="form-footer"><span>سيتم توجيه الرسالة إلى {ownerEmail}</span><button className="primary-button" type="submit"><ArrowLeft /> إرسال Feedback</button></div></form></>
}

function FeedbackInbox({ feedbacks, notify }: { feedbacks: { id: number; name: string; email: string; message: string; createdAt: string }[]; notify: (message: string) => void }) {
  return <><PageTitle eyebrow="رسائل المستخدمين" title="صندوق Feedback" text="الملاحظات والاقتراحات المحفوظة من مستخدمي التطبيق." />{feedbacks.length ? <div className="feedback-inbox">{feedbacks.map(item => <article key={item.id}><div className="avatar">{item.name.slice(0, 2)}</div><div><h2>{item.name}</h2><span dir="ltr">{item.email}</span><p>{item.message}</p><small>{item.createdAt}</small></div><button className="secondary-button" onClick={() => { window.open(`mailto:${item.email}`, '_blank'); notify('تم فتح البريد للرد') }}><ArrowLeft /> رد</button></article>)}</div> : <EmptyState icon={<FileText />} title="لا توجد رسائل بعد" text="ستظهر هنا الرسائل المرسلة من واجهة Feedback." />}</>
}

function PrivacyPage() {
  return <><PageTitle eyebrow="الثقة أولاً" title="الخصوصية والأمان" text="كيف نحمي بيانات المستخدمين والوثائق داخل هازار." /><div className="privacy-grid"><section><ShieldCheck /><h2>الوثائق الخاصة</h2><p>السير الذاتية والشهادات وتراخيص المنشآت لا تظهر للعامة، وتستخدم فقط للتقديم والتحقق الإداري.</p></section><section><Archive /><h2>أرشيف الجهاز</h2><p>يحفظ التطبيق المستندات في مساحة تخزين خاصة به، ويمكن للمالك تنزيل نسخة أو حذفها من قسم الأرشيف.</p></section><section><Users /><h2>الصلاحيات</h2><p>لكل نوع مستخدم واجهته وصلاحياته. خيار المالك موجود فقط في نسخة المالك ولا يظهر في نسخ الجمهور.</p></section><section><FileCheck2 /><h2>الشفافية</h2><p>لا ننشر بيانات الاتصال أو وثائق الدفع أو اسم مستلم الحوالة للعامة، وتخضع الوظائف للمراجعة قبل النشر.</p></section></div><section className="privacy-policy"><h2>سياسة الاستخدام</h2><p>باستخدام المنصة، يوافق المستخدم على تقديم بيانات صحيحة وعدم نشر فرص مضللة أو محتوى مخالف. يمكن طلب تحديث الملفات أو حذف الحساب والبيانات من داخل التطبيق أو عبر صفحة حذف الحساب العامة.</p></section></>
}

function DocumentArchive({ notify }: { notify: (message: string) => void }) {
  const [entries, setEntries] = useState<ArchiveEntry[]>([])
  const [loading, setLoading] = useState(true)
  const refresh = async () => { setLoading(true); setEntries(await listArchive()); setLoading(false) }
  useEffect(() => { void refresh() }, [])
  const remove = async (id: string) => { await deleteArchivedFile(id); await refresh(); notify('تم حذف المستند من الأرشيف الخاص') }
  const labels: Record<ArchiveCategory, string> = { license: 'ترخيص منشأة', cv: 'سيرة ذاتية', experience_certificate: 'شهادة خبرة', training_certificate: 'شهادة دورة' }
  return <><PageTitle eyebrow="ملفك الخاص" title="أرشيف المستندات" text="ملفات محفوظة داخل مساحة التطبيق على جهازك، ويمكن تنزيلها أو حذفها." action={<button className="secondary-button" onClick={() => void refresh()}><Archive /> تحديث الأرشيف</button>} />{loading ? <div className="archive-loading"><span className="loader" /> جارٍ قراءة الأرشيف...</div> : entries.length ? <div className="archive-list">{entries.map(entry => <article key={entry.id}><span className="archive-file-icon"><FileText /></span><div><span>{labels[entry.category]}</span><h2>{entry.name}</h2><p>{entry.owner} · {new Date(entry.createdAt).toLocaleDateString('ar-YE')}</p></div><button className="secondary-button" onClick={() => downloadArchivedFile(entry)}><Download /> تنزيل</button><button className="reject" onClick={() => void remove(entry.id)}><Trash2 /></button></article>)}</div> : <EmptyState icon={<Archive />} title="الأرشيف فارغ" text="ستظهر هنا التراخيص والسير الذاتية والشهادات التي يتم رفعها داخل التطبيق." />}</>
}

type SettingsSection = 'general' | 'pricing' | 'notifications' | 'security'

function PlatformSettings({
  notify, dark, setDark, language, setLanguage, ownerName, setOwnerName, ownerEmail, setOwnerEmail,
  ownerEmailVerified, setOwnerEmailVerified, platformNameAr, setPlatformNameAr,
  platformNameEn, setPlatformNameEn, onBack,
}: {
  notify: (message: string) => void
  dark: boolean
  setDark: (value: boolean) => void
  language: AppLanguage
  setLanguage: (value: AppLanguage) => void
  ownerName: string
  setOwnerName: (value: string) => void
  ownerEmail: string
  setOwnerEmail: (value: string) => void
  ownerEmailVerified: boolean
  setOwnerEmailVerified: (value: boolean) => void
  platformNameAr: string
  setPlatformNameAr: (value: string) => void
  platformNameEn: string
  setPlatformNameEn: (value: string) => void
  onBack: () => void
}) {
  const [section, setSection] = useState<SettingsSection>('general')
  const [jobPrice, setJobPrice] = useState('5000')
  const [featuredPrice, setFeaturedPrice] = useState('10000')
  const [currency, setCurrency] = useState(() => stored('hazar-currency', 'ريال يمني'))
  const [paymentMethod, setPaymentMethod] = useState(ownerPaymentMethod)
  const [paymentRecipientName, setPaymentRecipientName] = useState(ownerPaymentRecipient)
  const [paymentAccountNumber, setPaymentAccountNumber] = useState(ownerPaymentAccount)
  const [manualPayment, setManualPayment] = useState(true)
  const [emailAlerts, setEmailAlerts] = useState(true)
  const [paymentAlerts, setPaymentAlerts] = useState(true)
  const [jobAlerts, setJobAlerts] = useState(true)
  const [securityAlerts, setSecurityAlerts] = useState(true)
  const [twoFactor, setTwoFactor] = useState(true)
  const [sessionTimeout, setSessionTimeout] = useState(() => stored('hazar-session-timeout', '30 دقيقة'))
  const [passwordOpen, setPasswordOpen] = useState(false)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [passwordBusy, setPasswordBusy] = useState(false)
  const [hasLocalPassword, setHasLocalPassword] = useState(() => Boolean(localStorage.getItem('hazar-owner-password')))
  const [ownerApiToken, setOwnerApiToken] = useState(() => stored('hazar-owner-api-token', ''))

  const saveSettings = (event: FormEvent) => {
    event.preventDefault()
    localStorage.setItem('hazar-job-price', JSON.stringify(jobPrice))
    localStorage.setItem('hazar-featured-price', JSON.stringify(featuredPrice))
    localStorage.setItem('hazar-currency', JSON.stringify(currency))
    localStorage.setItem('hazar-payment-method', JSON.stringify(paymentMethod))
    localStorage.setItem('hazar-payment-recipient-name', JSON.stringify(paymentRecipientName))
    localStorage.setItem('hazar-payment-account-number', JSON.stringify(paymentAccountNumber))
    localStorage.setItem('hazar-manual-payment', JSON.stringify(manualPayment))
    localStorage.setItem('hazar-email-alerts', JSON.stringify(emailAlerts))
    localStorage.setItem('hazar-payment-alerts', JSON.stringify(paymentAlerts))
    localStorage.setItem('hazar-job-alerts', JSON.stringify(jobAlerts))
    localStorage.setItem('hazar-security-alerts', JSON.stringify(securityAlerts))
    localStorage.setItem('hazar-two-factor', JSON.stringify(twoFactor))
    localStorage.setItem('hazar-session-timeout', JSON.stringify(sessionTimeout))
    localStorage.setItem('hazar-owner-api-token', JSON.stringify(ownerApiToken.trim()))
    void apiRequest('/api/settings', {
      method: 'PUT',
      body: JSON.stringify({
        platformNameAr,
        platformNameEn,
        jobPrice,
        featuredPrice,
        currency,
        paymentMethod,
        paymentAccountNumber,
        manualPayment,
      }),
    }).catch(() => notify('حُفظت الإعدادات على الجهاز، وتعذرت مزامنتها مع الخادم حالياً'))
    notify('تم حفظ إعدادات المنصة وتطبيقها')
  }

  const updateEmail = (value: string) => {
    setOwnerEmail(value)
    setOwnerEmailVerified(false)
  }

  const verifyEmail = () => {
    const valid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(ownerEmail)
    if (!valid) return notify('أدخل بريداً إلكترونياً صحيحاً أولاً')
    setOwnerEmailVerified(true)
    notify(`تم اعتماد بريد المالك: ${ownerEmail}`)
  }

  const changePassword = async () => {
    if (newPassword.length < 8) return notify('يجب أن تتكون كلمة المرور الجديدة من 8 أحرف على الأقل')
    if (newPassword !== confirmPassword) return notify('تأكيد كلمة المرور غير مطابق')
    setPasswordBusy(true)
    try {
      const savedPassword = stored<{ salt: string; hash: string } | null>('hazar-owner-password', null)
      if (savedPassword) {
        if (!currentPassword) return notify('أدخل كلمة المرور الحالية')
        const currentSalt = Uint8Array.from(atob(savedPassword.salt), char => char.charCodeAt(0))
        const currentHash = await derivePasswordHash(currentPassword, currentSalt)
        if (currentHash !== savedPassword.hash) return notify('كلمة المرور الحالية غير صحيحة')
      }
      const salt = crypto.getRandomValues(new Uint8Array(16))
      const hash = await derivePasswordHash(newPassword, salt)
      const encodedSalt = btoa(String.fromCharCode(...salt))
      localStorage.setItem('hazar-owner-password', JSON.stringify({ salt: encodedSalt, hash, updatedAt: new Date().toISOString() }))
      localStorage.setItem('hazar-password-updated-at', JSON.stringify('21 يوليو 2026'))
      setHasLocalPassword(true)
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setPasswordOpen(false)
      notify('تم تغيير كلمة مرور المالك وحفظها مشفرة على هذا الجهاز')
    } catch {
      notify('تعذر تحديث كلمة المرور على هذا الجهاز')
    } finally {
      setPasswordBusy(false)
    }
  }

  const sectionMeta: Record<SettingsSection, { title: string; text: string; icon: ReactNode }> = {
    general: { title: 'الإعدادات العامة', text: 'هوية المنصة وبيانات المالك الرئيسية.', icon: <Settings /> },
    pricing: { title: 'الأسعار والدفع', text: 'رسوم النشر ووسائل الدفع وسياسة التحقق.', icon: <CircleDollarSign /> },
    notifications: { title: 'الإشعارات', text: 'حدد الأحداث التي تصل إلى بريد المالك.', icon: <Bell /> },
    security: { title: 'الأمان والصلاحيات', text: 'حماية حساب المالك الوحيد وإدارة الجلسات.', icon: <ShieldCheck /> },
  }

  return (
    <>
      <PageTitle eyebrow="تخصيص المنصة" title="إعدادات المالك" text="كل إعدادات المشروع تحت تحكم حسابك الوحيد." action={<button className="secondary-button" onClick={onBack}><ArrowRight /> الرجوع لمركز التحكم</button>} />
      <div className="settings-layout">
        <div className="settings-nav">
          <button className={section === 'general' ? 'active' : ''} onClick={() => setSection('general')}><Settings /> الإعدادات العامة</button>
          <button className={section === 'pricing' ? 'active' : ''} onClick={() => setSection('pricing')}><CircleDollarSign /> الأسعار والدفع</button>
          <button className={section === 'notifications' ? 'active' : ''} onClick={() => setSection('notifications')}><Bell /> الإشعارات</button>
          <button className={section === 'security' ? 'active' : ''} onClick={() => setSection('security')}><ShieldCheck /> الأمان والصلاحيات</button>
        </div>
        <form className="settings-form" onSubmit={saveSettings}>
          <div className="form-section-head"><div>{sectionMeta[section].icon}<div><h2>{sectionMeta[section].title}</h2><p>{sectionMeta[section].text}</p></div></div><span className="saved-indicator"><CheckCircle2 /> حفظ تلقائي محلي</span></div>

          {section === 'general' && <>
            <div className="owner-identity-box"><ShieldCheck /><div><strong>حساب المالك الرئيسي الوحيد</strong><span>هذا الحساب هو صاحب الصلاحية العليا ولا يوجد مالك آخر.</span></div><span className="status-pill accepted">نشط</span></div>
            <div className="form-grid">
              <label><span>اسم المالك الوحيد</span><input value={ownerName} onChange={event => setOwnerName(event.target.value)} placeholder="اكتب اسمك هنا" /></label>
              <label><span>البريد الإداري للمالك</span><div className="verified-input"><input value={ownerEmail} onChange={event => updateEmail(event.target.value)} dir="ltr" /><span className={ownerEmailVerified ? 'verified' : 'pending'}>{ownerEmailVerified ? <><CheckCircle2 /> معتمد</> : <><Clock3 /> غير معتمد</>}</span></div></label>
              <label><span>اسم المنصة بالعربية</span><input value={platformNameAr} onChange={event => setPlatformNameAr(event.target.value)} /></label>
              <label><span>اسم المنصة بالإنجليزية</span><input value={platformNameEn} onChange={event => setPlatformNameEn(event.target.value)} dir="ltr" /></label>
              <label className="wide"><span>وصف المنصة</span><textarea rows={3} defaultValue="منصة التوظيف الذكية للسوق اليمني" /></label>
              <label><span>رقم الهاتف الشخصي للمالك</span><input defaultValue={ownerPhone} dir="ltr" /></label>
            </div>
            {!ownerEmailVerified && <div className="email-verification"><Bell /><div><strong>اعتماد بريد المالك</strong><span>سيُستخدم هذا البريد لاستقبال إشعارات المدفوعات والأمان.</span></div><button type="button" className="primary-button" onClick={verifyEmail}>اعتماد البريد</button></div>}
            <div className="setting-row"><div><strong>لغة التطبيق</strong><span>يمكن التبديل بين العربية والإنجليزية في جميع النسخ.</span></div><div className="settings-language"><button type="button" className={language === 'ar' ? 'active' : ''} onClick={() => setLanguage('ar')}>العربية</button><button type="button" className={language === 'en' ? 'active' : ''} onClick={() => setLanguage('en')}>English</button></div></div>
            <div className="setting-row"><div><strong>الوضع الداكن الافتراضي</strong><span>يظهر لجميع الزوار الجدد ويمكنهم تغييره لاحقاً</span></div><label className="switch"><input type="checkbox" checked={dark} onChange={() => setDark(!dark)} /><span /></label></div>
          </>}

          {section === 'pricing' && <>
            <div className="form-grid">
              <label><span>سعر نشر وظيفة عادية</span><div className="input-suffix"><input value={jobPrice} onChange={event => setJobPrice(event.target.value)} inputMode="numeric" /><span>{currency}</span></div></label>
              <label><span>سعر الوظيفة المميزة</span><div className="input-suffix"><input value={featuredPrice} onChange={event => setFeaturedPrice(event.target.value)} inputMode="numeric" /><span>{currency}</span></div></label>
              <label><span>العملة الافتراضية</span><select value={currency} onChange={event => setCurrency(event.target.value)}><option>ريال يمني</option><option>دولار أمريكي</option><option>ريال سعودي</option></select></label>
              <label><span>وسيلة استقبال المدفوعات</span><input value={paymentMethod} onChange={event => setPaymentMethod(event.target.value)} /></label>
              <label><span>اسم مستلم الدفعة</span><input value={paymentRecipientName} onChange={event => setPaymentRecipientName(event.target.value)} /></label>
              <label><span>رقم حساب محفظة جيب</span><input value={paymentAccountNumber} onChange={event => setPaymentAccountNumber(event.target.value)} dir="ltr" inputMode="numeric" /></label>
            </div>
            <div className="setting-row"><div><strong>التحقق اليدوي من المدفوعات</strong><span>لا تُنشر الوظيفة حتى تراجع رقم الحوالة وصورة الإيصال</span></div><label className="switch"><input type="checkbox" checked={manualPayment} onChange={() => setManualPayment(!manualPayment)} /><span /></label></div>
            <div className="verification-note"><ShieldCheck /><div><strong>طريقة تأكيد الدفع المعتمدة</strong><span>بعد إتمام التحويل، يدخل صاحب العمل رقم الحوالة الموجود في الإيصال ليتم تفعيل الإعلان وإرساله للمراجعة الفورية.</span></div></div>
            <div className="price-preview"><div><span>معاينة السعر العادي</span><strong>{Number(jobPrice || 0).toLocaleString('ar-YE')} {currency}</strong></div><div><span>معاينة السعر المميز</span><strong>{Number(featuredPrice || 0).toLocaleString('ar-YE')} {currency}</strong></div></div>
          </>}

          {section === 'notifications' && <>
            <div className="notification-destination"><Bell /><div><strong>وجهة الإشعارات</strong><span dir="ltr">{ownerEmail}</span></div><span className={`status-pill ${ownerEmailVerified ? 'accepted' : 'review'}`}>{ownerEmailVerified ? 'بريد معتمد' : 'بانتظار الاعتماد'}</span></div>
            <div className="setting-row"><div><strong>إشعارات البريد الإلكتروني</strong><span>إرسال ملخصات وقرارات المنصة إلى بريد المالك</span></div><label className="switch"><input type="checkbox" checked={emailAlerts} onChange={() => setEmailAlerts(!emailAlerts)} /><span /></label></div>
            <div className="setting-row"><div><strong>دفعات وإيصالات جديدة</strong><span>تنبيه فوري عند رفع صاحب عمل لإثبات دفع</span></div><label className="switch"><input type="checkbox" checked={paymentAlerts} onChange={() => setPaymentAlerts(!paymentAlerts)} /><span /></label></div>
            <div className="setting-row"><div><strong>وظائف بانتظار الموافقة</strong><span>تنبيه عند إرسال إعلان وظيفة جديد للمراجعة</span></div><label className="switch"><input type="checkbox" checked={jobAlerts} onChange={() => setJobAlerts(!jobAlerts)} /><span /></label></div>
            <div className="setting-row"><div><strong>تنبيهات تسجيل الدخول والأمان</strong><span>إشعار عند تسجيل دخول جديد أو تغيير إعداد حساس</span></div><label className="switch"><input type="checkbox" checked={securityAlerts} onChange={() => setSecurityAlerts(!securityAlerts)} /><span /></label></div>
            <button type="button" className="secondary-button test-notification" onClick={() => notify(`تم إرسال إشعار تجريبي إلى ${ownerEmail}`)} disabled={!ownerEmailVerified}><Bell /> إرسال إشعار تجريبي</button>
          </>}

          {section === 'security' && <>
            <div className="security-owner-card"><div className="avatar large">{ownerName.slice(0, 2)}</div><div><span>مالك المشروع الوحيد</span><strong>{ownerName}</strong><small dir="ltr">{ownerEmail}</small></div><div className="owner-lock"><ShieldCheck /> صلاحية عليا محمية</div></div>
            <div className="setting-row"><div><strong>المصادقة الثنائية</strong><span>طلب رمز أمان إضافي عند دخول حساب المالك</span></div><label className="switch"><input type="checkbox" checked={twoFactor} onChange={() => setTwoFactor(!twoFactor)} /><span /></label></div>
            <div className="setting-row"><div><strong>مدة جلسة المالك</strong><span>تسجيل الخروج تلقائياً عند عدم النشاط</span></div><select className="inline-select" value={sessionTimeout} onChange={event => setSessionTimeout(event.target.value)}><option>15 دقيقة</option><option>30 دقيقة</option><option>ساعة واحدة</option><option>4 ساعات</option></select></div>
            <div className="setting-row"><div><strong>البريد الأمني المعتمد</strong><span dir="ltr">{ownerEmail}</span></div><span className={`status-pill ${ownerEmailVerified ? 'accepted' : 'review'}`}>{ownerEmailVerified ? <><Check /> معتمد</> : 'غير معتمد'}</span></div>
            <div className="form-grid security-token-field"><label className="wide"><span>مفتاح مزامنة المالك</span><input type="password" value={ownerApiToken} onChange={event => setOwnerApiToken(event.target.value)} placeholder="يُضاف بعد إنشاء الخادم المركزي" autoComplete="off" /><small>يُحفظ على جهاز المالك فقط، ويتيح تعديل البيانات المركزية التي تصل إلى الموقع والتطبيقات.</small></label></div>
            <div className="security-actions"><button type="button" className="secondary-button" onClick={() => setPasswordOpen(!passwordOpen)}><ShieldCheck /> {hasLocalPassword ? 'تغيير كلمة المرور' : 'إنشاء كلمة مرور'}</button><button type="button" className="reject-action" onClick={() => notify('تم تسجيل الخروج من جميع الأجهزة الأخرى')}><XCircle /> إنهاء الجلسات الأخرى</button></div>
            <AnimatePresence>{passwordOpen && <motion.div className="password-panel" initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}>
              <div className="form-section-head"><div><ShieldCheck /><div><h2>{hasLocalPassword ? 'تغيير كلمة المرور' : 'إنشاء كلمة مرور المالك'}</h2><p>تُحفظ بصيغة مشفرة على هذا الجهاز ولا تُرسل إلى أي مستخدم.</p></div></div></div>
              <div className="form-grid">
                {hasLocalPassword && <label className="wide"><span>كلمة المرور الحالية</span><input type="password" autoComplete="current-password" value={currentPassword} onChange={event => setCurrentPassword(event.target.value)} /></label>}
                <label><span>كلمة المرور الجديدة</span><input type="password" autoComplete="new-password" value={newPassword} onChange={event => setNewPassword(event.target.value)} /></label>
                <label><span>تأكيد كلمة المرور</span><input type="password" autoComplete="new-password" value={confirmPassword} onChange={event => setConfirmPassword(event.target.value)} /></label>
              </div>
              <div className="password-actions"><span>8 أحرف على الأقل. لا يتم حفظ النص الأصلي لكلمة المرور.</span><button type="button" className="primary-button" disabled={passwordBusy} onClick={() => void changePassword()}>{passwordBusy ? <span className="loader" /> : <Check />} حفظ كلمة المرور</button></div>
            </motion.div>}</AnimatePresence>
          </>}

          <div className="form-footer"><span>آخر تعديل: 21 يوليو 2026</span><button className="primary-button" type="submit"><Check /> حفظ التغييرات</button></div>
        </form>
      </div>
    </>
  )
}

export default App
