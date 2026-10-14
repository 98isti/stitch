export interface SaleItem {
  id: string
  garmentId: string
  category: string
  name: string
  quantity: number
  unitPrice: number
  note: string
  components?: string[]  // physical pieces e.g. ["Jacket","Trousers"] for a suit
}

/** Physical piece count for a single SaleItem */
export function pieceCount(item: SaleItem): number {
  return item.quantity * Math.max(item.components?.length ?? 1, 1)
}

/** Total piece count across all items in a sale */
export function totalPieceCount(items: SaleItem[]): number {
  return items.reduce((sum, i) => sum + pieceCount(i), 0)
}
