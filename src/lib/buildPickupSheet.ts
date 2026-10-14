/**
 * buildPickupSheet — daily pickup sheet for Star mC-Print3 thermal printer
 * Prints all "In progress" orders for a selected date at the active location.
 * 42 chars wide, ESC/POS plain text — same format as buildReceipt.ts
 */

const ESC = '\x1b'
const LF  = '\x0a'

const BOLD_ON  = ESC + '\x45\x01'
const BOLD_OFF = ESC + '\x45\x00'
const INVERT_ON  = ESC + '\x42\x01'   // white-on-black (status highlight)
const INVERT_OFF = ESC + '\x42\x00'
const CUT = ESC + '\x64\x05'          // feed 5 lines + full cut

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

// Strip trailing category numbers e.g. "Trouser 1" → "TROUSER"
function baseCategory(cat: string): string {
  return cat.replace(/\s+\d+$/, '').trim().toUpperCase()
}

export interface PickupSheetItem {
  category: string
  name: string
  quantity: number
  unitPrice: number
  note?: string
}

export interface PickupSheetOrder {
  orderNumberString: string
  customerName: string
  customerPhone: string
  orderAmount: number
  items: PickupSheetItem[]
  status: string
  orderNote?: string
}

export interface PickupSheetData {
  businessName: string
  locationName: string
  date: string        // formatted e.g. "14 Oct 2026"
  orders: PickupSheetOrder[]
  footer?: string
}

export function buildPickupSheet(d: PickupSheetData): string {
  const L: string[] = []
  const p = (...s: string[]) => L.push(...s)

  // ── Header ──────────────────────────────────────────────────────────────
  p(center(d.businessName) + LF)
  p(center(d.locationName) + LF)
  p(divider() + LF)

  p(BOLD_ON + center('Pick Up Date:') + BOLD_OFF + LF)
  p(BOLD_ON + center(d.date) + BOLD_OFF + LF)
  p(LF)

  // ── Orders ───────────────────────────────────────────────────────────────
  for (const order of d.orders) {
    // Order header
    p(BOLD_ON + `Order# ${order.orderNumberString}` + BOLD_OFF + LF)
    p(`Customer: ${order.customerName}` + LF)
    if (order.customerPhone) p(`Phone: ${order.customerPhone}` + LF)
    p(LF)

    // Items grouped by category
    const groups: Record<string, PickupSheetItem[]> = {}
    for (const item of order.items) {
      const cat = baseCategory(item.category || 'Other')
      if (!groups[cat]) groups[cat] = []
      groups[cat].push(item)
    }

    for (const [cat, items] of Object.entries(groups)) {
      p(BOLD_ON + cat + BOLD_OFF + LF)
      for (const item of items) {
        const price = fmt(item.unitPrice)
        const label = `  ${item.name}`
        const qty   = ` x${item.quantity}`
        // Wrap long names
        if (label.length + qty.length + price.length > WIDTH) {
          p(label.slice(0, WIDTH) + LF)
          p(row(`  ${qty.trim()}`, price) + LF)
        } else {
          p(row(label + qty, price) + LF)
        }
        if (item.note) p(`  (${item.note})`.slice(0, WIDTH) + LF)
      }
    }

    // Order note
    if (order.orderNote) {
      p(`Note: ${order.orderNote}`.slice(0, WIDTH) + LF)
    }

    // Subtotal + piece count
    p(LF)
    const totalQty = order.items.reduce((s, i) => s + (i.quantity ?? 1), 0)
    p(row('Subtotal', fmt(order.orderAmount)) + LF)
    p(`${totalQty} item${totalQty !== 1 ? 's' : ''}` + LF)

    // Status (inverted if still in progress)
    const isActive = order.status === 'In progress' || order.status === 'Redo'
    if (isActive) {
      p(INVERT_ON + `Status: ${order.status}` + INVERT_OFF + LF)
    } else {
      p(`Status: ${order.status}` + LF)
    }

    p(divider() + LF + LF)
  }

  // ── Footer ───────────────────────────────────────────────────────────────
  const footer = d.footer ?? '"We deliver great quality, fair price, and fast service – every time"'
  p(center(footer) + LF)
  p(LF + LF)
  p(CUT)

  return L.join('')
}
