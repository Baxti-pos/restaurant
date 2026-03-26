import { authRequest, toNumber } from './http';
import { GuestRequestsOverview, Order } from './types';
import { ordersFeatureApi } from './ordersFeatureApi';

interface BackendPendingOrder {
  id: string;
  publicCode: string;
  note?: string | null;
  createdAt: string;
  subtotalAmount: string | number;
  itemCount: number;
  table: {
    id: string;
    name: string;
  };
  items?: Array<{
    id: string;
    productName: string;
    portionLabel?: string | null;
    imageUrl?: string | null;
    quantity: number;
    unitPrice: string | number;
    note?: string | null;
  }>;
}

interface BackendServiceRequest {
  id: string;
  publicCode: string;
  note?: string | null;
  status: 'PENDING' | 'ACKNOWLEDGED' | 'COMPLETED' | 'CANCELED';
  createdAt: string;
  table: {
    id: string;
    name: string;
  };
}

interface BackendOverview {
  pendingOrders: BackendPendingOrder[];
  activeServiceRequests: BackendServiceRequest[];
}

interface BackendAcceptResult {
  order: Parameters<typeof ordersFeatureApi['getById']>[0] extends never ? never : any;
  branchId: string;
  tableId: string;
  tableName: string;
  requestId: string;
  tableStatusChanged: boolean;
}

const mapOverview = (data: BackendOverview): GuestRequestsOverview => ({
  pendingOrders: data.pendingOrders.map((request) => ({
    id: request.id,
    publicCode: request.publicCode,
    note: request.note ?? null,
    createdAt: request.createdAt,
    subtotalAmount: toNumber(request.subtotalAmount),
    itemCount: request.itemCount,
    table: request.table,
    items: request.items?.map((item) => ({
      id: item.id,
      productName: item.productName,
      portionLabel: item.portionLabel ?? null,
      imageUrl: item.imageUrl ?? null,
      quantity: item.quantity,
      unitPrice: toNumber(item.unitPrice),
      note: item.note ?? null
    }))
  })),
  activeServiceRequests: data.activeServiceRequests.map((request) => ({
    id: request.id,
    publicCode: request.publicCode,
    note: request.note ?? null,
    status: request.status,
    createdAt: request.createdAt,
    table: request.table
  }))
});

export const guestRequestsApi = {
  async listOverview(): Promise<GuestRequestsOverview> {
    const data = await authRequest<BackendOverview>('/guest-requests/overview');
    return mapOverview(data);
  },

  async getTableInbox(tableId: string): Promise<GuestRequestsOverview> {
    const data = await authRequest<BackendOverview>(`/guest-requests/tables/${tableId}`);
    return mapOverview(data);
  },

  async acceptOrder(requestId: string): Promise<{ order: Order }> {
    const result = await authRequest<BackendAcceptResult>(`/guest-requests/orders/${requestId}/accept`, {
      method: 'POST'
    });

    const order = await ordersFeatureApi.getById(result.order.id);
    return { order };
  },

  async rejectOrder(requestId: string, reason?: string) {
    await authRequest(`/guest-requests/orders/${requestId}/reject`, {
      method: 'POST',
      body: JSON.stringify({ reason: reason?.trim() || undefined })
    });
  },

  async acknowledgeServiceRequest(requestId: string) {
    await authRequest(`/guest-requests/service-requests/${requestId}/acknowledge`, {
      method: 'POST'
    });
  },

  async completeServiceRequest(requestId: string) {
    await authRequest(`/guest-requests/service-requests/${requestId}/complete`, {
      method: 'POST'
    });
  }
};
