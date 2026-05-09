// ── Stores ───────────────────────────────────────────────────
export type StoreStatus = 'building' | 'open' | 'paused' | 'closed'

export const STORE_STATUS_LABEL: Record<StoreStatus, string> = {
  building: '建置中',
  open: '營運中',
  paused: '暫停',
  closed: '歇業',
}

export interface Store {
  id: string
  name: string
  address: string | null
  phone: string | null
  tax_id: string | null
  status: StoreStatus
  sqft: number | null
  monthly_rent: number | null
  deposit: number | null
  open_date: string | null
  business_hours: string | null
  seats: number | null
  wifi_ssid: string | null
  wifi_password: string | null
  cctv_account: string | null
  cctv_password: string | null
  cctv_brand: string | null
  pos_account: string | null
  pos_password: string | null
  pos_model: string | null
  owner_name: string | null
  owner_phone: string | null
  owner_id_number: string | null
  manager_name: string | null
  manager_phone: string | null
  assistant_manager_name: string | null
  assistant_manager_phone: string | null
  landlord_name: string | null
  landlord_phone: string | null
  electric_vendor: string | null
  electric_phone: string | null
  gas_vendor: string | null
  gas_phone: string | null
  emergency_name: string | null
  emergency_phone: string | null
  bank_account: string | null
  invoice_machine: string | null
  lease_end_date: string | null
  total_budget: number | null
  price_per_sqft: number | null
  total_valuation: number | null
  notes: string | null
  created_at: string
  updated_at: string
}

// ── Build Schedules ──────────────────────────────────────────
export type ScheduleStatus = 'done' | 'ongoing' | 'pending' | 'overdue'

export const SCHEDULE_STATUS_LABEL: Record<ScheduleStatus, string> = {
  done: '完成',
  ongoing: '進行中',
  pending: '待開始',
  overdue: '已逾期',
}

export interface BuildSchedule {
  id: string
  store_id: string
  task_name: string
  vendor: string | null
  start_date: string | null
  end_date: string | null
  status: ScheduleStatus
  depends_on: string | null
  note: string | null
  created_at: string
  updated_at: string
}

// ── Construction Logs ────────────────────────────────────────
export type LogStatus = 'normal' | 'issue' | 'nowork'

export const LOG_STATUS_LABEL: Record<LogStatus, string> = {
  normal: '正常施工',
  issue: '有異常',
  nowork: '未施工',
}

export interface ConstructionLog {
  id: string
  store_id: string
  date: string
  weather: string | null
  task_name: string | null
  vendor: string | null
  workers: number | null
  status: LogStatus
  progress: string | null
  issue: string | null
  action: string | null
  photos: string[]
  note: string | null
  created_at: string
  updated_at: string
}

// ── Expenses ─────────────────────────────────────────────────
export type PayStatus = 'paid' | 'partial' | 'pending'

export const PAY_STATUS_LABEL: Record<PayStatus, string> = {
  paid: '已付清',
  partial: '部分付款',
  pending: '未付款',
}

export const EXPENSE_CATEGORIES = ['租約', '工程', '設備', '行政', '水電', '貨商', '文具雜支', '其他'] as const
export type ExpenseCategory = typeof EXPENSE_CATEGORIES[number]

export interface Expense {
  id: string
  store_id: string
  date: string
  category: string | null
  name: string
  vendor: string | null
  total: number
  pay_method: string | null
  pay_status: PayStatus
  pay_date: string | null
  deposit_amount: number | null
  deposit_date: string | null
  balance_amount: number | null
  balance_date: string | null
  invoice_no: string | null
  invoice_amount: number | null
  photos: string[]
  note: string | null
  created_at: string
  updated_at: string
}

// ── Todos ─────────────────────────────────────────────────────
export type TodoPriority = 'high' | 'mid' | 'low'

export const TODO_PRIORITY_LABEL: Record<TodoPriority, string> = {
  high: '高',
  mid: '中',
  low: '低',
}

export const TODO_CATEGORIES = ['工程', '行政', '採購', '其他'] as const

export interface Todo {
  id: string
  store_id: string
  title: string
  category: string | null
  priority: TodoPriority
  due_date: string | null
  done: boolean
  note: string | null
  created_at: string
  updated_at: string
}

// ── Budget Settings ───────────────────────────────────────────
export interface BudgetSettings {
  id: string
  store_id: string
  sqft: number | null
  price_per_sqft: number
  total_budget: number | null
  total_valuation: number | null
  investor_percentage: number
  management_staff_count: number
  round2_count: number
  round3_count: number
  round4_count: number
  created_at: string
  updated_at: string
}

// ── Investors ─────────────────────────────────────────────────
export type InvestorPayStatus = 'paid' | 'pending' | 'overdue'

export const INVESTOR_PAY_STATUS_LABEL: Record<InvestorPayStatus, string> = {
  paid: '已到位',
  pending: '待付款',
  overdue: '逾期未付',
}

export interface Investor {
  id: string
  store_id: string
  name: string
  round: number
  percentage: number | null
  amount: number | null
  phone: string | null
  email: string | null
  id_number: string | null
  address: string | null
  pay_status: InvestorPayStatus
  contract_sent: boolean
  contract_signed: boolean
  sign_date: string | null
  pay_deadline: string | null
  contract_url: string | null
  note: string | null
  created_at: string
  updated_at: string
}

