/**
 * PrinterSettings — inline section for Settings page
 * Shows QZ Tray connection status + thermal/impact printer selection
 */

import { usePrinter } from '../hooks/usePrinter'
import { buildReceipt } from '../lib/buildReceipt'
import { buildLabelTwoCopies } from '../lib/buildLabel'

const STATUS_LABEL: Record<string, string> = {
  disconnected: '⚪ Not connected',
  connecting:   '🔄 Connecting…',
  connected:    '🟢 Connected',
  unavailable:  '🔴 QZ Tray not running',
}

export default function PrinterSettings() {
  const {
    status, printers,
    thermalPrinter, setThermalPrinter,
    impactPrinter,  setImpactPrinter,
    printReceipt, printLabel, openDrawer,
    reconnect,
  } = usePrinter()

  async function testReceipt() {
    const html = buildReceipt({
      businessName: 'Stitch POS',
      locationName: 'Test Location',
      locationAddress: '123 Test Street, Sydney NSW',
      locationPhone: '02 1234 5678',
      orderNumber: 'CAR-0001',
      orderDate: new Date().toLocaleDateString('en-AU', { day:'numeric', month:'long', year:'numeric' }),
      orderTime: new Date().toLocaleTimeString('en-AU', { hour:'numeric', minute:'2-digit', hour12:true }),
      customerName: 'Test Customer',
      customerPhone: '0412 345 678',
      pickupDate: 'Tomorrow',
      items: [
        { category: 'Blazer', name: 'Let Out', qty: 1, unitPrice: 85 },
        { category: 'Blazer', name: 'Shorten Sleeve', qty: 1, unitPrice: 35 },
      ],
      subtotal: 109.09,
      total: 120,
      paidAmount: 120,
      stillDue: 0,
      paymentMethod: 'Card',
      servedBy: 'Isti',
    })
    const ok = await printReceipt(html)
    alert(ok ? '✅ Test receipt sent!' : '❌ Print failed — check printer is online')
  }

  async function testLabel() {
    const text = buildLabelTwoCopies({
      orderNumber: 'CAR-0001',
      customerName: 'Test Customer',
      customerPhone: '0412 345 678',
      pickupDate: 'Tomorrow',
      locationName: 'Carlingford',
      items: [
        { category: 'Blazer', name: 'Let Out', qty: 1 },
        { category: 'Blazer', name: 'Shorten Sleeve', qty: 1 },
      ],
    })
    const ok = await printLabel(text)
    alert(ok ? '✅ Test label sent!' : '❌ Print failed — check printer is online')
  }

  async function testDrawer() {
    const ok = await openDrawer()
    alert(ok ? '✅ Drawer opened!' : '❌ Failed — check printer is connected')
  }

  return (
    <div className="space-y-4">
      {/* Status */}
      <div className="flex items-center justify-between">
        <span className="text-sm text-gray-600">{STATUS_LABEL[status]}</span>
        {(status === 'disconnected' || status === 'unavailable') && (
          <button onClick={reconnect}
            className="text-xs text-navy hover:opacity-70 font-medium transition-opacity">
            Retry
          </button>
        )}
      </div>

      {status === 'unavailable' && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-xs text-amber-700">
          <p className="font-bold mb-1">QZ Tray not running</p>
          <p>Download and install from <span className="font-mono">qz.io</span>, then click Retry above.</p>
        </div>
      )}

      {status === 'connected' && (
        <>
          {/* Thermal printer */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">🖨️ Thermal Printer (Receipts)</label>
            <select
              value={thermalPrinter ?? ''}
              onChange={e => setThermalPrinter(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy bg-white">
              <option value="">— Select printer —</option>
              {printers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {thermalPrinter && (
              <div className="flex gap-2 mt-2">
                <button onClick={testReceipt}
                  className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors">
                  Test Receipt
                </button>
                <button onClick={testDrawer}
                  className="flex-1 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors">
                  Open Drawer
                </button>
              </div>
            )}
          </div>

          {/* Impact printer */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 mb-1">🖨️ Impact Printer (Labels)</label>
            <select
              value={impactPrinter ?? ''}
              onChange={e => setImpactPrinter(e.target.value)}
              className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:border-navy bg-white">
              <option value="">— Select printer —</option>
              {printers.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
            {impactPrinter && (
              <button onClick={testLabel}
                className="w-full mt-2 py-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs font-medium transition-colors">
                Test Label (2 copies)
              </button>
            )}
          </div>
        </>
      )}
    </div>
  )
}
