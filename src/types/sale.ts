export interface SaleItem {
  id: string
  garmentId: string
  category: string
  name: string
  quantity: number
  unitPrice: number
  note: string
  components?: string[]  // physical pieces e.g. ["Jacket","Trousers"] for a suit
  extras?: { name: string; price: number }[]  // add-ons e.g. Deluxe, Express
  colour?: string                             // e.g. "White", "Black" — no price impact
  fabric?: { name: string; price: number }   // single-select, may add to price
  stains?: string[]                          // multi-select, each +$2
}

/** Effective price including extras, fabric surcharge, and stain treatments */
export function itemEffectivePrice(item: SaleItem): number {
  const extrasTotal = (item.extras ?? []).reduce((s, e) => s + e.price, 0)
  const fabricPrice = item.fabric?.price ?? 0
  const stainsTotal = (item.stains?.length ?? 0) * 2
  return item.unitPrice + extrasTotal + fabricPrice + stainsTotal
}

/** Physical piece count for a single SaleItem */
export function pieceCount(item: SaleItem): number {
  return item.quantity * Math.max(item.components?.length ?? 1, 1)
}

/**
 * Total piece count across all items in a sale.
 * Groups by garmentId — multiple services on the same garment count as 1 garment.
 * Per group: max(quantity) × max(components, 1)
 * e.g. 3-piece suit × 2 = 6; two services on same pant × 1 = 1
 */
export function totalPieceCount(items: SaleItem[]): number {
  // Group by garmentId
  const groups = new Map<string, SaleItem[]>()
  for (const item of items) {
    const key = item.garmentId
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(item)
  }
  // Per group: max(qty) × max(components, 1)
  let total = 0
  for (const group of groups.values()) {
    const maxQty  = group.reduce((m, i) => Math.max(m, i.quantity), 0)
    const maxComp = group.reduce((m, i) => Math.max(m, i.components?.length ?? 1), 1)
    total += maxQty * maxComp
  }
  return total
}
