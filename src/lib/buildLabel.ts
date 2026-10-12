/**
 * buildLabel — generates raw ESC/POS text for Star SP742 impact printer
 * 40-column format for carbon copy paper (dry cleaning job tickets)
 */

export interface LabelData {
  orderNumber: string
  customerName: string
  customerPhone?: string
  pickupDate: string  // e.g. 'Wednesday 14 October 2026'
  items: { category: string; name: string; qty: number; note?: string }[]
  locationName: string
  orderNote?: string
}

const WIDTH = 40

function divider(char = '-', width = WIDTH): string {
  return char.repeat(width) + '\n'
}

function center(text: string, width = WIDTH): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2))
  return ' '.repeat(pad) + text + '\n'
}

export function buildLabel(d: LabelData): string {
  const groups: Record<string, typeof d.items> = {}
  for (const item of d.items) {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category].push(item)
  }

  let out = ''

  out += center(d.locationName.toUpperCase())
  out += divider('=')
  out += center(`ORDER # ${d.orderNumber}`)
  out += divider('=')

  out += `${d.customerName}\n`
  if (d.customerPhone) out += `${d.customerPhone}\n`
  out += divider()

  out += `Pick up: ${d.pickupDate}\n`
  out += divider()

  for (const [cat, items] of Object.entries(groups)) {
    out += `${cat.toUpperCase()}\n`
    for (const item of items) {
      const qtyStr = item.qty > 1 ? ` x${item.qty}` : ''
      out += `  ${item.name}${qtyStr}\n`.slice(0, WIDTH + 1)
      if (item.note) out += `  (${item.note})\n`.slice(0, WIDTH + 1)
    }
  }

  out += divider()

  if (d.orderNote) {
    out += `Note: ${d.orderNote}\n`.slice(0, WIDTH + 1)
    out += divider()
  }

  out += center('** CUSTOMER COPY **')
  out += '\n\n\n'
  out += '\x1B\x64\x03'
  out += '\x1B\x64\x41'

  return out
}

export function buildLabelTwoCopies(d: LabelData): string {
  const customerCopy = buildLabel(d)
  const garmentCopy  = buildLabel(d).replace('** CUSTOMER COPY **', '** GARMENT COPY **')
  return customerCopy + garmentCopy
}
