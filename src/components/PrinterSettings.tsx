/**
 * PrinterSettings — printer selection UI for Settings page
 * Native iOS: discovers Star printers on LAN via StarIO10
 * Web: shows "printing requires iPad app" message
 */

import { useState } from 'react'
import { usePrinter } from '../context/PrinterContext'

export default function PrinterSettings() {
  const {
    status, isNative, printers,
    thermalPrinter, setThermalPrinter,
    impactPrinter,  setImpactPrinter,
    discoverPrinters, printReceipt, printLabel, openDrawer,
  } = usePrinter()

  const [discovering, setDiscovering] = useState(false)
  const [testingReceipt, setTestingReceipt] = useState(false)
  const [testingLabel,   setTestingLabel]   = useState(false)

  async function handleDiscover() {
    setDiscovering(true)
    await discoverPrinters()
    setDiscovering(false)
  }

  async function handleTestReceipt() {
    setTestingReceipt(true)
    const now    = new Date()
    const pickup = new Date(now.getTime() + 2 * 86400000)
    const ok = await printReceipt({
      businessName:  'Sew Smart Alterations',
      locationName:  'Test Location',
      locationAddress: '123 Test Street, Sydney NSW',
      locationPhone:   '02 1234 5678',
      abn:             '12 345 678 901',
      orderNumber:     'CAR 0001',
      orderDate:    now.toLocaleDateString('en-AU', { weekday:'long', day:'numeric', month:'long', year:'numeric' }),
      orderTime:    now.toLocaleTimeString('en-AU', { hour:'numeric', minute:'2-digit', hour12:true }),
      servedBy:     'Isti',
      customerName: 'Test Customer',
      customerPhone:'0412 345 678',
      pickupDay:    pickup.toLocaleDateString('en-AU', { weekday:'long' }),
      pickupDateFull: pickup.toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric' }),
      items: [
        { category:'Blazer', name:'Let Out',          qty:1, unitPrice:85 },
        { category:'Blazer', name:'Shorten Sleeve',   qty:1, unitPrice:35 },
      ],
      subtotal:    109.09,
      total:       120,
      paidAmount:  120,
      stillDue:    0,
      paymentMethod: 'Card',
    })
    setTestingReceipt(false)
    alert(ok ? '✅ Test receipt sent!' : '❌ Print failed — check printer is on and connected')
  }

  async function handleTestLabel() {
    setTestingLabel(true)
    const ok = await printLabel({
      orderNumber:  'CAR 0001',
      customerName: 'Test Customer',
      customerPhone:'0412 345 678',
      pickupDay:    'Wednesday',
      pickupDateFull: '14 October 2026',
      locationName: 'Carlingford',
      items: [
        { category:'Blazer', name:'Let Out',        qty:1 },
        { category:'Blazer', name:'Shorten Sleeve', qty:1 },
      ],
    })
    setTestingLabel(false)
    alert(ok ? '✅ Test label sent!' : '❌ Print failed — check impact printer is on and connected')
  }

  // ── Web browser — printing not available ────────────────────────────────
  if (!isNative) {
    return (
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 text-center">
        <p className="text-2xl mb-2">📱</p>
        <p className="text-sm font-semibold text-amber-800">Printing requires the iPad app</p>
        <p className="text-xs text-amber-600 mt-1">Open Stitch on your iPad to configure printers</p>
      </div>
    )
  }

  // ── Native iOS app ──────────────────────────────────────────────────────
  return (
    <div className="space-y-4">

      {/* Discover button */}
      <button
        onClick={handleDiscover}
        disabled={discovering}
        className="w-full py-2.5 rounded-xl bg-navy text-white text-sm font-semibold disabled:opacity-50 transition-opacity">
        {discovering ? '🔍 Searching…' : '🔍 Find Printers on Network'}
      </button>

      {printers.length > 0 && (
        <>
          {/* Thermal printer */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              🖨️ Thermal Printer (Receipts) — mC-Print3
            </label>
            <select
              value={thermalPrinter ?? ''}
              onChange={e => setThermalPrinter(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy bg-white">
              <option value="">— Select printer —</option>
              {printers.map(p => (
                <option key={p.identifier} value={p.identifier}>
                  {p.model} ({p.identifier})
                </option>
              ))}
            </select>
            {thermalPrinter && (
              <div className="flex gap-2 mt-2">
                <button
                  onClick={handleTestReceipt}
                  disabled={testingReceipt}
                  className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium disabled:opacity-50 transition-colors">
                  {testingReceipt ? 'Printing…' : 'Test Receipt'}
                </button>
                <button
                  onClick={openDrawer}
                  className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors">
                  Open Drawer
                </button>
              </div>
            )}
          </div>

          {/* Impact printer */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">
              🖨️ Impact Printer (Labels) — SP742
            </label>
            <select
              value={impactPrinter ?? ''}
              onChange={e => setImpactPrinter(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy bg-white">
              <option value="">— Select printer —</option>
              {printers.map(p => (
                <option key={p.identifier} value={p.identifier}>
                  {p.model} ({p.identifier})
                </option>
              ))}
            </select>
            {impactPrinter && (
              <button
                onClick={handleTestLabel}
                disabled={testingLabel}
                className="w-full mt-2 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium disabled:opacity-50 transition-colors">
                {testingLabel ? 'Printing…' : 'Test Label'}
              </button>
            )}
          </div>
        </>
      )}

      {printers.length === 0 && !discovering && (
        <p className="text-xs text-gray-400 text-center">
          Tap "Find Printers" to scan your network for Star printers
        </p>
      )}
    </div>
  )
}
