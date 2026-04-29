export type StoreStatus = '建置中' | '試營運' | '營運中' | '暫停' | '歇業'

export interface Store {
  id: string
  name: string
  address: string | null
  status: StoreStatus
  start_date: string | null
  open_date: string | null
  rent: number | null
  area: number | null
  notes: string | null
  created_at: string
}

export interface Shareholder {
  id: string
  store_id: string
  name: string
  contribution: number
  equity_percent: number
  notes: string | null
}

export interface Expense {
  id: string
  store_id: string
  date: string
  item: string
  vendor: string | null
  buyer: string | null
  quantity: number
  amount: number
  payment_stage: string | null
  payment_method: string | null
  payment_status: '未結清' | '已結清'
  reimbursed: boolean
  invoice_type: '估價單' | '收據' | '發票' | '其他' | null
  receipt_path: string | null
  receipt_name: string | null
  notes: string | null
}

export interface Equipment {
  id: string
  store_id: string
  category: string | null
  name: string
  brand: string | null
  model: string | null
  size: string | null
  power: string | null
  condition: '全新' | '二手'
  quantity: number
  price: number | null
  warranty_expire: string | null
  arrival_date: string | null
  notes: string | null
}

export interface Todo {
  id: string
  store_id: string
  title: string
  description: string | null
  due_date: string | null
  priority: '高' | '中' | '低'
  status: '待辦' | '進行中' | '完成'
  category: '工程' | '行政' | '設備' | '其他'
}

export interface SOPDocument {
  id: string
  title: string
  description: string | null
  category: string | null
  order_index: number
  created_at: string
}

export interface SOPStep {
  id: string
  document_id: string
  order_index: number
  title: string
  content: string | null
  estimated_days: number | null
  responsible: string | null
  notes: string | null
}

export interface Vendor {
  id: string
  store_id: string
  name: string
  category: string | null
  contact_name: string | null
  phone: string | null
  payment_method: string | null
  notes: string | null
  created_at: string
}

export interface BudgetItem {
  id: string
  store_id: string
  category: string
  name: string
  estimated_amount: number
  notes: string | null
  order_index: number
}

export interface ConstructionLog {
  id: string
  store_id: string
  date: string
  team: string | null
  description: string
  status: string | null
  completion_pct: number | null
  notes: string | null
  created_at: string
}

export interface DesignFile {
  id: string
  store_id: string
  category: string
  name: string
  file_path: string | null
  file_name: string | null
  notes: string | null
  created_at: string
}

export interface Permit {
  id: string
  store_id: string
  name: string
  status: '未申請' | '申請中' | '已取得' | '不需要'
  applied_date: string | null
  expected_date: string | null
  completed_date: string | null
  notes: string | null
  order_index: number
}

export interface ProfitEstimate {
  id: string
  store_id: string
  monthly_revenue: number | null
  monthly_food_cost: number | null
  monthly_rent: number | null
  monthly_salary: number | null
  monthly_utilities: number | null
  monthly_other: number | null
}

export interface OpeningChecklistItem {
  id: string
  store_id: string
  category: string
  item: string
  completed: boolean
  notes: string | null
  order_index: number
}

export interface ScheduleItem {
  id: string
  store_id: string
  team: string
  task: string
  start_date: string | null
  end_date: string | null
  status: '待開始' | '進行中' | '完成' | '延誤'
  notes: string | null
  order_index: number
}
