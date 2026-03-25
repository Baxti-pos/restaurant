export const APP_PERMISSIONS = [
  "DASHBOARD_VIEW",
  "TABLES_VIEW",
  "TABLES_MANAGE",
  "ORDERS_VIEW",
  "ORDERS_MANAGE",
  "ORDERS_EDIT",
  "ORDERS_CLOSE",
  "PRODUCTS_VIEW",
  "PRODUCTS_MANAGE",
  "INVENTORY_VIEW",
  "INVENTORY_MANAGE",
  "EXPENSES_VIEW",
  "EXPENSES_MANAGE",
  "WAITERS_VIEW",
  "WAITERS_MANAGE",
  "REPORTS_VIEW"
] as const;

export type AppPermission = (typeof APP_PERMISSIONS)[number];

export const PREDEFINED_PERMISSIONS: Array<{
  key: AppPermission;
  label: string;
  description: string;
}> = [
  {
    key: "DASHBOARD_VIEW",
    label: "Dashboard",
    description: "Dashboard va asosiy statistikani korish"
  },
  {
    key: "TABLES_VIEW",
    label: "Stollarni korish",
    description: "Stollar royxati va holatini korish"
  },
  {
    key: "TABLES_MANAGE",
    label: "Stollarni boshqarish",
    description: "Stol yaratish, tahrirlash va ochirish"
  },
  {
    key: "ORDERS_VIEW",
    label: "Buyurtmalarni korish",
    description: "Buyurtmalar va ochiq orderlarni korish"
  },
  {
    key: "ORDERS_MANAGE",
    label: "Buyurtma yaratish",
    description: "Stol uchun buyurtma ochish va item qoshish"
  },
  {
    key: "ORDERS_EDIT",
    label: "Buyurtma tahriri",
    description: "Buyurtma itemlarini ozgartirish yoki ochirish"
  },
  {
    key: "ORDERS_CLOSE",
    label: "Buyurtmani yopish",
    description: "Tolov qabul qilib buyurtmani yopish"
  },
  {
    key: "PRODUCTS_VIEW",
    label: "Mahsulotlarni korish",
    description: "Mahsulot va kategoriya royxatini korish"
  },
  {
    key: "PRODUCTS_MANAGE",
    label: "Mahsulotlarni boshqarish",
    description: "Mahsulot va kategoriya yaratish hamda tahrirlash"
  },
  {
    key: "INVENTORY_VIEW",
    label: "Inventarni korish",
    description: "Ingredient, retsept va qoldiq malumotlarini korish"
  },
  {
    key: "INVENTORY_MANAGE",
    label: "Inventarni boshqarish",
    description: "Ingredient, retsept va kirimlarni boshqarish"
  },
  {
    key: "EXPENSES_VIEW",
    label: "Xarajatlarni korish",
    description: "Xarajatlar royxatini korish"
  },
  {
    key: "EXPENSES_MANAGE",
    label: "Xarajatlarni boshqarish",
    description: "Xarajat yaratish, tahrirlash va ochirish"
  },
  {
    key: "WAITERS_VIEW",
    label: "Girgittonlarni korish",
    description: "Girgittonlar royxatini korish"
  },
  {
    key: "WAITERS_MANAGE",
    label: "Girgittonlarni boshqarish",
    description: "Girgitton yaratish, tahrirlash va ochirish"
  },
  {
    key: "REPORTS_VIEW",
    label: "Hisobotlar",
    description: "Sotuv, oylik va girgitton faoliyati hisobotlarini korish"
  }
];

const permissionSet = new Set<string>(APP_PERMISSIONS);

export const isValidPermission = (value: unknown): value is AppPermission => {
  return typeof value === "string" && permissionSet.has(value);
};
