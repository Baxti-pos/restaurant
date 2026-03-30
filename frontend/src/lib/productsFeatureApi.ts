import { authRequest, toNumber } from './http';
import { Product } from './types';

interface BackendProduct {
  id: string;
  branchId: string;
  categoryId: string;
  name: string;
  price: string | number;
  portionLabel?: string | null;
  imageUrl?: string | null;
  description?: string | null;
  isActive: boolean;
}

const mapProduct = (product: BackendProduct): Product => ({
  id: product.id,
  branchId: product.branchId,
  categoryId: product.categoryId,
  name: product.name,
  price: toNumber(product.price),
  portionLabel: product.portionLabel ?? null,
  imageUrl: product.imageUrl ?? null,
  description: product.description ?? null,
  isActive: product.isActive
});

export const productsFeatureApi = {
  async list(): Promise<Product[]> {
    const rows = await authRequest<BackendProduct[]>('/products');
    return rows.map(mapProduct);
  },

  async create(payload: {
    name: string;
    price: number;
    categoryId: string;
    portionLabel?: string | null;
    imageUrl?: string | null;
    description?: string | null;
    isActive: boolean;
  }): Promise<Product> {
    const created = await authRequest<BackendProduct>('/products', {
      method: 'POST',
      body: JSON.stringify(payload)
    });

    return mapProduct(created);
  },

  async update(
    id: string,
    payload: Partial<{
      name: string;
      price: number;
      categoryId: string;
      portionLabel: string | null;
      imageUrl: string | null;
      description: string | null;
      isActive: boolean;
    }>
  ): Promise<Product> {
    const updated = await authRequest<BackendProduct>(`/products/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(payload)
    });

    return mapProduct(updated);
  }
};
