import { OrderItem, PaymentType } from "./types";
import { formatCurrency } from "./formatters";

interface ReceiptPrintInput {
  branchName: string;
  tableName: string;
  waiterName: string;
  orderId: string;
  items: OrderItem[];
  total: number;
  paymentType: PaymentType;
  paidAtIso?: string;
}

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const paymentTypeLabel = (type: PaymentType) => {
  if (type === "cash") return "Naqd";
  if (type === "card") return "Karta";
  return "O'tkazma";
};

const formatDateTime = (iso?: string) => {
  const date = iso ? new Date(iso) : new Date();
  if (Number.isNaN(date.getTime())) {
    return new Date().toLocaleString("uz-UZ");
  }

  return date.toLocaleString("uz-UZ");
};

const buildReceiptHtml = (input: ReceiptPrintInput) => {
  const itemsHtml = input.items
    .map((item) => {
      const lineTotal = item.quantity * item.price;
      return `
      <tr>
        <td class="name">${escapeHtml(item.productName)}</td>
        <td class="qty">${item.quantity}</td>
        <td class="sum">${escapeHtml(formatCurrency(lineTotal))}</td>
      </tr>
    `;
    })
    .join("");

  return `
<!doctype html>
<html lang="uz">
  <head>
    <meta charset="utf-8" />
    <title>Check</title>
    <style>
      @page {
        size: 80mm auto;
        margin: 4mm;
      }

      html,
      body {
        margin: 0;
        padding: 0;
        width: 72mm;
        font-family: "Arial", sans-serif;
        color: #000;
      }

      body {
        font-size: 12px;
        line-height: 1.35;
      }

      .center {
        text-align: center;
      }

      .title {
        font-size: 16px;
        font-weight: 700;
        margin-bottom: 2px;
      }

      .muted {
        color: #333;
        font-size: 11px;
      }

      .line {
        border-top: 1px dashed #000;
        margin: 8px 0;
      }

      table {
        width: 100%;
        border-collapse: collapse;
      }

      td {
        padding: 2px 0;
        vertical-align: top;
      }

      td.name {
        width: 55%;
        word-break: break-word;
      }

      td.qty {
        width: 15%;
        text-align: center;
      }

      td.sum {
        width: 30%;
        text-align: right;
      }

      .total-row {
        font-size: 14px;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <div class="center">
      <div class="title">${escapeHtml(input.branchName)}</div>
      <div class="muted">Kassa checki</div>
    </div>

    <div class="line"></div>

    <div>Buyurtma: ${escapeHtml(input.orderId.slice(-8).toUpperCase())}</div>
    <div>Stol: ${escapeHtml(input.tableName)}</div>
    <div>Girgitton: ${escapeHtml(input.waiterName || "Noma'lum")}</div>
    <div>Sana: ${escapeHtml(formatDateTime(input.paidAtIso))}</div>
    <div>To'lov: ${escapeHtml(paymentTypeLabel(input.paymentType))}</div>

    <div class="line"></div>

    <table>
      ${itemsHtml}
      <tr class="total-row">
        <td class="name">Jami</td>
        <td class="qty"></td>
        <td class="sum">${escapeHtml(formatCurrency(input.total))}</td>
      </tr>
    </table>

    <div class="line"></div>
    <div class="center">Rahmat, yana keling</div>
  </body>
</html>
`;
};

export const printReceipt = async (input: ReceiptPrintInput) => {
  if (typeof window === "undefined" || typeof document === "undefined") {
    return;
  }

  const iframe = document.createElement("iframe");
  iframe.style.position = "fixed";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.setAttribute("aria-hidden", "true");

  document.body.appendChild(iframe);

  try {
    const frameWindow = iframe.contentWindow;
    const frameDocument = frameWindow?.document;

    if (!frameWindow || !frameDocument) {
      throw new Error("Print oynasi ochilmadi");
    }

    frameDocument.open();
    frameDocument.write(buildReceiptHtml(input));
    frameDocument.close();

    await new Promise<void>((resolve) => {
      if (frameDocument.readyState === "complete") {
        resolve();
        return;
      }

      iframe.onload = () => resolve();
      setTimeout(() => resolve(), 300);
    });

    frameWindow.focus();
    frameWindow.print();
  } finally {
    setTimeout(() => {
      iframe.remove();
    }, 1000);
  }
};
