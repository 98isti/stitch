/**
 * buildReceipt — plain text ESC/POS for Star mC-Print3
 * 42 chars wide. Reliable plain text, no complex binary sequences.
 * ESC/POS bold/alignment added conservatively — only tested commands.
 */

const ESC = '\x1b'
const LF  = '\x0a'

const BOLD_ON  = ESC + '\x45\x01'
const BOLD_OFF = ESC + '\x45\x00'
const CUT      = ESC + '\x64\x05'  // feed 5 lines + cut (Star compatible)

const WIDTH = 42

function row(left: string, right: string): string {
  const space = WIDTH - left.length - right.length
  if (space <= 0) return left.slice(0, WIDTH - right.length - 1) + ' ' + right
  return left + ' '.repeat(space) + right
}

function divider(): string { return '-'.repeat(WIDTH) }

function center(text: string): string {
  const t = text.slice(0, WIDTH)
  return ' '.repeat(Math.max(0, Math.floor((WIDTH - t.length) / 2))) + t
}

function fmt(n: number): string { return `$${n.toFixed(2)}` }

export interface ReceiptItem {
  category: string
  name: string
  qty: number
  unitPrice: number
  note?: string
}

export interface ReceiptData {
  logoUrl?: string
  businessName: string
  locationName: string
  locationAddress?: string
  locationPhone?: string
  abn?: string
  orderNumber: string
  orderDate: string
  orderTime: string
  servedBy?: string
  customerName: string
  customerPhone?: string
  pickupDay: string
  pickupDateFull: string
  pickupTime?: string
  items: ReceiptItem[]
  subtotal: number
  discount?: number
  voucherCode?: string
  voucherDeduction?: number
  total: number
  paidAmount: number
  stillDue: number
  paymentMethod: string
  barcode?: string
  orderNote?: string
  isRedo?: boolean
  redoReason?: string
  originalPickupDate?: string
  refundAmount?: number
  refundReason?: string
}

export function buildReceipt(d: ReceiptData): string {
  const L: string[] = []
  const p = (...s: string[]) => L.push(...s)

  // Header
  p(center(`${d.businessName} - ${d.locationName}`) + LF)
  if (d.locationAddress) p(center(d.locationAddress) + LF)
  if (d.locationPhone)   p(center(`Phone: ${d.locationPhone}`) + LF)
  if (d.abn)             p(center(`ABN: ${d.abn}`) + LF)
  p(divider() + LF)

  // Date / staff
  p(`Ordered: ${d.orderDate}` + LF)
  p(`${d.orderTime}` + LF)
  p(`Served by: ${d.servedBy}` + LF)
  p(divider() + LF)

  // Order number
  p(BOLD_ON + `Order # ${d.orderNumber}` + BOLD_OFF + LF)
  p(d.customerName + LF)
  if (d.customerPhone) p(d.customerPhone + LF)
  p(divider() + LF)

  // Pickup
  p(BOLD_ON + `Pick up: ${d.pickupDay}` + BOLD_OFF + LF)
  p(BOLD_ON + d.pickupDateFull + BOLD_OFF + LF)
  p(`Pick up time: ${d.pickupTime ?? 'after 4PM'}` + LF)
  p(divider() + LF)

  // Items
  const groups: Record<string, ReceiptItem[]> = {}
  for (const item of d.items) {
    const cat = item.category || 'Other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(item)
  }
  for (const [cat, items] of Object.entries(groups)) {
    p(BOLD_ON + cat.toUpperCase() + BOLD_OFF + LF)
    for (const item of items) {
      const price = fmt(item.unitPrice * item.qty)
      const label = `  ${item.name}${item.qty > 1 ? ` x${item.qty}` : ''}`
      p(row(label, price) + LF)
      if (item.note) p(`  (${item.note})`.slice(0, WIDTH) + LF)
    }
  }

  // Order note
  if (d.orderNote) {
    p(divider() + LF)
    p(`Note: ${d.orderNote}`.slice(0, WIDTH) + LF)
  }
  p(divider() + LF)

  // Totals
  p(row('Subtotal', fmt(d.subtotal)) + LF)
  if (d.discount && d.discount > 0) {
    p(row('Discount', `-${fmt(d.discount)}`) + LF)
  }
  p(BOLD_ON + row('Total (incl 10% GST)', fmt(d.total)) + BOLD_OFF + LF)
  if (d.stillDue > 0) {
    p(row('Paid', fmt(d.paidAmount)) + LF)
    p(row('Still Due', fmt(d.stillDue)) + LF)
  }
  p(divider() + LF)

  // Item count
  const itemCount = d.items.reduce((s, i) => s + i.qty, 0)
  p(`[${itemCount}] item${itemCount !== 1 ? 's' : ''}` + LF)
  p(divider() + LF)

  // Payment status
  if (d.stillDue > 0) {
    p(center('PARTIAL PAYMENT') + LF)
    p(center(`Due: ${fmt(d.stillDue)}`) + LF)
  } else if (!d.paidAmount || d.paidAmount === 0) {
    p(center('*** NOT PAID ***') + LF)
  } else {
    p(center('*** PAID ***') + LF)
  }

  p(center(`Payment method: ${d.paymentMethod}`) + LF)
  p(divider() + LF)
  p(center('Thank you!') + LF)

  // Barcode as text (no binary QR command)
  if (d.barcode) {
    p(LF + center(d.barcode.slice(0, 32)) + LF)
  }

  // Feed and cut
  p(LF + LF + LF)
  p(CUT)

  return L.join('')
}
