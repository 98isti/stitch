/**
 * PrinterContext — single QZ Tray connection for the whole app
 * Prevents reconnecting (and triggering approval dialogs) on every page navigation
 */

import { createContext, useContext, useEffect, useRef, useState, useCallback, type ReactNode } from 'react'

declare const qz: any

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'unavailable'

interface PrinterContextValue {
  status: ConnectionStatus
  printers: string[]
  thermalPrinter: string | null
  impactPrinter: string | null
  setThermalPrinter: (name: string) => void
  setImpactPrinter: (name: string) => void
  printReceipt: (html: string) => Promise<boolean>
  printLabel: (text: string) => Promise<boolean>
  openDrawer: () => Promise<boolean>
  reconnect: () => void
}

const PrinterContext = createContext<PrinterContextValue | null>(null)

const THERMAL_KEY = 'stitch_thermal_printer'
const IMPACT_KEY  = 'stitch_impact_printer'

function loadQzScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof qz !== 'undefined') { resolve(); return }
    if (document.querySelector('script[src="/qz-tray.js"]')) {
      // Script already loading — wait for it
      const check = setInterval(() => {
        if (typeof qz !== 'undefined') { clearInterval(check); resolve() }
      }, 100)
      setTimeout(() => { clearInterval(check); reject(new Error('QZ script timeout')) }, 5000)
      return
    }
    const script = document.createElement('script')
    script.src = '/qz-tray.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('QZ Tray script failed to load'))
    document.head.appendChild(script)
  })
}

export function PrinterProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [printers, setPrinters] = useState<string[]>([])
  const [thermalPrinter, setThermalState] = useState<string | null>(localStorage.getItem(THERMAL_KEY))
  const [impactPrinter, setImpactState] = useState<string | null>(localStorage.getItem(IMPACT_KEY))
  const connectingRef = useRef(false)
  const connectedRef = useRef(false)

  const connect = useCallback(async () => {
    if (connectingRef.current || connectedRef.current) return
    connectingRef.current = true
    setStatus('connecting')
    try {
      await loadQzScript()
      if (typeof qz === 'undefined') throw new Error('QZ not loaded')
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect({ retries: 2, delay: 1 })
      }
      connectedRef.current = true
      setStatus('connected')
      try {
        const found: string[] = await qz.printers.find()
        setPrinters(Array.isArray(found) ? found : [found])
      } catch { /* printer list is optional */ }
    } catch {
      setStatus('unavailable')
    } finally {
      connectingRef.current = false
    }
  }, [])

  useEffect(() => {
    connect()
    // Do NOT disconnect on unmount — keep connection alive across page changes
  }, [connect])

  function setThermalPrinter(name: string) {
    localStorage.setItem(THERMAL_KEY, name)
    setThermalState(name)
  }

  function setImpactPrinter(name: string) {
    localStorage.setItem(IMPACT_KEY, name)
    setImpactState(name)
  }

  async function printReceipt(html: string): Promise<boolean> {
    if (!thermalPrinter || !qz?.websocket?.isActive()) return false
    try {
      const config = qz.configs.create(thermalPrinter, { size: { width: 72, height: null }, units: 'mm', scaleContent: true })
      await qz.print(config, [{ type: 'pixel', format: 'html', flavor: 'plain', data: html }])
      return true
    } catch (e) { console.error('Receipt print failed:', e); return false }
  }

  async function printLabel(text: string): Promise<boolean> {
    if (!impactPrinter || !qz?.websocket?.isActive()) return false
    try {
      const config = qz.configs.create(impactPrinter)
      await qz.print(config, [{ type: 'raw', format: 'plain', data: text }])
      return true
    } catch (e) { console.error('Label print failed:', e); return false }
  }

  async function openDrawer(): Promise<boolean> {
    if (!thermalPrinter || !qz?.websocket?.isActive()) return false
    try {
      const config = qz.configs.create(thermalPrinter)
      await qz.print(config, [{ type: 'raw', format: 'plain', data: '\x1B\x70\x00\x32\x32' }])
      return true
    } catch (e) { console.error('Drawer open failed:', e); return false }
  }

  return (
    <PrinterContext.Provider value={{
      status, printers,
      thermalPrinter, impactPrinter,
      setThermalPrinter, setImpactPrinter,
      printReceipt, printLabel, openDrawer,
      reconnect: connect,
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
