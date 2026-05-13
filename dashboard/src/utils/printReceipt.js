const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ESC[c]);

function formatPaymentMethod(receipt) {
  const detail = receipt.payments_detail;
  if (!detail || detail.length === 0) return receipt.payment_method || '';
  if (detail.length === 1) {
    const tenders = detail[0].tenders;
    if (tenders && tenders.length > 1) {
      return tenders.map((t) => t.method).join(' + ');
    }
    return detail[0].method || receipt.payment_method;
  }
  return detail.map((p, i) => `Bill ${i + 1}: ${p.method}`).join('  |  ');
}

export function printReceipt(receipt, currency) {
  const { symbol, rate, decimals } = currency;
  const fmt = (v) => `${esc(symbol)}${(parseFloat(v) * rate).toFixed(decimals)}`;

  const date = new Date(receipt.created_at).toLocaleString('en-US', {
    timeZone: receipt.timezone || 'UTC',
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const channelLabel = receipt.channel
    ? receipt.channel.charAt(0).toUpperCase() + receipt.channel.slice(1)
    : '';
  const location = receipt.channel === 'dining'
    ? (receipt.table_number ? `Table ${receipt.table_number}` : 'Dine-in')
    : (receipt.customer_ref || channelLabel);

  const itemsHtml = (receipt.items || []).map((item) =>
    `<tr>
      <td style="padding:2px 0;vertical-align:top">
        ${esc(item.name)} &times; ${esc(item.quantity)}
        ${item.notes ? `<br><span style="color:#777;font-size:11px">${esc(item.notes)}</span>` : ''}
      </td>
      <td style="text-align:right;padding:2px 0;vertical-align:top;white-space:nowrap">${fmt(item.price * item.quantity)}</td>
    </tr>`,
  ).join('');

  const discountRow = parseFloat(receipt.discount_amount) > 0
    ? `<tr>
        <td style="color:#15803d">Discount${receipt.discount_type === 'percent' ? ` (${esc(receipt.discount_value)}%)` : ' (flat)'}</td>
        <td style="text-align:right;color:#15803d">&minus;${fmt(receipt.discount_amount)}</td>
      </tr>` : '';

  const taxRow = parseFloat(receipt.tax_rate) > 0
    ? `<tr>
        <td>Tax (${+(parseFloat(receipt.tax_rate) * 100).toFixed(4)}%)</td>
        <td style="text-align:right">${fmt(receipt.tax_amount)}</td>
      </tr>` : '';

  const scRow = parseFloat(receipt.service_charge_rate) > 0
    ? `<tr>
        <td>Service charge (${+(parseFloat(receipt.service_charge_rate) * 100).toFixed(4)}%)</td>
        <td style="text-align:right">${fmt(receipt.service_charge_amount)}</td>
      </tr>` : '';

  const packagingRow = parseFloat(receipt.packaging_fee) > 0
    ? `<tr>
        <td>Packaging fee</td>
        <td style="text-align:right">${fmt(receipt.packaging_fee)}</td>
      </tr>` : '';

  const orderToken = (receipt.order_id || '').slice(-6).toUpperCase();

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt #${esc(orderToken)}</title>
  <style>
    *{margin:0;padding:0;box-sizing:border-box}
    body{font-family:'Courier New',Courier,monospace;font-size:13px;width:300px;margin:0 auto;padding:16px 10px;color:#111}
    .c{text-align:center}
    hr{border:none;border-top:1px dashed #999;margin:8px 0}
    table{width:100%;border-collapse:collapse}
    .lbl{color:#555;font-size:11px;text-transform:uppercase;letter-spacing:.05em}
    .total-row td{font-size:15px;font-weight:bold;padding-top:6px;border-top:1px solid #111}
    @media print{@page{margin:0;size:80mm auto}body{padding:6px 4px}}
  </style>
</head>
<body>
  <div class="c">
    <strong style="font-size:16px">${esc(receipt.restaurant_name || 'Restaurant')}</strong><br>
    <span class="lbl">Receipt</span>
  </div>
  <hr>
  <table>
    <tr><td class="lbl">Order</td><td style="text-align:right">#${esc(orderToken)}</td></tr>
    <tr><td class="lbl">Date</td><td style="text-align:right;font-size:12px">${esc(date)}</td></tr>
    <tr><td class="lbl">Type</td><td style="text-align:right;text-transform:capitalize">${esc(location)}</td></tr>
    <tr><td class="lbl">Payment</td><td style="text-align:right;text-transform:capitalize">${esc(formatPaymentMethod(receipt))}</td></tr>
  </table>
  <hr>
  <table>${itemsHtml}</table>
  <hr>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">${fmt(receipt.subtotal)}</td></tr>
    ${discountRow}${taxRow}${scRow}${packagingRow}
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right">${fmt(receipt.total_charged)}</td></tr>
  </table>
  <hr>
  <div class="c" style="font-size:12px;color:#555;margin-top:6px">Thank you! Please visit again.</div>
  <script>window.onload = function(){ window.focus(); window.print(); };</script>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=360,height=700,toolbar=no,menubar=no,scrollbars=yes');
  if (!win) {
    alert('Please allow pop-ups for this site to print receipts.');
    return;
  }
  win.document.write(html);
  win.document.close();
}
