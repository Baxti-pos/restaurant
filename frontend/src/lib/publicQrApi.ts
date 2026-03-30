import { publicRequest, toNumber } from './http';
import {
  PublicMenuBootstrap,
  PublicQrOrderStatus,
  PublicQrOrderSubmitResult,
  PublicQrServiceRequestResult,
  PublicQrServiceRequestStatus,
  PublicQrSession
} from './types';

interface BackendBootstrap extends Omit<PublicMenuBootstrap, 'products'> {
  products: Array<{
    id: string;
    branchId: string;
    categoryId: string;
    categoryName: string;
    name: string;
    price: string | number;
    portionLabel?: string | null;
    imageUrl?: string | null;
    description?: string | null;
    sortOrder: number;
  }>;
}

const mapBootstrap = (data: BackendBootstrap): PublicMenuBootstrap => ({
  ...data,
  products: data.products.map((product) => ({
    ...product,
    price: toNumber(product.price),
    portionLabel: product.portionLabel ?? null,
    imageUrl: product.imageUrl ?? null,
    description: product.description ?? null
  }))
});

export const publicQrApi = {
  async bootstrap(qrToken: string): Promise<PublicMenuBootstrap> {
    const data = await publicRequest<BackendBootstrap>(`/public/qr/${qrToken}/bootstrap`);
    return mapBootstrap(data);
  },

  async createSession(qrToken: string, sessionKey?: string | null): Promise<PublicQrSession> {
    return publicRequest<PublicQrSession>(`/public/qr/${qrToken}/sessions`, {
      method: 'POST',
      body: JSON.stringify({ sessionKey: sessionKey ?? undefined })
    });
  },

  async createOrder(
    qrToken: string,
    payload: {
      sessionKey: string;
      clientRequestId: string;
      note?: string;
      items: Array<{ productId: string; quantity: number; note?: string }>;
    }
  ): Promise<PublicQrOrderSubmitResult> {
    const data = await publicRequest<PublicQrOrderSubmitResult>(`/public/qr/${qrToken}/orders`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return {
      ...data,
      subtotalAmount: data.subtotalAmount !== undefined ? toNumber(data.subtotalAmount) : undefined
    };
  },

  async getOrderStatus(qrToken: string, publicCode: string): Promise<PublicQrOrderStatus> {
    const data = await publicRequest<any>(`/public/qr/${qrToken}/orders/${publicCode}`);
    return {
      ...data,
      subtotalAmount: toNumber(data.subtotalAmount),
      items: data.items.map((item: any) => ({
        ...item,
        unitPrice: toNumber(item.unitPrice)
      }))
    };
  },

  async cancelOrder(qrToken: string, publicCode: string, sessionKey: string) {
    return publicRequest(`/public/qr/${qrToken}/orders/${publicCode}/cancel`, {
      method: 'POST',
      body: JSON.stringify({ sessionKey })
    });
  },

  async createServiceRequest(
    qrToken: string,
    payload: { sessionKey: string; note?: string }
  ): Promise<PublicQrServiceRequestResult> {
    return publicRequest<PublicQrServiceRequestResult>(`/public/qr/${qrToken}/service-requests`, {
      method: 'POST',
      body: JSON.stringify(payload)
    });
  },

  async getServiceRequestStatus(
    qrToken: string,
    publicCode: string
  ): Promise<PublicQrServiceRequestStatus> {
    return publicRequest<PublicQrServiceRequestStatus>(
      `/public/qr/${qrToken}/service-requests/${publicCode}`
    );
  }
};
