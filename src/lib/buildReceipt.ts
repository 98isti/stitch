/**
 * buildReceipt — raw ESC/POS commands for Star mC-Print3 (80mm thermal)
 * 42 characters wide at font A. Reliable, no HTML scaling issues.
 *
 * ESC/POS reference: https://reference.epson-biz.com/modules/ref_escpos/
 * Star mC-Print3 is ESC/POS compatible.
 */

// ── ESC/POS command constants ───────────────────────────────────────────────
const ESC = '\x1b'
const GS  = '\x1d'
const LF  = '\x0a'

const ALIGN_LEFT   = ESC + '\x61\x00'
const ALIGN_CENTER = ESC + '\x61\x01'
const ALIGN_RIGHT  = ESC + '\x61\x02'

const BOLD_ON  = ESC + '\x45\x01'
const BOLD_OFF = ESC + '\x45\x00'

const FONT_NORMAL       = ESC + '\x21\x00' // normal
const FONT_DBL_HEIGHT   = ESC + '\x21\x10' // 2× height
const FONT_DBL_WIDTH    = ESC + '\x21\x20' // 2× width
const FONT_DBL_BOTH     = ESC + '\x21\x30' // 2× width + 2× height

const INVERT_ON  = GS + '\x42\x01'  // white on black
const INVERT_OFF = GS + '\x42\x00'

const CUT_PARTIAL = GS + '\x56\x42\x00'

const WIDTH = 42

// ── Helpers ─────────────────────────────────────────────────────────────────
function pad(text: string, total = WIDTH): string {
  return text.slice(0, total).padEnd(total)
}

function row(left: string, right: string, width = WIDTH): string {
  const space = width - left.length - right.length
  if (space <= 0) return (left + ' ' + right).slice(0, width)
  return left + ' '.repeat(space) + right
}

function center(text: string, width = WIDTH): string {
  const trimmed = text.slice(0, width)
  const spaces = Math.max(0, Math.floor((width - trimmed.length) / 2))
  return ' '.repeat(spaces) + trimmed
}

function divider(char = '-', width = WIDTH): string {
  return char.repeat(width)
}

function wrap(text: string, width = WIDTH): string[] {
  const words = text.split(' ')
  const lines: string[] = []
  let line = ''
  for (const word of words) {
    if ((line + (line ? ' ' : '') + word).length > width) {
      if (line) lines.push(line)
      line = word.slice(0, width)
    } else {
      line = line ? line + ' ' + word : word
    }
  }
  if (line) lines.push(line)
  return lines
}

function fmt(n: number): string {
  return `$${n.toFixed(2)}`
}

// ── QR Code via ESC/POS GS commands ─────────────────────────────────────────
function qrCode(data: string): string {
  const len = data.length
  const pL = (len + 3) & 0xff
  const pH = ((len + 3) >> 8) & 0xff
  return (
    ALIGN_CENTER +
    GS + '(k\x04\x00\x31\x41\x32\x00' +        // Model 2
    GS + '(k\x03\x00\x31\x43\x05' +              // Cell size 5
    GS + '(k\x03\x00\x31\x45\x31' +              // Error correction L
    GS + `(k${String.fromCharCode(pL, pH)}\x00\x31\x50\x30${data}` + // Store data
    GS + '(k\x03\x00\x31\x51\x30' +              // Print QR
    ALIGN_LEFT
  )
}

// ── Receipt Data Interface ───────────────────────────────────────────────────
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
  servedBy: string
  customerName: string
  customerPhone?: string
  pickupDay: string
  pickupDateFull: string
  pickupTime?: string
  items: ReceiptItem[]
  subtotal: number
  discount?: number
  total: number
  paidAmount: number
  stillDue: number
  paymentMethod: string
  barcode?: string
  orderNote?: string
}

