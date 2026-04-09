import { OrderItem, PaymentType } from "./types";
import { authRequest } from "./http";

export interface ReceiptPrintInput {
  branchName: string;
  tableName: string;
  waiterName?: string;
  orderId: string;
  items: OrderItem[];
  subtotal: number;
  commission?: number;
  commissionPercent?: number;
  total: number;
  paymentType: PaymentType;
  paidAtIso?: string;
  printerIp: string;
  printerPort?: number;
}

export const printReceipt = async (input: ReceiptPrintInput): Promise<void> => {
  await authRequest("/print/receipt", {
    method: "POST",
    body: JSON.stringify({
      branchName: input.branchName,
      tableName: input.tableName,
      waiterName: input.waiterName,
      orderId: input.orderId,
      items: input.items.map((i) => ({
        productName: i.productName,
        quantity: i.quantity,
        price: i.price,
      })),
      subtotal: input.subtotal,
      commission: input.commission ?? 0,
      commissionPercent: input.commissionPercent ?? 0,
      total: input.total,
      paymentType: input.paymentType,
      paidAtIso: input.paidAtIso,
    }),
  });
};
