/**
 * Central badge / status color maps.
 * Every class is an arbitrary-value Tailwind class so it works
 * without any additional config — just drop-in replacements for the
 * old blue-100/blue-700 Tailwind pairs.
 */

import type {
  StoreStatus,
  ScheduleStatus,
  LogStatus,
  PayStatus,
  EquipmentStatus,
  TodoPriority,
  InvestorPayStatus,
  DocType,
  DocStatus,
  DesignCategory,
  SopTrade,
  SopType,
  GovStatus,
} from '@/types'

// ── Store status ──────────────────────────────────────────────
export const STORE_STATUS_BADGE: Record<StoreStatus, string> = {
  building: 'bg-brand-blue-tint text-brand-blue',
  open:     'bg-brand-teal-tint text-brand-teal',
  paused:   'bg-brand-amber-tint text-brand-amber',
  closed:   'bg-gray-100 text-gray-400',
}

export const STORE_STATUS_DOT: Record<StoreStatus, string> = {
  building: 'bg-brand-blue',
  open:     'bg-brand-teal',
  paused:   'bg-brand-amber',
  closed:   'bg-gray-300',
}

// ── Schedule status ───────────────────────────────────────────
export const SCHEDULE_BADGE: Record<ScheduleStatus, string> = {
  done:    'bg-brand-teal-tint   text-brand-teal',
  ongoing: 'bg-brand-blue-tint   text-brand-blue',
  pending: 'bg-gray-100          text-gray-400',
  overdue: 'bg-brand-red-tint    text-brand-red',
}

// ── Construction log status ───────────────────────────────────
export const LOG_BADGE: Record<LogStatus, string> = {
  normal: 'bg-brand-teal-tint  text-brand-teal',
  issue:  'bg-brand-red-tint   text-brand-red',
  nowork: 'bg-gray-100         text-gray-400',
}

export const LOG_PROGRESS_BAR: Record<LogStatus, string> = {
  normal: 'bg-brand-teal',
  issue:  'bg-brand-red',
  nowork: 'bg-gray-300',
}

// ── Pay status ────────────────────────────────────────────────
export const PAY_BADGE: Record<PayStatus, string> = {
  paid:    'bg-brand-teal-tint  text-brand-teal',
  partial: 'bg-brand-amber-tint text-brand-amber',
  pending: 'bg-gray-100         text-gray-400',
}

// ── Equipment status ──────────────────────────────────────────
export const EQUIP_BADGE: Record<EquipmentStatus, string> = {
  installed: 'bg-brand-teal-tint  text-brand-teal',
  ordered:   'bg-brand-blue-tint  text-brand-blue',
  pending:   'bg-gray-100         text-gray-400',
}

// ── Todo priority ─────────────────────────────────────────────
export const TODO_PRIORITY_BADGE: Record<TodoPriority, string> = {
  high: 'bg-brand-red-tint   text-brand-red',
  mid:  'bg-brand-amber-tint text-brand-amber',
  low:  'bg-gray-100         text-gray-400',
}

export const TODO_PRIORITY_DOT: Record<TodoPriority, string> = {
  high: 'bg-brand-red',
  mid:  'bg-brand-amber',
  low:  'bg-gray-300',
}

// ── Investor pay status ───────────────────────────────────────
export const INVESTOR_PAY_BADGE: Record<InvestorPayStatus, string> = {
  paid:    'bg-brand-teal-tint text-brand-teal',
  pending: 'bg-gray-100        text-gray-400',
  overdue: 'bg-brand-red-tint  text-brand-red',
}

// ── Document type ─────────────────────────────────────────────
export const DOC_TYPE_BADGE: Record<DocType, string> = {
  lease:   'bg-brand-purple-tint text-brand-purple',
  consent: 'bg-brand-blue-tint   text-brand-blue',
  permit:  'bg-brand-teal-tint   text-brand-teal',
  other:   'bg-gray-100          text-gray-400',
}

// ── Document status ───────────────────────────────────────────
export const DOC_STATUS_BADGE: Record<DocStatus, string> = {
  ok:       'bg-brand-teal-tint  text-brand-teal',
  pending:  'bg-brand-blue-tint  text-brand-blue',
  expiring: 'bg-brand-amber-tint text-brand-amber',
  expired:  'bg-brand-red-tint   text-brand-red',
  none:     'bg-gray-100         text-gray-400',
}

// ── Design category ───────────────────────────────────────────
export const DESIGN_CAT_BADGE: Record<DesignCategory, string> = {
  logo:      'bg-brand-purple-tint text-brand-purple',
  signage:   'bg-brand-amber-tint  text-brand-amber',
  menu:      'bg-brand-teal-tint   text-brand-teal',
  floorplan: 'bg-brand-blue-tint   text-brand-blue',
  other:     'bg-gray-100          text-gray-400',
}

// ── SOP trade ─────────────────────────────────────────────────
export const SOP_TRADE_BADGE: Record<SopTrade, string> = {
  plumbing:  'bg-brand-blue-tint   text-brand-blue',
  carpentry: 'bg-brand-amber-tint  text-brand-amber',
  masonry:   'bg-gray-100          text-gray-400',
  equipment: 'bg-brand-purple-tint text-brand-purple',
  admin:     'bg-brand-teal-tint   text-brand-teal',
  painting:  'bg-brand-red-tint    text-brand-red',
  signage:   'bg-brand-amber-tint  text-brand-amber',
  general:   'bg-gray-100          text-gray-400',
}

// ── SOP type ──────────────────────────────────────────────────
export const SOP_TYPE_BADGE: Record<SopType, string> = {
  spec:   'bg-brand-purple-tint text-brand-purple',
  flow:   'bg-brand-teal-tint   text-brand-teal',
  pit:    'bg-brand-red-tint    text-brand-red',
  vendor: 'bg-brand-amber-tint  text-brand-amber',
  admin:  'bg-brand-teal-tint   text-brand-teal',
  other:  'bg-gray-100          text-gray-400',
}

// ── Gov application status ────────────────────────────────────
export const GOV_STATUS_BADGE: Record<GovStatus, string> = {
  done:    'bg-brand-teal-tint  text-brand-teal',
  inprog:  'bg-brand-blue-tint  text-brand-blue',
  waiting: 'bg-brand-amber-tint text-brand-amber',
  notyet:  'bg-gray-100         text-gray-400',
}

// ── Investor round accent (for the left stripe) ───────────────
export const ROUND_COLORS = [
  '#185FA5', '#1D9E75', '#EF9F27', '#534AB7',
  '#D94F4F', '#888780', '#C8C7BF', '#4A4840',
  '#636059', '#36342E',
]
