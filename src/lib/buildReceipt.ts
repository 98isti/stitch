/**
 * buildReceipt — HTML receipt matching SmartPOS layout
 * 80mm paper (72mm printable) · Star mC-Print3 via QZ Tray
 */

export interface ReceiptItem {
  category: string
  name: string
  qty: number
  unitPrice: number
  note?: string
}

export interface ReceiptData {
  logoUrl?: string          // URL to logo image (optional)
  businessName: string      // e.g. "Sew Smart Alterations"
  locationName: string      // e.g. "Carlingford"
  locationAddress?: string  // e.g. "123 Pennant Hills Rd, Carlingford NSW 2118"
  locationPhone?: string
  abn?: string
  orderNumber: string       // e.g. "CAR 42"
  orderDate: string         // e.g. "Sunday, 12 October 2026"
  orderTime: string         // e.g. "10:49 am"
  servedBy: string
  customerName: string
  customerPhone?: string
  pickupDay: string         // e.g. "Tuesday"
  pickupDateFull: string    // e.g. "13 October 2026"
  pickupTime?: string       // default "after 4PM"
  items: ReceiptItem[]
  subtotal: number          // ex-GST
  discount?: number
  total: number             // incl GST
  paidAmount: number
  stillDue: number
  paymentMethod: string
  barcode?: string
  orderNote?: string
}

function fmt(n: number) {
  return `$${n.toFixed(2)}`
}

export function buildReceipt(d: ReceiptData): string {
  // Group items by category
  const groups: Record<string, ReceiptItem[]> = {}
  for (const item of d.items) {
    const cat = item.category || 'Other'
    if (!groups[cat]) groups[cat] = []
    groups[cat].push(item)
  }

  const itemCount = d.items.reduce((sum, i) => sum + i.qty, 0)

  const logoHtml = d.logoUrl
    ? `<img src="${d.logoUrl}" style="max-width:180px;max-height:60px;object-fit:contain;margin-bottom:4px" /><br>`
    : `<div style="font-size:20px;font-weight:900;letter-spacing:-0.5px;margin-bottom:2px">${d.businessName}</div>`

  const itemsHtml = Object.entries(groups).map(([cat, items]) => {
    const rows = items.map(it => {
      const price = fmt(it.unitPrice * it.qty)
      const noteHtml = it.note ? `<div style="padding-left:8px;color:#666;font-size:10px">(${it.note})</div>` : ''
      return `<div style="display:flex;justify-content:space-between;padding:1px 0">
        <span>${it.qty > 1 ? `${it.name}` : it.name} ${it.qty > 1 ? `<span style="color:#888">x${it.qty}</span>` : ''}</span>
        <span style="margin-left:8px;white-space:nowrap">${price}</span>
      </div>${noteHtml}`
    }).join('')
    return `<div style="font-weight:bold;margin-top:4px">${cat.toUpperCase()}</div>${rows}`
  }).join('')

  // Payment status
  let payStatusHtml = ''
  if (d.stillDue > 0) {
    payStatusHtml = `
      <div style="text-align:center;font-size:18px;font-weight:bold;border:2px solid #000;padding:4px 8px;margin:6px 0">
        PARTIAL PAYMENT<br>
        <span style="font-size:13px">Due: ${fmt(d.stillDue)}</span>
      </div>`
  } else if (!d.paidAmount || d.paidAmount === 0) {
    payStatusHtml = `
      <div style="text-align:center;font-size:24px;font-weight:900;border:2px solid #000;padding:4px 8px;margin:6px 0;letter-spacing:2px">
        NOT PAID
      </div>`
  } else {
    payStatusHtml = `
      <div style="text-align:center;font-size:36px;font-weight:900;letter-spacing:3px;margin:8px 0">
        PAID
      </div>`
  }

  // QR code — encode barcode as a URL-based QR if barcode provided
  const qrHtml = d.barcode
    ? `<div style="text-align:center;margin-top:6px">
        <img src="https://api.qrserver.com/v1/create-qr-code/?size=100x100&data=${encodeURIComponent(d.barcode)}" width="100" height="100" />
       </div>`
    : ''

  const orderNoteHtml = d.orderNote
    ? `<div style="margin-top:4px;font-size:10px;color:#444">Note: ${d.orderNote}</div>`
    : ''

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body {
    font-family: 'Courier New', Courier, monospace;
    font-size: 11px;
    width: 72mm;
    padding: 2mm;
  }
  .dash { border-top: 1px dashed #000; margin: 5px 0; }
  .big { font-size: 20px; font-weight: bold; }
  .xl  { font-size: 24px; font-weight: bold; }
  .center { text-align: center; }
  .right { text-align: right; }
  .totals { width: 100%; }
  .totals td { padding: 1px 0; }
  .totals td:last-child { text-align: right; }
  .inverted {
    display: inline-block;
    background: #000;
    color: #fff;
    font-weight: bold;
    font-size: 14px;
    padding: 1px 6px;
    margin-right: 4px;
  }
</style>
</head>
<body>

${logoHtml}
<div style="font-size:11px">
  <strong>${d.businessName} – ${d.locationName}</strong><br>
  ${d.locationAddress ? `${d.locationAddress}<br>` : ''}
  ${d.locationPhone ? `Phone: ${d.locationPhone}<br>` : ''}
  ${d.abn ? `ABN: ${d.abn}` : ''}
</div>

<div class="dash"></div>

<div style="font-size:11px">
  Ordered: ${d.orderDate}<br>
  ${d.orderTime}<br>
  Served by: ${d.servedBy}
</div>

<div class="dash"></div>

<div class="xl">Order # ${d.orderNumber}</div>
<div style="font-size:13px">${d.customerName}</div>
${d.customerPhone ? `<div style="font-size:11px">${d.customerPhone}</div>` : ''}

<div class="dash"></div>

<div class="big">Pick up: ${d.pickupDay}</div>
<div class="big">${d.pickupDateFull}</div>
<div class="big" style="margin-top:2px">Pick up time: ${d.pickupTime ?? 'after 4PM'}</div>

<div class="dash"></div>

<div style="font-size:11px">${itemsHtml}</div>

${orderNoteHtml}

<div class="dash"></div>

<table class="totals">
  <tr><td>Subtotal</td><td>${fmt(d.subtotal)}</td></tr>
  ${d.discount && d.discount > 0 ? `<tr><td>Discount</td><td>-${fmt(d.discount)}</td></tr>` : ''}
  <tr><td><strong>Total (incl 10% GST)</strong></td><td><strong>${fmt(d.total)}</strong></td></tr>
  ${d.stillDue > 0 ? `<tr><td>Paid</td><td>${fmt(d.paidAmount)}</td></tr>` : ''}
</table>

<div style="margin-top:5px">
  <span class="inverted">${itemCount}</span> item${itemCount !== 1 ? 's' : ''}
</div>

<div class="dash"></div>

${payStatusHtml}

<div style="text-align:center;font-size:11px">Payment method: ${d.paymentMethod}</div>

<div class="dash"></div>

<div class="center" style="font-size:11px">Thank you!</div>

${qrHtml}

</body>
</html>`
}
