import { TableQrData } from './types';

export const printTableQr = (qr: TableQrData) => {
  const win = window.open('', '_blank', 'width=420,height=620');
  if (!win) {
    throw new Error('Print oynasini ochib bo\'lmadi');
  }

  const safeTitle = `${qr.tableName} QR`;

  win.document.write(`
    <!doctype html>
    <html lang="uz">
      <head>
        <meta charset="utf-8" />
        <title>${safeTitle}</title>
        <style>
          body { font-family: Arial, sans-serif; margin: 0; padding: 24px; color: #111827; }
          .card { border: 1px solid #e5e7eb; border-radius: 20px; padding: 24px; text-align: center; }
          .title { font-size: 28px; font-weight: 700; margin-bottom: 8px; }
          .subtitle { font-size: 14px; color: #6b7280; margin-bottom: 20px; }
          .qr { display: flex; justify-content: center; margin: 12px 0 20px; }
          .url { font-size: 11px; color: #6b7280; word-break: break-all; }
          .hint { font-size: 15px; font-weight: 600; margin-top: 16px; }
        </style>
      </head>
      <body>
        <div class="card">
          <div class="title">${qr.tableName}</div>
          <div class="subtitle">Buyurtma berish uchun skaner qiling</div>
          <div class="qr">${qr.svgMarkup}</div>
          <div class="hint">Baxti POS QR menyu</div>
          <div class="url">${qr.publicUrl}</div>
        </div>
      </body>
    </html>
  `);
  win.document.close();
  win.focus();
  win.print();
};
