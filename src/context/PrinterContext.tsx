/**
 * PrinterContext — unified printer bridge for Stitch POS
 *
 * Native iOS (Capacitor): uses StarPrinterPlugin → StarIO10 SDK
 *   → supports mC-Print3 (thermal) and SP742 (impact) via LAN
 *
 * Web/Mac (fallback): QZ Tray WebSocket (currently disabled/broken)
 *   → will be removed once iOS app is primary
 */

import { createContext, useContext, useEffect, useRef, useState, type ReactNode } from 'react'
import { StarPrinter, isNativeApp } from '../plugins/StarPrinter'
import type { ReceiptData } from '../lib/buildReceipt'
import type { LabelData } from '../lib/buildLabel'

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'unavailable'

interface DiscoveredPrinter {
  identifier: string
  model: string
}

export interface OrderForLabels {
  orderNumberString: string
  customerName: string
  pickupDate: string
  items: string        // raw JSON string from Firestore
  shopType?: string
}

interface PrinterContextValue {
  status: ConnectionStatus
  isNative: boolean
  printers: DiscoveredPrinter[]
  thermalPrinter: string | null   // IP / identifier for mC-Print3
  impactPrinter: string | null    // IP / identifier for SP742
  setThermalPrinter: (id: string) => void
  setImpactPrinter: (id: string) => void
  discoverPrinters: () => Promise<void>
  printReceipt: (data: ReceiptData, copies?: number) => Promise<boolean>
  printLabel: (data: LabelData) => Promise<boolean>
  printLabelsForOrder: (order: OrderForLabels) => Promise<boolean>
  printPickupSheet: (opts: { businessName: string; locationName: string; date: string; orders: any[] }) => Promise<boolean>
  openDrawer: () => Promise<boolean>
}

const PrinterContext = createContext<PrinterContextValue | null>(null)

const THERMAL_KEY = 'stitch_thermal_printer'
const IMPACT_KEY  = 'stitch_impact_printer'

export function PrinterProvider({ children }: { children: ReactNode }) {
  const native = isNativeApp()
  const [status, setStatus]           = useState<ConnectionStatus>(native ? 'connected' : 'unavailable')
  const [printers, setPrinters]       = useState<DiscoveredPrinter[]>([])
  const [thermalPrinter, setThermalState] = useState<string | null>(localStorage.getItem(THERMAL_KEY))
  const [impactPrinter,  setImpactState]  = useState<string | null>(localStorage.getItem(IMPACT_KEY))
  const discoveringRef = useRef(false)

  // In native mode, auto-discover on first load if no printer saved
  useEffect(() => {
    if (native && !thermalPrinter && !impactPrinter) {
      discoverPrinters()
    }
  }, [native])

  async function discoverPrinters() {
    if (!native || discoveringRef.current) return
    discoveringRef.current = true
    setStatus('connecting')
    try {
      const result = await StarPrinter.discoverPrinters()
      setPrinters(result.printers)
      setStatus('connected')

      // Auto-assign if only one printer found and none saved yet
      if (result.printers.length === 1) {
        if (!thermalPrinter) setThermalPrinter(result.printers[0].identifier)
      }
    } catch (e) {
      console.error('Printer discovery failed:', e)
      setStatus('unavailable')
    } finally {
      discoveringRef.current = false
    }
  }

  function setThermalPrinter(id: string) {
    localStorage.setItem(THERMAL_KEY, id)
    setThermalState(id)
  }

  function setImpactPrinter(id: string) {
    localStorage.setItem(IMPACT_KEY, id)
    setImpactState(id)
  }

  async function printReceipt(data: ReceiptData, copies = 1): Promise<boolean> {
    if (!native || !thermalPrinter) {
      console.warn('printReceipt: not native or no thermal printer selected')
      return false
    }
    try {
      await StarPrinter.printReceipt({
        identifier: thermalPrinter,
        receipt: data as unknown as Record<string, unknown>,
        copies,
      })
      return true
    } catch (e) {
      console.error('printReceipt failed:', e)
      return false
    }
  }

  async function printLabel(data: LabelData): Promise<boolean> {
    if (!native || !impactPrinter) {
      console.warn('printLabel: not native or no impact printer selected')
      return false
    }
    try {
      await StarPrinter.printLabel({
        identifier: impactPrinter,
        label: data as unknown as Record<string, unknown>,
      })
      return true
    } catch (e) {
      console.error('printLabel failed:', e)
      return false
    }
  }

  function formatLabelDate(dateStr: string): string {
    if (!dateStr) return ''
    // Parse YYYY-MM-DD in local timezone to avoid UTC-shift issues
    const parts = dateStr.split('-').map(Number)
    if (parts.length !== 3 || parts.some(isNaN)) return dateStr
    const [year, month, day] = parts
    const d = new Date(year, month - 1, day)
    const days   = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday']
    const months = ['January','February','March','April','May','June','July','August','September','October','November','December']
    return `${days[d.getDay()]} ${day} ${months[month - 1]} ${year}`
  }

  async function printLabelsForOrder(order: OrderForLabels): Promise<boolean> {
    if (!native) {
      console.warn('printLabelsForOrder: not running in native app')
      return false
    }
    if (!impactPrinter && !thermalPrinter) {
      console.warn('printLabelsForOrder: no printers selected')
      return false
    }
    try {
      await StarPrinter.printLabelsForOrder({
        orderNumber:       order.orderNumberString,
        customerName:      order.customerName,
        pickupDate:        formatLabelDate(order.pickupDate || ''),
        itemsJson:         order.items,
        shopType:          order.shopType ?? 'alterations',
        impactIdentifier:  impactPrinter ?? '',
        thermalIdentifier: thermalPrinter ?? '',
      })
      return true
    } catch (e) {
      console.error('printLabelsForOrder failed:', e)
      return false
    }
  }

  async function printPickupSheet(opts: { businessName: string; locationName: string; date: string; orders: any[] }): Promise<boolean> {
    if (!native || !thermalPrinter) {
      console.warn('printPickupSheet: not native or no thermal printer selected')
      return false
    }
    try {
      await StarPrinter.printPickupSheet({
        identifier:   thermalPrinter,
        businessName: opts.businessName,
        locationName: opts.locationName,
        date:         opts.date,
        ordersJson:   JSON.stringify(opts.orders),
      })
      return true
    } catch (e) {
      console.error('printPickupSheet failed:', e)
      return false
    }
  }

  async function openDrawer(): Promise<boolean> {
    if (!native || !thermalPrinter) return false
    try {
      await StarPrinter.openDrawer({ identifier: thermalPrinter })
      return true
    } catch (e) {
      console.error('openDrawer failed:', e)
      return false
    }
  }

  return (
    <PrinterContext.Provider value={{
      status,
      isNative: native,
      printers,
      thermalPrinter,
      impactPrinter,
      setThermalPrinter,
      setImpactPrinter,
      discoverPrinters,
      printReceipt,
      printLabel,
      printLabelsForOrder,
      openDrawer,
      printPickupSheet,
    }}>
      {children}
    </PrinterContext.Provider>
  )
}

export function usePrinter(): PrinterContextValue {
  const ctx = useContext(PrinterContext)
  if (!ctx) throw new Error('usePrinter must be used within PrinterProvider')
  return ctx
}
