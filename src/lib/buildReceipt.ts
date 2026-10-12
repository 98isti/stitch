/**
 * buildReceipt — generates HTML for thermal receipt printing
 * Designed for 80mm paper (72mm printable width) on Star mC-Print3
 */

export interface ReceiptData {
  businessName: string
  locationName: string
  locationAddress: string
  locationPhone: string
  abn?: string
  orderNumber: string
  orderDate: string
  orderTime: string
  customerName: string
  customerPhone: string
  pickupDate: string
  items: { category: string; name: string; qty: number; unitPrice: number; note?: string }[]
  subtotal: number
  discount?: number
  total: number
  paidAmount: number
  stillDue: number
  paymentMethod: string
  servedBy: string
  barcode?: string
  orderNote?: string
}

export function buildReceipt(d: ReceiptData): string {
  const fmt = (n: number) => `$${n.toFixed(2)}`

  // Group items by category
  const groups: Record<string, typeof d.items> = {}
  for (const item of d.items) {
    if (!groups[item.category]) groups[item.category] = []
    groups[item.category].push(item)
  }

  const itemsHtml = Object.entries(groups).map(([cat, items]) => {
    const rows = items.map(it => `
      <tr>
        <td style="padding:1px 0">${it.qty > 1 ? `<span style="color:#666">${it.qty}×</span> ` : ''}${it.name}${it.note ? `<br><span style="color:#888;font-size:10px">(${it.note})</span>` : ''}</td>
        <td style="text-align:right;padding:1px 0">${fmt(it.unitPrice * it.qty)}</td>
      </tr>`).join('')
    return `
      <tr><td colspan="2" style="font-weight:bold;padding-top:6px;font-size:12px">${cat.toUpperCase()}</td></tr>
      ${rows}`
  }).join('')

  const payStatus = d.stillDue > 0
    ? `<div style="border:2px solid #000;padding:4px;text-align:center;margin:6px 0;font-size:14px;font-weight:bold">PARTIAL PAYMENT<br><span style="font-size:11px">DUE: ${fmt(d.stillDue)}</span></div>`
    : `<div style="text-align:center;font-size:22px;font-weight:bold;letter-spacing:2px;margin:6px 0">PAID</div>`

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body { font-family: 'Courier New', Courier, monospace; font-size:12px; width:72mm; }
  .center { text-align:center; }
  .divider { border-top:1px dashed #000; margin:5px 0; }
  .divider-solid { border-top:1px solid #000; margin:5px 0; }
  table { width:100%; border-collapse:collapse; }
  .total-row td { font-weight:bold; font-size:13px; border-top:1px solid #000; padding-top:4px; }
  .big { font-size:18px; font-weight:bold; }
  .small { font-size:10px; color:#555; }
</style>
</head>
<body>

<div class="center">
  <div class="big">${d.businessName}</div>
  <div>${d.locationName}</div>
  ${d.locationAddress ? `<div class="small">${d.locationAddress}</div>` : ''}
  ${d.locationPhone ? `<div class="small">Ph: ${d.locationPhone}</div>` : ''}
  ${d.abn ? `<div class="small">ABN: ${d.abn}</div>` : ''}
</div>

<div class="divider"></div>

<div>${d.orderDate} ${d.orderTime} &nbsp;|&nbsp; Served by: ${d.servedBy}</div>

<div class="divider"></div>

<div class="big">Order # ${d.orderNumber}</div>
<div style="font-size:13px">${d.customerName}</div>
${d.customerPhone ? `<div class="small">${d.customerPhone}</div>` : ''}

<div class="divider"></div>

<div style="font-size:13px;font-weight:bold">Pick up: ${d.pickupDate}</div>

<div class="divider"></div>

<table>${itemsHtml}</table>

<div class="divider-solid"></div>

<table>
  <tr><td>Subtotal (ex GST)</td><td style="text-align:right">${fmt(d.subtotal)}</td></tr>
  ${d.discount && d.discount > 0 ? `<tr><td>Discount</td><td style="text-align:right">-${fmt(d.discount)}</td></tr>` : ''}
  <tr class="total-row"><td>Total (incl 10% GST)</td><td style="text-align:right">${fmt(d.total)}</td></tr>
  ${d.stillDue > 0 ? `<tr><td>Paid now</td><td style="text-align:right">${fmt(d.paidAmount)}</td></tr>` : ''}
</table>

${d.orderNote ? `<div class="divider"></div><div class="small">Note: ${d.orderNote}</div>` : ''}

<div class="divider"></div>

${payStatus}

<div class="center small">Payment method: ${d.paymentMethod}</div>

<div class="divider"></div>

<div class="center">Thank you!</div>
<div class="center small">Please keep this receipt</div>

${d.barcode ? `
<div class="divider"></div>
<div class="center small" style="word-break:break-all;font-size:9px">${d.barcode}</div>
` : ''}

</body>
</html>`
}
