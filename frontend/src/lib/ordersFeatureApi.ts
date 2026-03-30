import { authRequest, toNumber } from './http';
import { Order, OrderItem } from './types';

interface BackendOrderItem {
  id: string;
  productId: string | null;
  requestId?: string | null;
  guestSessionId?: string | null;
  productName: string;
  unitPrice: string | number;
  quantity: number;
  source?: 'STAFF' | 'QR_CUSTOMER';
  fulfillmentStatus?: 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELED';
  note?: string | null;
}

interface BackendOrder {
  id: string;
  branchId: string;
  tableId: string | null;
  waiterId: string | null;
  status: 'OPEN' | 'CLOSED' | 'CANCELLED';
  totalAmount: string | number;
  paymentMethod: 'CASH' | 'CARD' | 'TRANSFER' | 'MIXED' | null;
  openedAt: string;
  closedAt: string | null;
  table: {
    id: string;
    name: string;
  } | null;
  waiter: {
    id: string;
    fullName: string;
  } | null;
  items: BackendOrderItem[];
}

const mapOrderItem = (item: BackendOrderItem): OrderItem => ({
  id: item.id,
  productId: item.productId ?? '',
  requestId: item.requestId ?? undefined,
  guestSessionId: item.guestSessionId ?? undefined,
  productName: item.productName,
  quantity: item.quantity,
  price: toNumber(item.unitPrice),
  source: item.source,
  fulfillmentStatus: item.fulfillmentStatus,
  note: item.note ?? undefined
});

const mapPaymentType = (method: BackendOrder['paymentMethod']): Order['paymentType'] => {
  if (method === 'CASH') return 'cash';
  if (method === 'CARD') return 'card';
  if (method === 'TRANSFER') return 'transfer';
  return undefined;
};

const mapOrder = (order: BackendOrder): Order => ({
  id: order.id,
  branchId: order.branchId,
  tableId: order.tableId ?? order.table?.id ?? '',
  tableName: order.table?.name ?? 'Stol',
  waiterId: order.waiterId ?? order.waiter?.id ?? '',
  waiterName: order.waiter?.fullName ?? 'Noma\'lum',
  status: order.status === 'CLOSED' ? 'closed' : 'open',
  items: order.items.map(mapOrderItem),
  total: toNumber(order.totalAmount),
  paymentType: mapPaymentType(order.paymentMethod),
  createdAt: order.openedAt,
  closedAt: order.closedAt ?? undefined
});

export const ordersFeatureApi = {
  async getById(id: string): Promise<Order> {
    const order = await authRequest<BackendOrder>(`/orders/${id}`);
    return mapOrder(order);
  },

  async updateFulfillmentStatus(
    orderId: string,
    itemId: string,
    fulfillmentStatus: 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELED'
  ): Promise<Order> {
    const result = await authRequest<{ order: BackendOrder }>(
      `/orders/${orderId}/items/${itemId}/fulfillment-status`,
      {
        method: 'PATCH',
        body: JSON.stringify({ fulfillmentStatus })
      }
    );

    return mapOrder(result.order);
  }
};
