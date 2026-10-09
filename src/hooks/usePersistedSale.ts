import { useState, useEffect } from 'react'

import type { SaleItem } from '../types/sale'

interface Discount {
  type: 'percent' | 'flat'
  value: number
}

interface PersistedSale {
  items: SaleItem[]
  amount: string
  customerName: string
  customerPhone: string
  pickupDate: string // ISO string
  discount: Discount | null
}

const KEY = 'stitch_current_sale'

function load(): PersistedSale | null {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return null
    return JSON.parse(raw) as PersistedSale
  } catch { return null }
}

function save(sale: PersistedSale) {
  try { localStorage.setItem(KEY, JSON.stringify(sale)) } catch { /* ignore */ }
}

function clear() {
  try { localStorage.removeItem(KEY) } catch { /* ignore */ }
}

export function usePersistedSale(defaultPickupDate: Date) {
  const saved = load()

  const [items, setItems] = useState<SaleItem[]>(saved?.items ?? [])
  const [amount, setAmount] = useState(saved?.amount ?? '0')
  const [customerName, setCustomerName] = useState(saved?.customerName ?? '')
  const [customerPhone, setCustomerPhone] = useState(saved?.customerPhone ?? '')
  const [pickupDate, setPickupDate] = useState<Date>(
    saved?.pickupDate ? new Date(saved.pickupDate) : defaultPickupDate
  )
  const [discount, setDiscount] = useState<Discount | null>(saved?.discount ?? null)

  // Persist whenever any sale state changes
  useEffect(() => {
    save({ items, amount, customerName, customerPhone, pickupDate: pickupDate.toISOString(), discount })
  }, [items, amount, customerName, customerPhone, pickupDate, discount])

  function clearSale() {
    setItems([])
    setAmount('0')
    setCustomerName('')
    setCustomerPhone('')
    setPickupDate(defaultPickupDate)
    setDiscount(null)
    clear()
  }

  return {
    items, setItems,
    amount, setAmount,
    customerName, setCustomerName,
    customerPhone, setCustomerPhone,
    pickupDate, setPickupDate,
    discount, setDiscount,
    clearSale,
  }
}
