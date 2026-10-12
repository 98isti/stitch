/**
 * buildLabel — generates raw ESC/POS text for Star SP742 impact printer
 * 40-column format for carbon copy paper (dry cleaning job tickets)
 */

export interface LabelData {
  orderNumber: string
  customerName: string
  customerPhone?: string
  pickupDate: string
  items: { category: string; name: string; qty: number; note?: string }[]
  locationName: string
  orderNote?: string
}

// SP742 is 40 columns wide
const WIDTH = 40

  const space = width - left.length - right.length
  return left + (space > 0 ? ' '.repeat(space) : '') + right + '\n'
}

function divider(char = '-', width = WIDTH): string {
  return char.repeat(width) + '\n'
}

function center(text: string, width = WIDTH): string {
  const pad = Math.max(0, Math.floor((width - text.length) / 2))
  return ' '.repeat(pad) + text + '\n'
}

export function buildLabel(d: LabelData): string {
  // Group items by category
  const groups: Record<string, typeof d.items> = {}
  for (const item of d.items) {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category].push(item)
  }

  let out = ''

  // Header
  out += center(d.locationName.toUpperCase())
  out += divider('=')
  out += center(`ORDER # ${d.orderNumber}`)
  out += divider('=')

  // Customer
  out += `${d.customerName}\n`
  if (d.customerPhone) out += `${d.customerPhone}\n`
  out += divider()

  // Pickup
  out += `Pick up: ${d.pickupDate}\n`
  out += divider()

  // Items
  for (const [cat, items] of Object.entries(groups)) {
    out += `${cat.toUpperCase()}\n`
    for (const item of items) {
      const qtyStr = item.qty > 1 ? ` x${item.qty}` : ''
      const itemLine = `  ${item.name}${qtyStr}`
      out += itemLine.slice(0, WIDTH) + '\n'
      if (item.note) out += `  (${item.note})\n`.slice(0, WIDTH + 1)
    }
  }

  out += divider()

  // Order note
  if (d.orderNote) {
    out += `Note: ${d.orderNote}\n`.slice(0, WIDTH + 1)
    out += divider()
  }

  // Footer
  out += center('** CUSTOMER COPY **')
  out += '\n\n\n' // feed paper for tear-off

  // Partial cut (ESC/POS)
  out += '\x1B\x64\x03' // feed 3 lines before cut
  out += '\x1B\x64\x41' // partial cut (Star SP742)

  return out
}

/** Build two copies — one for customer, one to pin to garment */
export function buildLabelTwoCopies(d: LabelData): string {
  const customerCopy = buildLabel(d)
  const garmentCopy  = buildLabel({ ...d })
    .replace('** CUSTOMER COPY **', '** GARMENT COPY **')
  return customerCopy + garmentCopy
}
