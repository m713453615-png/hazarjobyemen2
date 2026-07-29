export type Role = 'seeker' | 'employer' | 'owner'
export type View =
  | 'discover'
  | 'applications'
  | 'saved'
  | 'alerts'
  | 'dashboard'
  | 'post'
  | 'applicants'
  | 'verification'
  | 'admin'
  | 'moderation'
  | 'licenses'
  | 'feedback'
  | 'features'
  | 'privacy'
  | 'archive'
  | 'users'
  | 'settings'
export type AppStatus = 'review' | 'accepted' | 'rejected'

export interface Job {
  id: number
  title: string
  company: string
  city: string
  type: string
  category: string
  salary: string
  posted: string
  deadline: string
  match: number
  verified: boolean
  featured?: boolean
  description: string
  requirements: string[]
  skills: string[]
  initials: string
  logoColor: string
  applicants: number
  views: number
}

export interface Applicant {
  id: number
  jobId: number
  name: string
  title: string
  city: string
  match: number
  status: AppStatus
  appliedAt: string
  skills: string[]
  experience: string
  education: string
  courses: string[]
  languages: string[]
}

export const jobs: Job[] = [
  {
    id: 1,
    title: 'مهندس برمجيات أول',
    company: 'يمن تك للحلول',
    city: 'صنعاء',
    type: 'دوام كامل',
    category: 'تقنية المعلومات',
    salary: '1,200 – 1,600 $',
    posted: 'منذ ساعتين',
    deadline: '30 يوليو 2026',
    match: 94,
    verified: true,
    featured: true,
    description: 'نبحث عن مهندس برمجيات متمرس للانضمام إلى فريق المنتجات وبناء حلول رقمية موثوقة تخدم آلاف المستخدمين في اليمن والمنطقة.',
    requirements: ['خبرة 4 سنوات أو أكثر في تطوير تطبيقات الويب', 'إتقان React وTypeScript وواجهات REST', 'قدرة ممتازة على العمل ضمن فريق متعدد التخصصات'],
    skills: ['React', 'TypeScript', 'Node.js', 'PostgreSQL'],
    initials: 'YT',
    logoColor: '#1378e5',
    applicants: 24,
    views: 342,
  },
  {
    id: 2,
    title: 'مسؤول تسويق رقمي',
    company: 'سبأفون',
    city: 'صنعاء',
    type: 'دوام كامل',
    category: 'التسويق',
    salary: '650 – 900 $',
    posted: 'منذ 5 ساعات',
    deadline: '28 يوليو 2026',
    match: 87,
    verified: true,
    description: 'إدارة الحملات الرقمية وتطوير حضور العلامة التجارية وقياس الأداء عبر المنصات الاجتماعية ومحركات البحث.',
    requirements: ['خبرة عملية في إدارة الحملات المدفوعة', 'معرفة بأدوات التحليل والتقارير', 'مهارات قوية في الكتابة بالعربية'],
    skills: ['Meta Ads', 'Analytics', 'SEO', 'Content'],
    initials: 'SF',
    logoColor: '#e44b3b',
    applicants: 38,
    views: 511,
  },
  {
    id: 3,
    title: 'مصمم تجربة وواجهة مستخدم',
    company: 'وينك',
    city: 'عدن',
    type: 'عن بعد',
    category: 'التصميم',
    salary: '800 – 1,100 $',
    posted: 'منذ يوم',
    deadline: '4 أغسطس 2026',
    match: 82,
    verified: true,
    featured: true,
    description: 'تصميم تجارب رقمية واضحة وجذابة لتطبيقات الجوال والويب، من البحث الأولي وحتى تسليم نظام التصميم.',
    requirements: ['ملف أعمال قوي في تصميم المنتجات الرقمية', 'خبرة في Figma وبناء أنظمة التصميم', 'فهم عميق للتصميم المتجاوب وإتاحة الاستخدام'],
    skills: ['Figma', 'UX Research', 'Prototyping', 'Design System'],
    initials: 'WY',
    logoColor: '#12a27c',
    applicants: 16,
    views: 287,
  },
]

export const initialApplicants: Applicant[] = [
  {
    id: 101, jobId: 1, name: 'سارة محمد القباطي', title: 'مطورة واجهات أمامية',
    city: 'صنعاء', match: 96, status: 'review', appliedAt: 'اليوم، 10:24 ص',
    skills: ['React', 'TypeScript', 'Node.js'],
    experience: '5 سنوات في تطوير تطبيقات SaaS والمنتجات المالية',
    education: 'بكالوريوس علوم حاسوب – جامعة صنعاء',
    courses: ['تطوير تطبيقات React المتقدمة', 'أساسيات الأمن السيبراني'],
    languages: ['العربية – اللغة الأم', 'الإنجليزية – جيد جداً'],
  },
  {
    id: 102, jobId: 1, name: 'عمار علي الصبري', title: 'مهندس برمجيات',
    city: 'تعز', match: 91, status: 'review', appliedAt: 'أمس، 4:12 م',
    skills: ['React', 'PostgreSQL', 'Docker'],
    experience: '4 سنوات في تطبيقات التجارة الإلكترونية',
    education: 'بكالوريوس تقنية معلومات – جامعة تعز',
    courses: ['Docker وDevOps', 'إدارة قواعد البيانات'],
    languages: ['العربية – اللغة الأم', 'الإنجليزية – جيد'],
  },
  {
    id: 103, jobId: 1, name: 'مروان خالد', title: 'مطور Full Stack',
    city: 'عدن', match: 84, status: 'accepted', appliedAt: '14 يوليو 2026',
    skills: ['JavaScript', 'Node.js', 'AWS'],
    experience: '3 سنوات في تطوير الويب',
    education: 'بكالوريوس هندسة برمجيات – جامعة عدن',
    courses: ['AWS Cloud Practitioner', 'Node.js المتقدم'],
    languages: ['العربية – اللغة الأم', 'الإنجليزية – جيد جداً'],
  },
]