// ── Vendors ───────────────────────────────────────────────────
export const VENDOR_CATEGORIES = ['工程', '設備', '食材供應', '行政法規', '設計廣告', '維修保養', '其他'] as const

export interface Vendor {
  id: string
  store_id: string | null
  name: string
  category: string | null
  service: string | null
  contact_name: string | null
  phone: string | null
  mobile: string | null
  email: string | null
  address: string | null
  tax_id: string | null
  line_id: string | null
  pay_method: string | null
  bank_name: string | null
  bank_account: string | null
  can_invoice: boolean
  invoice_note: string | null
  note: string | null
  created_at: string
  updated_at: string
}

// ── Equipment ─────────────────────────────────────────────────
export type EquipmentStatus = 'installed' | 'ordered' | 'pending'

export const EQUIPMENT_STATUS_LABEL: Record<EquipmentStatus, string> = {
  installed: '已安裝',
  ordered: '已訂購',
  pending: '待確認',
}

export const EQUIPMENT_CATEGORIES = ['廚房設備', '冷藏冷凍', '排煙空調', 'POS系統', '安全設備', '外場設備', '其他'] as const

export interface Equipment {
  id: string
  store_id: string
  name: string
  category: string | null
  spec: string | null
  voltage: string | null
  width: number | null
  depth: number | null
  height: number | null
  quantity: number
  unit_price: number | null
  vendor: string | null
  status: EquipmentStatus
  schedule_task: string | null
  note: string | null
  created_at: string
  updated_at: string
}

// ── Documents ─────────────────────────────────────────────────
export type DocType = 'lease' | 'consent' | 'permit' | 'other'
export type DocStatus = 'ok' | 'pending' | 'expiring' | 'expired' | 'none'

export const DOC_TYPE_LABEL: Record<DocType, string> = {
  lease: '租約',
  consent: '同意書',
  permit: '許可證',
  other: '其他',
}

export const DOC_STATUS_LABEL: Record<DocStatus, string> = {
  ok: '有效',
  pending: '待簽署',
  expiring: '即將到期',
  expired: '已到期',
  none: '未取得',
}

export interface Document {
  id: string
  store_id: string
  name: string
  doc_type: DocType
  status: DocStatus
  sign_date: string | null
  exp_date: string | null
  party: string | null
  note: string | null
  file_url: string | null
  created_at: string
  updated_at: string
}

// ── Design Files ──────────────────────────────────────────────
export type DesignCategory = 'logo' | 'signage' | 'menu' | 'floorplan' | 'other'

export const DESIGN_CATEGORY_LABEL: Record<DesignCategory, string> = {
  logo: 'Logo',
  signage: '招牌',
  menu: '菜單',
  floorplan: '平面圖',
  other: '其他',
}

export interface DesignFile {
  id: string
  store_id: string
  name: string
  category: DesignCategory
  version: string | null
  description: string | null
  file_url: string | null
  file_type: string | null
  created_at: string
  updated_at: string
}

// ── SOP Knowledge ─────────────────────────────────────────────
export type SopTrade = 'plumbing' | 'carpentry' | 'masonry' | 'equipment' | 'admin' | 'painting' | 'signage' | 'general'
export type SopType = 'spec' | 'flow' | 'pit' | 'vendor' | 'admin' | 'other'

export const SOP_TRADE_LABEL: Record<SopTrade, string> = {
  plumbing: '水電',
  carpentry: '木工',
  masonry: '泥作',
  equipment: '設備',
  admin: '行政',
  painting: '油漆',
  signage: '招牌廣告',
  general: '通用',
}

export const SOP_TYPE_LABEL: Record<SopType, string> = {
  spec: '規格標準',
  flow: '流程步驟',
  pit: '踩坑記錄',
  vendor: '廠商經驗',
  admin: '行政申請',
  other: '其他',
}

export interface SopKnowledge {
  id: string
  trade: SopTrade
  type: SopType
  title: string
  tags: string[]
  content: string
  created_at: string
  updated_at: string
}

// ── Gov Applications ──────────────────────────────────────────
export type GovStatus = 'done' | 'inprog' | 'waiting' | 'notyet'

export const GOV_STATUS_LABEL: Record<GovStatus, string> = {
  done: '已完成',
  inprog: '申請中',
  waiting: '等待回覆',
  notyet: '未開始',
}

export interface GovApplication {
  id: string
  store_id: string
  category: string | null
  name: string
  description: string | null
  tags: string[]
  status: GovStatus
  note: string | null
  created_at: string
  updated_at: string
}

// ── Opening Checklist ─────────────────────────────────────────
export interface OpeningChecklistItem {
  id: string
  store_id: string
  category: string | null
  name: string
  description: string | null
  tags: string[]
  is_required: boolean
  done: boolean
  note: string | null
  sort_order: number
  created_at: string
  updated_at: string
}

export const OPENING_CHECKLIST_CATEGORIES = [
  '證照與行政', '工程驗收', '設備與系統', '人員準備', '備品與食材', '行銷與品牌'
] as const