// ── Main Receipt Builder ─────────────────────────────────────────────────────
export function buildReceipt(d: ReceiptData): string {
  const lines: string[] = []

  const push = (...parts: string[]) => lines.push(...parts)

  // ── Header ────────────────────────────────────────────────────────────────
  push(ALIGN_CENTER, BOLD_ON, FONT_DBL_BOTH)
  push(d.businessName + LF)
  push(FONT_NORMAL, BOLD_OFF)

  push(BOLD_ON)
  push(`${d.businessName} – ${d.locationName}` + LF)
  push(BOLD_OFF, ALIGN_LEFT)

  if (d.locationAddress) push(d.locationAddress + LF)
  if (d.locationPhone)   push(`Phone: ${d.locationPhone}` + LF)
  if (d.abn)             push(`ABN: ${d.abn}` + LF)

  push(divider() + LF)

  // ── Date / Staff ──────────────────────────────────────────────────────────
  push(`Ordered: ${d.orderDate}` + LF)
  push(d.orderTime + LF)
  push(`Served by: ${d.servedBy}` + LF)

  push(divider() + LF)

  // ── Order # ───────────────────────────────────────────────────────────────
  push(FONT_DBL_BOTH)
  push(`Order # ${d.orderNumber}` + LF)
  push(FONT_NORMAL)

  push(d.customerName + LF)
  if (d.customerPhone) push(d.customerPhone + LF)

  push(divider() + LF)

  // ── Pickup ────────────────────────────────────────────────────────────────
  push(FONT_DBL_HEIGHT)
  push(`Pick up: ${d.pickupDay}` + LF)
  push(d.pickupDateFull + LF)
  push(`Pick up time: ${d.pickupTime ?? 'after 4PM'}` + LF)
  push(FONT_NORMAL)

  push(divider() + LF)

  // ── Items ─────────────────────────────────────────────────────────────────
  const groups: Record<string, ReceiptItem[]> = {}
  for (const item of d.items) {
    const cat = item.category || 'Other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(item)
  }

  for (const [cat, items] of Object.entries(groups)) {
    push(BOLD_ON + cat.toUpperCase() + BOLD_OFF + LF)
    for (const item of items) {
      const price = fmt(item.unitPrice * item.qty)
      const qtyStr = item.qty > 1 ? ` x${item.qty}` : ''
      const nameStr = `  ${item.name}${qtyStr}`
      push(row(nameStr, price) + LF)
      if (item.note) push(`  (${item.note})`.slice(0, WIDTH) + LF)
    }
  }

  if (d.orderNote) {
    push(divider() + LF)
    for (const line of wrap(`Note: ${d.orderNote}`)) {
      push(line + LF)
    }
  }

  push(divider() + LF)

  // ── Totals ────────────────────────────────────────────────────────────────
  push(row('Subtotal', fmt(d.subtotal)) + LF)
  if (d.discount && d.discount > 0) {
    push(row('Discount', `-${fmt(d.discount)}`) + LF)
  }
  push(BOLD_ON + row('Total (incl 10% GST)', fmt(d.total)) + BOLD_OFF + LF)
  if (d.stillDue > 0) {
    push(row('Paid', fmt(d.paidAmount)) + LF)
  }

  // ── Item count (inverted) ─────────────────────────────────────────────────
  const itemCount = d.items.reduce((s, i) => s + i.qty, 0)
  push(LF)
  push(INVERT_ON + BOLD_ON + ` ${itemCount} ` + BOLD_OFF + INVERT_OFF)
  push(` item${itemCount !== 1 ? 's' : ''}` + LF)

  push(divider() + LF)

  // ── Payment status ────────────────────────────────────────────────────────
  push(ALIGN_CENTER)
  if (d.stillDue > 0) {
    push(FONT_DBL_HEIGHT + BOLD_ON + 'PARTIAL PAYMENT' + BOLD_OFF + FONT_NORMAL + LF)
    push(`Due: ${fmt(d.stillDue)}` + LF)
  } else if (!d.paidAmount || d.paidAmount === 0) {
    push(FONT_DBL_BOTH + BOLD_ON + 'NOT PAID' + BOLD_OFF + FONT_NORMAL + LF)
  } else {
    push(FONT_DBL_BOTH + BOLD_ON + 'PAID' + BOLD_OFF + FONT_NORMAL + LF)
  }
  push(ALIGN_LEFT)

  push(center(`Payment method: ${d.paymentMethod}`) + LF)

  push(divider() + LF)

  push(ALIGN_CENTER + 'Thank you!' + ALIGN_LEFT + LF)

  // ── QR Code ───────────────────────────────────────────────────────────────
  if (d.barcode) {
    push(qrCode(d.barcode))
    push(LF)
  }

  // ── Feed + Cut ────────────────────────────────────────────────────────────
  push(LF + LF + LF)
  push(CUT_PARTIAL)

  return lines.join('')
}
