/**
 * usePrinter — QZ Tray integration for Stitch POS
 * Handles connection, printer discovery, receipt printing and label printing.
 *
 * Long-term: when Stitch becomes a Capacitor iOS app, replace QZ calls
 * with StarIO10 SDK calls — receipt/label content stays identical.
 */

import { useEffect, useRef, useState, useCallback } from 'react'

declare const qz: any

type ConnectionStatus = 'disconnected' | 'connecting' | 'connected' | 'unavailable'

interface PrinterState {
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

const THERMAL_KEY = 'stitch_thermal_printer'
const IMPACT_KEY  = 'stitch_impact_printer'

function loadQzScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof qz !== 'undefined') { resolve(); return }
    const script = document.createElement('script')
    script.src = '/qz-tray.js'
    script.onload = () => resolve()
    script.onerror = () => reject(new Error('QZ Tray script failed to load'))
    document.head.appendChild(script)
  })
}

export function usePrinter(): PrinterState {
  const [status, setStatus] = useState<ConnectionStatus>('disconnected')
  const [printers, setPrinters] = useState<string[]>([])
  const [thermalPrinter, setThermalState] = useState<string | null>(
    localStorage.getItem(THERMAL_KEY)
  )
  const [impactPrinter, setImpactState] = useState<string | null>(
    localStorage.getItem(IMPACT_KEY)
  )
  const connectingRef = useRef(false)

  const connect = useCallback(async () => {
    if (connectingRef.current) return
    connectingRef.current = true
    setStatus('connecting')
    try {
      await loadQzScript()
      if (typeof qz === 'undefined') throw new Error('QZ not loaded')

      // QZ Tray — connect without certificate (development mode)
      // QZ Tray will show an in-browser approval dialog on first connect
      if (!qz.websocket.isActive()) {
        await qz.websocket.connect({ retries: 2, delay: 1 })
      }

      const found: string[] = await qz.printers.find()
      setPrinters(Array.isArray(found) ? found : [found])
      setStatus('connected')
    } catch (e) {
      console.warn('QZ Tray not available:', e)
      setStatus('unavailable')
    } finally {
      connectingRef.current = false
    }
  }, [])

  useEffect(() => {
    connect()
    return () => {
      try {
        if (typeof qz !== 'undefined' && qz.websocket.isActive()) {
          qz.websocket.disconnect()
        }
      } catch { /* ignore */ }
    }
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
    if (status !== 'connected' || !thermalPrinter) return false
    try {
      const config = qz.configs.create(thermalPrinter, {
        size: { width: 72, height: null }, units: 'mm', scaleContent: true,
      })
      const data = [{
        type: 'pixel',
        format: 'html',
        flavor: 'plain',
        data: html,
      }]
      await qz.print(config, data)
      return true
    } catch (e) {
      console.error('Receipt print failed:', e)
      return false
    }
  }

  async function printLabel(text: string): Promise<boolean> {
    if (status !== 'connected' || !impactPrinter) return false
    try {
      const config = qz.configs.create(impactPrinter)
      const data = [{ type: 'raw', format: 'plain', data: text }]
      await qz.print(config, data)
      return true
    } catch (e) {
      console.error('Label print failed:', e)
      return false
    }
  }

  async function openDrawer(): Promise<boolean> {
    if (status !== 'connected' || !thermalPrinter) return false
    try {
      const config = qz.configs.create(thermalPrinter)
      // ESC/POS cash drawer open pulse (pin 2)
      const data = [{ type: 'raw', format: 'plain', data: '\x1B\x70\x00\x32\x32' }]
      await qz.print(config, data)
      return true
    } catch (e) {
      console.error('Drawer open failed:', e)
      return false
    }
  }

  return {
    status,
    printers,
    thermalPrinter,
    impactPrinter,
    setThermalPrinter,
    setImpactPrinter,
    printReceipt,
    printLabel,
    openDrawer,
    reconnect: connect,
  }
}
