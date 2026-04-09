import { createConnection } from "net";

// ── ESC/POS helpers ─────────────────────────────────────────────────────────
const ESC = 0x1b;
const GS  = 0x1d;
const LF  = 0x0a;

const cmd  = (...bytes: number[]) => Buffer.from(bytes);
const text = (s: string) => Buffer.from(s, "latin1");
const lf   = () => cmd(LF);

const INIT         = cmd(ESC, 0x40);
const ALIGN_LEFT   = cmd(ESC, 0x61, 0x00);
const ALIGN_CENTER = cmd(ESC, 0x61, 0x01);
const BOLD_ON      = cmd(ESC, 0x45, 0x01);
const BOLD_OFF     = cmd(ESC, 0x45, 0x00);
const DOUBLE_ON    = cmd(GS,  0x21, 0x11);
const DOUBLE_OFF   = cmd(GS,  0x21, 0x00);
const CUT          = cmd(GS,  0x56, 0x00);

const COLS = 42;

const line = (char = "-") => text(char.repeat(COLS));
const pad  = (left: string, right: string, total = COLS): string => {
  const gap = total - left.length - right.length;
  return gap > 0 ? left + " ".repeat(gap) + right : left.slice(0, total - right.length - 1) + " " + right;
};

// ── Receipt builder ──────────────────────────────────────────────────────────
export interface PrintReceiptInput {
  branchName: string;
  tableName: string;
  waiterName?: string;
  orderId: string;
  items: Array<{ productName: string; quantity: number; price: number }>;
  subtotal: number;
  commission?: number;
  commissionPercent?: number;
  total: number;
  paymentType: string;
  paidAtIso?: string;
  printerIp: string;
  printerPort?: number;
}

const formatCurrency = (n: number) => n.toLocaleString("uz-UZ") + " so'm";

const paymentLabel = (type: string) => {
  if (type === "cash")     return "Naqd";
  if (type === "card")     return "Karta";
  if (type === "transfer") return "O'tkazma";
  return "Aralash";
};

const formatDate = (iso?: string) => {
  const d = iso ? new Date(iso) : new Date();
  return d.toLocaleString("uz-UZ", { timeZone: "Asia/Tashkent" });
};

const buildEscPos = (input: PrintReceiptInput): Buffer => {
  const parts: Buffer[] = [
    INIT,
    ALIGN_CENTER,
    DOUBLE_ON, BOLD_ON,
    text(input.branchName.slice(0, 20)), lf(),
    DOUBLE_OFF, BOLD_OFF,
    text("Kassa checki"), lf(),
    lf(),
    ALIGN_LEFT,
    line(), lf(),
    text(`Buyurtma: #${input.orderId.slice(-6).toUpperCase()}`), lf(),
    text(`Stol    : ${input.tableName}`), lf(),
  ];

  if (input.waiterName) {
    parts.push(text(`Ofitsiant: ${input.waiterName}`), lf());
  }

  parts.push(
    text(`Sana    : ${formatDate(input.paidAtIso)}`), lf(),
    text(`To'lov  : ${paymentLabel(input.paymentType)}`), lf(),
    line(), lf(),
    BOLD_ON,
    text(pad("Mahsulot", "Jami")), lf(),
    BOLD_OFF,
    line(), lf(),
  );

  for (const item of input.items) {
    const lineTotal = item.quantity * item.price;
    const nameLine  = `${item.productName} x${item.quantity}`;
    const sumStr    = formatCurrency(lineTotal);
    if (nameLine.length + sumStr.length + 1 <= COLS) {
      parts.push(text(pad(nameLine, sumStr)), lf());
    } else {
      parts.push(text(item.productName.slice(0, COLS)), lf());
      parts.push(text(pad(`  x${item.quantity}`, sumStr)), lf());
    }
  }

  parts.push(line(), lf());

  if (input.commission && input.commission > 0) {
    parts.push(text(pad("Mahsulotlar:", formatCurrency(input.subtotal))), lf());
    parts.push(text(pad(`Xizmat (${input.commissionPercent ?? 0}%):`, `+${formatCurrency(input.commission)}`)), lf());
    parts.push(line(), lf());
  }

  parts.push(
    BOLD_ON,
    text(pad("JAMI:", formatCurrency(input.total))), lf(),
    BOLD_OFF,
    line(), lf(),
    ALIGN_CENTER,
    text("Rahmat, yana keling!"), lf(),
    lf(), lf(), lf(),
    CUT,
  );

  return Buffer.concat(parts);
};

// ── Send via TCP (port 9100) ─────────────────────────────────────────────────
const sendToNetwork = (host: string, port: number, data: Buffer): Promise<void> =>
  new Promise((resolve, reject) => {
    const client = createConnection({ host, port }, () => {
      client.write(data, (err) => {
        if (err) { client.destroy(); reject(err); return; }
        client.end();
        resolve();
      });
    });
    client.setTimeout(5000);
    client.on("timeout", () => { client.destroy(); reject(new Error("Printer connection timed out")); });
    client.on("error", reject);
  });

export const printService = {
  async printReceipt(input: PrintReceiptInput): Promise<void> {
    const escpos = buildEscPos(input);
    const port   = input.printerPort ?? 9100;
    await sendToNetwork(input.printerIp, port, escpos);
  }
};
