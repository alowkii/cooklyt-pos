export function printReceipt(receipt, currency) {
  const { symbol, rate, decimals } = currency;
  const fmt = (v) => `${symbol}${(parseFloat(v) * rate).toFixed(decimals)}`;

  const date = new Date(receipt.createdAt).toLocaleString('en-US', {
    timeZone: receipt.timezone,
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const location = receipt.channel === 'dining'
    ? (receipt.tableNumber ? `Table ${receipt.tableNumber}` : 'Dine-in')
    : (receipt.customerRef || receipt.channel.charAt(0).toUpperCase() + receipt.channel.slice(1));

  const itemsHtml = (receipt.items || []).map((item) =>
    `<tr>
      <td style="padding:2px 0;vertical-align:top">
        ${item.name} &times; ${item.quantity}
        ${item.notes ? `<br><span style="color:#777;font-size:11px">${item.notes}</span>` : ''}
      </td>
      <td style="text-align:right;padding:2px 0;vertical-align:top;white-space:nowrap">${fmt(item.price * item.quantity)}</td>
    </tr>`,
  ).join('');

  const discountRow = parseFloat(receipt.discountAmount) > 0
    ? `<tr>
        <td style="color:#15803d">Discount${receipt.discountType === 'percent' ? ` (${receipt.discountValue}%)` : ' (flat)'}</td>
        <td style="text-align:right;color:#15803d">&minus;${fmt(receipt.discountAmount)}</td>
      </tr>` : '';

  const taxRow = parseFloat(receipt.taxRate) > 0
    ? `<tr>
        <td>Tax (${+(parseFloat(receipt.taxRate) * 100).toFixed(4)}%)</td>
        <td style="text-align:right">${fmt(receipt.taxAmount)}</td>
      </tr>` : '';

  const scRow = parseFloat(receipt.serviceChargeRate) > 0
    ? `<tr>
        <td>Service charge (${+(parseFloat(receipt.serviceChargeRate) * 100).toFixed(4)}%)</td>
        <td style="text-align:right">${fmt(receipt.serviceChargeAmount)}</td>
      </tr>` : '';

  const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>Receipt #${receipt.token || receipt.order_id?.slice(-6).toUpperCase()}</title>
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
    <strong style="font-size:16px">${receipt.restaurantName || 'Restaurant'}</strong><br>
    <span class="lbl">Receipt</span>
  </div>
  <hr>
  <table>
    <tr><td class="lbl">Order</td><td style="text-align:right">#${(receipt.order_id || '').slice(-6).toUpperCase()}</td></tr>
    <tr><td class="lbl">Date</td><td style="text-align:right;font-size:12px">${date}</td></tr>
    <tr><td class="lbl">Type</td><td style="text-align:right;text-transform:capitalize">${location}</td></tr>
    <tr><td class="lbl">Payment</td><td style="text-align:right;text-transform:capitalize">${receipt.paymentMethod}</td></tr>
  </table>
  <hr>
  <table>${itemsHtml}</table>
  <hr>
  <table>
    <tr><td>Subtotal</td><td style="text-align:right">${fmt(receipt.subtotal)}</td></tr>
    ${discountRow}${taxRow}${scRow}
    <tr class="total-row"><td>TOTAL</td><td style="text-align:right">${fmt(receipt.totalCharged)}</td></tr>
  </table>
  <hr>
  <div class="c" style="font-size:12px;color:#555;margin-top:6px">Thank you! Please visit again.</div>
</body>
</html>`;

  const win = window.open('', '_blank', 'width=360,height=700,toolbar=no,menubar=no,scrollbars=yes');
  if (!win) {
    alert('Please allow pop-ups for this site to print receipts.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.onload = () => { win.focus(); win.print(); };
}
