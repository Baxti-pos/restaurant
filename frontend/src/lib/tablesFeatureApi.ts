import { TableItem, TableQrData } from './types';
import { authRequest } from './http';

interface BackendTable {
  id: string;
  branchId: string;
  name: string;
  seatsCount?: number;
  status: 'AVAILABLE' | 'OCCUPIED' | 'DISABLED';
  qrEnabled?: boolean;
  selfOrderEnabled?: boolean;
  callWaiterEnabled?: boolean;
  qrPublicUrl?: string | null;
  qrVersion?: number;
  qrLastGeneratedAt?: string | null;
  qrLastScannedAt?: string | null;
  pendingQrOrdersCount?: number;
  activeServiceRequestsCount?: number;
  readyItemsCount?: number;
  currentOrderTotal?: string | number | null;
  currentOrderItemCount?: number;
  orders?: Array<{
    id: string;
    totalAmount?: string | number | null;
    waiterId?: string | null;
    waiter?: {
      id: string;
      fullName: string;
    } | null;
    items?: Array<{
      quantity: number;
      fulfillmentStatus?: 'ACCEPTED' | 'PREPARING' | 'READY' | 'SERVED' | 'CANCELED';
    }>;
  }>;
}

interface BackendTableQr {
  tableId: string;
  tableName: string;
  qrPublicToken: string;
  qrEnabled: boolean;
  selfOrderEnabled: boolean;
  callWaiterEnabled: boolean;
  qrVersion: number;
  qrLastGeneratedAt: string | null;
  publicUrl: string;
  svgMarkup: string;
}

interface BackendTableCreateResult extends BackendTable {
  qr: BackendTableQr;
}

const mapStatus = (status: BackendTable['status']): TableItem['status'] => {
  if (status === 'OCCUPIED') return 'occupied';
  if (status === 'DISABLED') return 'closing';
  return 'empty';
};

const toBackendStatus = (status?: TableItem['status']) => {
  if (status === 'occupied') return 'OCCUPIED';
  if (status === 'closing') return 'DISABLED';
  return 'AVAILABLE';
};

const mapTable = (table: BackendTable): TableItem => ({
  id: table.id,
  branchId: table.branchId,
  name: table.name,
  seatsCount: table.seatsCount ?? 4,
  status: mapStatus(table.status),
  currentOrderId: table.orders?.[0]?.id,
  currentOrderWaiterId: table.orders?.[0]?.waiter?.id ?? table.orders?.[0]?.waiterId ?? undefined,
  currentOrderWaiterName: table.orders?.[0]?.waiter?.fullName ?? undefined,
  qrEnabled: table.qrEnabled ?? true,
  selfOrderEnabled: table.selfOrderEnabled ?? true,
  callWaiterEnabled: table.callWaiterEnabled ?? true,
  qrPublicUrl: table.qrPublicUrl ?? null,
  qrVersion: table.qrVersion ?? 1,
  qrLastGeneratedAt: table.qrLastGeneratedAt ?? null,
  qrLastScannedAt: table.qrLastScannedAt ?? null,
  pendingQrOrdersCount: table.pendingQrOrdersCount ?? 0,
  activeServiceRequestsCount: table.activeServiceRequestsCount ?? 0,
  readyItemsCount: table.readyItemsCount ?? 0,
  currentOrderTotal:
    table.currentOrderTotal != null
      ? Number(table.currentOrderTotal)
      : table.orders?.[0]?.totalAmount != null
        ? Number(table.orders[0].totalAmount)
        : null,
  currentOrderItemCount:
    table.currentOrderItemCount ??
    table.orders?.[0]?.items?.reduce((sum, item) => sum + item.quantity, 0) ??
    0
});

const mapQr = (qr: BackendTableQr): TableQrData => ({
  ...qr,
  qrLastGeneratedAt: qr.qrLastGeneratedAt ?? null
});

const tableNameCollator = new Intl.Collator('uz', {
  numeric: true,
  sensitivity: 'base'
});

const sortTablesNaturally = (rows: TableItem[]) =>
  [...rows].sort((a, b) => tableNameCollator.compare(a.name, b.name));

export const tablesFeatureApi = {
  async list(): Promise<TableItem[]> {
    const rows = await authRequest<BackendTable[]>('/tables');
    return sortTablesNaturally(rows.filter((table) => table.status !== 'DISABLED').map(mapTable));
  },

  async create(payload: {
    name: string;
    seatsCount: number;
    status?: TableItem['status'];
    qrEnabled: boolean;
    selfOrderEnabled: boolean;
    callWaiterEnabled: boolean;
  }): Promise<{ table: TableItem; qr: TableQrData }> {
    const created = await authRequest<BackendTableCreateResult>('/tables', {
      method: 'POST',
      body: JSON.stringify({
        name: payload.name,
        seatsCount: payload.seatsCount,
        status: toBackendStatus(payload.status),
        qrEnabled: payload.qrEnabled,
        selfOrderEnabled: payload.selfOrderEnabled,
        callWaiterEnabled: payload.callWaiterEnabled
      })
    });

    return {
      table: mapTable(created),
      qr: mapQr(created.qr)
    };
  },

  async update(
    id: string,
    payload: {
      name?: string;
      seatsCount?: number;
      status?: TableItem['status'];
      qrEnabled?: boolean;
      selfOrderEnabled?: boolean;
      callWaiterEnabled?: boolean;
    }
  ): Promise<TableItem> {
    const body: Record<string, unknown> = {};
    if (payload.name !== undefined) body.name = payload.name;
    if (payload.seatsCount !== undefined) body.seatsCount = payload.seatsCount;
    if (payload.status !== undefined) body.status = toBackendStatus(payload.status);
    if (payload.qrEnabled !== undefined) body.qrEnabled = payload.qrEnabled;
    if (payload.selfOrderEnabled !== undefined) body.selfOrderEnabled = payload.selfOrderEnabled;
    if (payload.callWaiterEnabled !== undefined) body.callWaiterEnabled = payload.callWaiterEnabled;

    const updated = await authRequest<BackendTable>(`/tables/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(body)
    });

    return mapTable(updated);
  },

  async delete(id: string) {
    await authRequest(`/tables/${id}`, {
      method: 'DELETE'
    });
  },

  async getQr(id: string): Promise<TableQrData> {
    const qr = await authRequest<BackendTableQr>(`/tables/${id}/qr`);
    return mapQr(qr);
  },

  async regenerateQr(id: string): Promise<TableQrData> {
    const qr = await authRequest<BackendTableQr>(`/tables/${id}/qr/regenerate`, {
      method: 'POST'
    });
    return mapQr(qr);
  }
};
