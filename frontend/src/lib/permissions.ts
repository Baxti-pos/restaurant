import { User } from './types';

export const MANAGER_PERMISSIONS = [
  'DASHBOARD_VIEW',
  'TABLES_VIEW',
  'TABLES_MANAGE',
  'ORDERS_VIEW',
  'ORDERS_MANAGE',
  'ORDERS_EDIT',
  'ORDERS_CLOSE',
  'PRODUCTS_VIEW',
  'PRODUCTS_MANAGE',
  'EXPENSES_VIEW',
  'EXPENSES_MANAGE',
  'WAITERS_VIEW',
  'WAITERS_MANAGE',
  'REPORTS_VIEW'
] as const;

export type ManagerPermission = (typeof MANAGER_PERMISSIONS)[number];

export const MANAGER_PERMISSION_OPTIONS: Array<{
  key: ManagerPermission;
  label: string;
  description: string;
}> = [
  {
    key: 'DASHBOARD_VIEW',
    label: 'Dashboard',
    description: 'Dashboard va asosiy statistikani korish'
  },
  {
    key: 'TABLES_VIEW',
    label: 'Stollarni korish',
    description: 'Stollar royxati va holatini korish'
  },
  {
    key: 'TABLES_MANAGE',
    label: 'Stollarni boshqarish',
    description: 'Stol yaratish, tahrirlash va ochirish'
  },
  {
    key: 'ORDERS_VIEW',
    label: 'Buyurtmalarni korish',
    description: 'Buyurtmalar va ochiq orderlarni korish'
  },
  {
    key: 'ORDERS_MANAGE',
    label: 'Buyurtma yaratish',
    description: 'Stol uchun buyurtma ochish va item qoshish'
  },
  {
    key: 'ORDERS_EDIT',
    label: 'Buyurtma tahriri',
    description: 'Buyurtma itemlarini ozgartirish yoki ochirish'
  },
  {
    key: 'ORDERS_CLOSE',
    label: 'Buyurtmani yopish',
    description: 'Tolov qabul qilib buyurtmani yopish'
  },
  {
    key: 'PRODUCTS_VIEW',
    label: 'Mahsulotlarni korish',
    description: 'Mahsulot va kategoriya royxatini korish'
  },
  {
    key: 'PRODUCTS_MANAGE',
    label: 'Mahsulotlarni boshqarish',
    description: 'Mahsulot va kategoriya yaratish hamda tahrirlash'
  },
  {
    key: 'EXPENSES_VIEW',
    label: 'Xarajatlarni korish',
    description: 'Xarajatlar royxatini korish'
  },
  {
    key: 'EXPENSES_MANAGE',
    label: 'Xarajatlarni boshqarish',
    description: 'Xarajat yaratish, tahrirlash va ochirish'
  },
  {
    key: 'WAITERS_VIEW',
    label: 'Ofitsantlarni korish',
    description: 'Ofitsantlar royxatini korish'
  },
  {
    key: 'WAITERS_MANAGE',
    label: 'Ofitsantlarni boshqarish',
    description: 'Ofitsant yaratish, tahrirlash va ochirish'
  },
  {
    key: 'REPORTS_VIEW',
    label: 'Hisobotlar',
    description: 'Sotuv, oylik va ofitsant faoliyati hisobotlarini korish'
  }
];

export const hasPermission = (
  user: User | null | undefined,
  permission: ManagerPermission
) => {
  if (!user) return false;
  if (user.role === 'owner') return true;
  if (user.role !== 'manager') return false;
  return user.permissions.includes(permission);
};

export const hasAnyPermission = (
  user: User | null | undefined,
  permissions: ManagerPermission[]
) => {
  if (!user) return false;
  if (user.role === 'owner') return true;
  if (user.role !== 'manager') return false;

  return permissions.some((permission) => user.permissions.includes(permission));
};
