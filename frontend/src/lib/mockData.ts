import {
  Branch,
  Waiter,
  TableItem,
  Category,
  Product,
  Order,
  Expense,
  User } from
'./types';

export const mockOwner: User = {
  id: 'u1',
  name: 'Alisher Karimov',
  phone: '+998901234567',
  role: 'owner',
  permissions: []
};

export const mockBranches: Branch[] = [
{
  id: 'b1',
  name: 'Chilonzor filiali',
  address: "Chilonzor tumani, Bunyodkor ko'chasi 15-uy",
  shiftStart: '08:00',
  shiftEnd: '23:00',
  timezone: 'Asia/Tashkent',
  isActive: true
},
{
  id: 'b2',
  name: 'Yunusobod filiali',
  address: "Yunusobod tumani, Amir Temur shoh ko'chasi 22-uy",
  shiftStart: '09:00',
  shiftEnd: '22:00',
  timezone: 'Asia/Tashkent',
  isActive: true
},
{
  id: 'b3',
  name: "Mirzo Ulug'bek filiali",
  address: "Mirzo Ulug'bek tumani, Mustaqillik ko'chasi 7-uy",
  shiftStart: '08:00',
  shiftEnd: '22:00',
  timezone: 'Asia/Tashkent',
  isActive: true
}];


export const mockWaiters: Waiter[] = [
{
  id: 'w1',
  branchId: 'b1',
  name: 'Jasur Toshmatov',
  phone: '+998901234567',
  telegramId: '@jasur_t',
  isEnabled: true,
  salesSharePercent: 8,
  shiftStatus: 'active',
  createdAt: '2025-01-15T08:00:00Z'
},
{
  id: 'w2',
  branchId: 'b1',
  name: 'Malika Yusupova',
  phone: '+998909876543',
  telegramId: '@malika_y',
  isEnabled: true,
  salesSharePercent: 8,
  shiftStatus: 'active',
  createdAt: '2025-01-20T08:00:00Z'
},
{
  id: 'w3',
  branchId: 'b1',
  name: 'Bobur Rahimov',
  phone: '+998935554433',
  telegramId: '@bobur_r',
  isEnabled: false,
  salesSharePercent: 8,
  shiftStatus: 'not_started',
  createdAt: '2025-02-01T08:00:00Z'
},
{
  id: 'w4',
  branchId: 'b1',
  name: 'Dilnoza Hasanova',
  phone: '+998911223344',
  telegramId: '@dilnoza_h',
  isEnabled: true,
  salesSharePercent: 8,
  shiftStatus: 'ended',
  createdAt: '2025-02-10T08:00:00Z'
},
{
  id: 'w5',
  branchId: 'b2',
  name: 'Sardor Mirzayev',
  phone: '+998997778899',
  telegramId: '@sardor_m',
  isEnabled: true,
  salesSharePercent: 8,
  shiftStatus: 'active',
  createdAt: '2025-01-10T08:00:00Z'
},
{
  id: 'w6',
  branchId: 'b2',
  name: 'Zulfiya Nazarova',
  phone: '+998946665544',
  telegramId: '@zulfiya_n',
  isEnabled: true,
  salesSharePercent: 8,
  shiftStatus: 'not_started',
  createdAt: '2025-01-25T08:00:00Z'
},
{
  id: 'w7',
  branchId: 'b3',
  name: 'Otabek Qodirov',
  phone: '+998901112233',
  telegramId: '@otabek_q',
  isEnabled: true,
  salesSharePercent: 8,
  shiftStatus: 'active',
  createdAt: '2025-02-05T08:00:00Z'
}];


export const mockTables: TableItem[] = [
{
  id: 't1',
  branchId: 'b1',
  name: 'T-1',
  status: 'occupied',
  currentOrderId: 'o1'
},
{ id: 't2', branchId: 'b1', name: 'T-2', status: 'empty' },
{ id: 't3', branchId: 'b1', name: 'T-3', status: 'empty' },
{
  id: 't4',
  branchId: 'b1',
  name: 'T-4',
  status: 'closing',
  currentOrderId: 'o2'
},
{
  id: 't5',
  branchId: 'b1',
  name: 'T-5',
  status: 'occupied',
  currentOrderId: 'o3'
},
{ id: 't6', branchId: 'b1', name: 'T-6', status: 'empty' },
{ id: 't7', branchId: 'b1', name: 'T-7', status: 'empty' },
{ id: 't8', branchId: 'b1', name: 'T-8', status: 'empty' },
{ id: 't9', branchId: 'b2', name: 'T-1', status: 'empty' },
{
  id: 't10',
  branchId: 'b2',
  name: 'T-2',
  status: 'occupied',
  currentOrderId: 'o4'
},
{ id: 't11', branchId: 'b2', name: 'T-3', status: 'empty' },
{ id: 't12', branchId: 'b3', name: 'T-1', status: 'empty' },
{
  id: 't13',
  branchId: 'b3',
  name: 'T-2',
  status: 'occupied',
  currentOrderId: 'o5'
}];


export const mockCategories: Category[] = [
{ id: 'c1', branchId: 'b1', name: 'Salatlar', sortOrder: 1 },
{ id: 'c2', branchId: 'b1', name: 'Birinchi taomlar', sortOrder: 2 },
{ id: 'c3', branchId: 'b1', name: 'Ikkinchi taomlar', sortOrder: 3 },
{ id: 'c4', branchId: 'b1', name: 'Ichimliklar', sortOrder: 4 },
{ id: 'c5', branchId: 'b1', name: 'Shirinliklar', sortOrder: 5 },
{ id: 'c6', branchId: 'b2', name: 'Salatlar', sortOrder: 1 },
{ id: 'c7', branchId: 'b2', name: 'Asosiy taomlar', sortOrder: 2 },
{ id: 'c8', branchId: 'b2', name: 'Ichimliklar', sortOrder: 3 },
{ id: 'c9', branchId: 'b3', name: 'Milliy taomlar', sortOrder: 1 },
{ id: 'c10', branchId: 'b3', name: 'Ichimliklar', sortOrder: 2 }];


export const mockProducts: Product[] = [
{
  id: 'p1',
  branchId: 'b1',
  categoryId: 'c1',
  name: 'Sezar salati',
  price: 45000,
  isActive: true
},
{
  id: 'p2',
  branchId: 'b1',
  categoryId: 'c1',
  name: 'Yunon salati',
  price: 38000,
  isActive: true
},
{
  id: 'p3',
  branchId: 'b1',
  categoryId: 'c1',
  name: 'Olivye salati',
  price: 32000,
  isActive: true
},
{
  id: 'p4',
  branchId: 'b1',
  categoryId: 'c2',
  name: 'Mastava',
  price: 32000,
  isActive: true
},
{
  id: 'p5',
  branchId: 'b1',
  categoryId: 'c2',
  name: "Sho'rva",
  price: 35000,
  isActive: true
},
{
  id: 'p6',
  branchId: 'b1',
  categoryId: 'c3',
  name: 'Osh (Palov)',
  price: 40000,
  isActive: true
},
{
  id: 'p7',
  branchId: 'b1',
  categoryId: 'c3',
  name: 'Qozon kabob',
  price: 65000,
  isActive: true
},
{
  id: 'p8',
  branchId: 'b1',
  categoryId: 'c3',
  name: 'Steyk',
  price: 120000,
  isActive: true
},
{
  id: 'p9',
  branchId: 'b1',
  categoryId: 'c4',
  name: 'Coca-Cola 1L',
  price: 15000,
  isActive: true
},
{
  id: 'p10',
  branchId: 'b1',
  categoryId: 'c4',
  name: "Choy (qora/ko'k)",
  price: 5000,
  isActive: true
},
{
  id: 'p11',
  branchId: 'b1',
  categoryId: 'c5',
  name: 'Cheesecake',
  price: 35000,
  isActive: true
},
{
  id: 'p12',
  branchId: 'b1',
  categoryId: 'c5',
  name: 'Napaleon',
  price: 30000,
  isActive: false
},
{
  id: 'p13',
  branchId: 'b2',
  categoryId: 'c6',
  name: 'Toshkent salati',
  price: 28000,
  isActive: true
},
{
  id: 'p14',
  branchId: 'b2',
  categoryId: 'c7',
  name: "Lag'mon",
  price: 38000,
  isActive: true
},
{
  id: 'p15',
  branchId: 'b2',
  categoryId: 'c8',
  name: 'Limonad',
  price: 12000,
  isActive: true
},
{
  id: 'p16',
  branchId: 'b3',
  categoryId: 'c9',
  name: 'Dimlama',
  price: 55000,
  isActive: true
},
{
  id: 'p17',
  branchId: 'b3',
  categoryId: 'c10',
  name: 'Ayron',
  price: 8000,
  isActive: true
}];


const now = new Date();
const todayStr = now.toISOString().split('T')[0];

function daysAgo(n: number): string {
  const d = new Date(now);
  d.setDate(d.getDate() - n);
  return d.toISOString().split('T')[0];
}

function isoAt(daysBack: number, hour: number, minute = 0): string {
  const d = new Date(now);
  d.setDate(d.getDate() - daysBack);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
}

export const mockOrders: Order[] = [
// ── TODAY (open) ──────────────────────────────────────────────────────────
{
  id: 'o1',
  branchId: 'b1',
  tableId: 't1',
  tableName: 'T-1',
  waiterId: 'w1',
  waiterName: 'Jasur Toshmatov',
  status: 'open',
  items: [
  {
    id: 'oi1',
    productId: 'p1',
    productName: 'Sezar salati',
    price: 45000,
    quantity: 2
  },
  {
    id: 'oi2',
    productId: 'p9',
    productName: 'Coca-Cola 1L',
    price: 15000,
    quantity: 2
  },
  {
    id: 'oi3',
    productId: 'p7',
    productName: 'Qozon kabob',
    price: 65000,
    quantity: 1
  }],

  total: 185000,
  createdAt: isoAt(0, 11, 30)
},
{
  id: 'o2',
  branchId: 'b1',
  tableId: 't4',
  tableName: 'T-4',
  waiterId: 'w2',
  waiterName: 'Malika Yusupova',
  status: 'open',
  items: [
  {
    id: 'oi4',
    productId: 'p6',
    productName: 'Osh (Palov)',
    price: 40000,
    quantity: 4
  },
  {
    id: 'oi5',
    productId: 'p10',
    productName: 'Choy',
    price: 5000,
    quantity: 4
  }],

  total: 180000,
  createdAt: isoAt(0, 12, 0)
},
{
  id: 'o3',
  branchId: 'b1',
  tableId: 't5',
  tableName: 'T-5',
  waiterId: 'w1',
  waiterName: 'Jasur Toshmatov',
  status: 'open',
  items: [
  {
    id: 'oi6',
    productId: 'p8',
    productName: 'Steyk',
    price: 120000,
    quantity: 2
  },
  {
    id: 'oi7',
    productId: 'p2',
    productName: 'Yunon salati',
    price: 38000,
    quantity: 2
  }],

  total: 316000,
  createdAt: isoAt(0, 13, 15)
},

// ── TODAY (closed) ────────────────────────────────────────────────────────
{
  id: 'o6',
  branchId: 'b1',
  tableId: 't2',
  tableName: 'T-2',
  waiterId: 'w2',
  waiterName: 'Malika Yusupova',
  status: 'closed',
  paymentType: 'cash',
  items: [
  {
    id: 'oi11',
    productId: 'p6',
    productName: 'Osh (Palov)',
    price: 40000,
    quantity: 2
  },
  {
    id: 'oi12',
    productId: 'p9',
    productName: 'Coca-Cola 1L',
    price: 15000,
    quantity: 2
  }],

  total: 110000,
  createdAt: isoAt(0, 9, 0),
  closedAt: isoAt(0, 10, 0)
},
{
  id: 'o7',
  branchId: 'b1',
  tableId: 't3',
  tableName: 'T-3',
  waiterId: 'w1',
  waiterName: 'Jasur Toshmatov',
  status: 'closed',
  paymentType: 'card',
  items: [
  {
    id: 'oi13',
    productId: 'p7',
    productName: 'Qozon kabob',
    price: 65000,
    quantity: 3
  },
  {
    id: 'oi14',
    productId: 'p10',
    productName: 'Choy',
    price: 5000,
    quantity: 3
  }],

  total: 210000,
  createdAt: isoAt(0, 10, 0),
  closedAt: isoAt(0, 11, 0)
},
{
  id: 'o8',
  branchId: 'b1',
  tableId: 't6',
  tableName: 'T-6',
  waiterId: 'w2',
  waiterName: 'Malika Yusupova',
  status: 'closed',
  paymentType: 'transfer',
  items: [
  {
    id: 'oi15',
    productId: 'p8',
    productName: 'Steyk',
    price: 120000,
    quantity: 1
  },
  {
    id: 'oi16',
    productId: 'p11',
    productName: 'Cheesecake',
    price: 35000,
    quantity: 2
  }],

  total: 190000,
  createdAt: isoAt(0, 8, 0),
  closedAt: isoAt(0, 9, 0)
},

// ── 1 DAY AGO ─────────────────────────────────────────────────────────────
{
  id: 'o9',
  branchId: 'b1',
  tableId: 't1',
  tableName: 'T-1',
  waiterId: 'w1',
  waiterName: 'Jasur Toshmatov',
  status: 'closed',
  paymentType: 'cash',
  items: [
  {
    id: 'oi17',
    productId: 'p6',
    productName: 'Osh (Palov)',
    price: 40000,
    quantity: 3
  },
  {
    id: 'oi18',
    productId: 'p4',
    productName: 'Mastava',
    price: 32000,
    quantity: 2
  },
  {
    id: 'oi19',
    productId: 'p10',
    productName: 'Choy',
    price: 5000,
    quantity: 5
  }],

  total: 209000,
  createdAt: isoAt(1, 12, 0),
  closedAt: isoAt(1, 13, 0)
},
{
  id: 'o10',
  branchId: 'b1',
  tableId: 't2',
  tableName: 'T-2',
  waiterId: 'w2',
  waiterName: 'Malika Yusupova',
  status: 'closed',
  paymentType: 'card',
  items: [
  {
    id: 'oi20',
    productId: 'p1',
    productName: 'Sezar salati',
    price: 45000,
    quantity: 2
  },
  {
    id: 'oi21',
    productId: 'p7',
    productName: 'Qozon kabob',
    price: 65000,
    quantity: 2
  },
  {
    id: 'oi22',
    productId: 'p9',
    productName: 'Coca-Cola 1L',
    price: 15000,
    quantity: 4
  }],

  total: 280000,
  createdAt: isoAt(1, 14, 0),
  closedAt: isoAt(1, 15, 0)
},
{
  id: 'o11',
  branchId: 'b1',
  tableId: 't3',
  tableName: 'T-3',
  waiterId: 'w1',
  waiterName: 'Jasur Toshmatov',
  status: 'closed',
  paymentType: 'cash',
  items: [
  {
    id: 'oi23',
    productId: 'p8',
    productName: 'Steyk',
    price: 120000,
    quantity: 2
  },
  {
    id: 'oi24',
    productId: 'p3',
    productName: 'Olivye salati',
    price: 32000,
    quantity: 2
  }],

  total: 304000,
  createdAt: isoAt(1, 18, 0),
  closedAt: isoAt(1, 19, 30)
},

// ── 2 DAYS AGO ────────────────────────────────────────────────────────────
{
  id: 'o12',
  branchId: 'b1',
  tableId: 't4',
  tableName: 'T-4',
  waiterId: 'w2',
  waiterName: 'Malika Yusupova',
  status: 'closed',
  paymentType: 'transfer',
  items: [
  {
    id: 'oi25',
    productId: 'p6',
    productName: 'Osh (Palov)',
    price: 40000,
    quantity: 5
  },
  {
    id: 'oi26',
    productId: 'p5',
    productName: "Sho'rva",
    price: 35000,
    quantity: 3
  },
  {
    id: 'oi27',
    productId: 'p10',
    productName: 'Choy',
    price: 5000,
    quantity: 5
  }],

  total: 330000,
  createdAt: isoAt(2, 13, 0),
  closedAt: isoAt(2, 14, 0)
},
{
  id: 'o13',
  branchId: 'b1',
  tableId: 't5',
  tableName: 'T-5',
  waiterId: 'w1',
  waiterName: 'Jasur Toshmatov',
  status: 'closed',
  paymentType: 'cash',
  items: [
  {
    id: 'oi28',
    productId: 'p7',
    productName: 'Qozon kabob',
    price: 65000,
    quantity: 2
  },
  {
    id: 'oi29',
    productId: 'p11',
    productName: 'Cheesecake',
    price: 35000,
    quantity: 3
  },
  {
    id: 'oi30',
    productId: 'p9',
    productName: 'Coca-Cola 1L',
    price: 15000,
    quantity: 3
  }],

  total: 280000,
  createdAt: isoAt(2, 19, 0),
  closedAt: isoAt(2, 20, 30)
},

// ── 3 DAYS AGO ────────────────────────────────────────────────────────────
{
  id: 'o14',
  branchId: 'b1',
  tableId: 't1',
  tableName: 'T-1',
  waiterId: 'w2',
  waiterName: 'Malika Yusupova',
  status: 'closed',
  paymentType: 'card',
  items: [
  {
    id: 'oi31',
    productId: 'p8',
    productName: 'Steyk',
    price: 120000,
    quantity: 3
  },
  {
    id: 'oi32',
    productId: 'p1',
    productName: 'Sezar salati',
    price: 45000,
    quantity: 3
  },
  {
    id: 'oi33',
    productId: 'p9',
    productName: 'Coca-Cola 1L',
    price: 15000,
    quantity: 3
  }],

  total: 540000,
  createdAt: isoAt(3, 12, 30),
  closedAt: isoAt(3, 14, 0)
},
{
  id: 'o15',
  branchId: 'b1',
  tableId: 't2',
  tableName: 'T-2',
  waiterId: 'w1',
  waiterName: 'Jasur Toshmatov',
  status: 'closed',
  paymentType: 'cash',
  items: [
  {
    id: 'oi34',
    productId: 'p4',
    productName: 'Mastava',
    price: 32000,
    quantity: 4
  },
  {
    id: 'oi35',
    productId: 'p2',
    productName: 'Yunon salati',
    price: 38000,
    quantity: 2
  },
  {
    id: 'oi36',
    productId: 'p10',
    productName: 'Choy',
    price: 5000,
    quantity: 4
  }],

  total: 224000,
  createdAt: isoAt(3, 17, 0),
  closedAt: isoAt(3, 18, 0)
},

// ── 4 DAYS AGO ────────────────────────────────────────────────────────────
{
  id: 'o16',
  branchId: 'b1',
  tableId: 't3',
  tableName: 'T-3',
  waiterId: 'w2',
  waiterName: 'Malika Yusupova',
  status: 'closed',
  paymentType: 'cash',
  items: [
  {
    id: 'oi37',
    productId: 'p6',
    productName: 'Osh (Palov)',
    price: 40000,
    quantity: 6
  },
  {
    id: 'oi38',
    productId: 'p5',
    productName: "Sho'rva",
    price: 35000,
    quantity: 2
  },
  {
    id: 'oi39',
    productId: 'p10',
    productName: 'Choy',
    price: 5000,
    quantity: 6
  }],

  total: 380000,
  createdAt: isoAt(4, 11, 0),
  closedAt: isoAt(4, 12, 30)
},
{
  id: 'o17',
  branchId: 'b1',
  tableId: 't6',
  tableName: 'T-6',
  waiterId: 'w1',
  waiterName: 'Jasur Toshmatov',
  status: 'closed',
  paymentType: 'transfer',
  items: [
  {
    id: 'oi40',
    productId: 'p7',
    productName: 'Qozon kabob',
    price: 65000,
    quantity: 4
  },
  {
    id: 'oi41',
    productId: 'p3',
    productName: 'Olivye salati',
    price: 32000,
    quantity: 3
  },
  {
    id: 'oi42',
    productId: 'p9',
    productName: 'Coca-Cola 1L',
    price: 15000,
    quantity: 4
  }],

  total: 412000,
  createdAt: isoAt(4, 19, 30),
  closedAt: isoAt(4, 21, 0)
},

// ── 5 DAYS AGO ────────────────────────────────────────────────────────────
{
  id: 'o18',
  branchId: 'b1',
  tableId: 't1',
  tableName: 'T-1',
  waiterId: 'w1',
  waiterName: 'Jasur Toshmatov',
  status: 'closed',
  paymentType: 'card',
  items: [
  {
    id: 'oi43',
    productId: 'p8',
    productName: 'Steyk',
    price: 120000,
    quantity: 2
  },
  {
    id: 'oi44',
    productId: 'p11',
    productName: 'Cheesecake',
    price: 35000,
    quantity: 4
  },
  {
    id: 'oi45',
    productId: 'p10',
    productName: 'Choy',
    price: 5000,
    quantity: 4
  }],

  total: 400000,
  createdAt: isoAt(5, 13, 0),
  closedAt: isoAt(5, 14, 30)
},
{
  id: 'o19',
  branchId: 'b1',
  tableId: 't4',
  tableName: 'T-4',
  waiterId: 'w2',
  waiterName: 'Malika Yusupova',
  status: 'closed',
  paymentType: 'cash',
  items: [
  {
    id: 'oi46',
    productId: 'p1',
    productName: 'Sezar salati',
    price: 45000,
    quantity: 3
  },
  {
    id: 'oi47',
    productId: 'p4',
    productName: 'Mastava',
    price: 32000,
    quantity: 3
  },
  {
    id: 'oi48',
    productId: 'p9',
    productName: 'Coca-Cola 1L',
    price: 15000,
    quantity: 3
  }],

  total: 276000,
  createdAt: isoAt(5, 18, 0),
  closedAt: isoAt(5, 19, 30)
},

// ── 6 DAYS AGO ────────────────────────────────────────────────────────────
{
  id: 'o20',
  branchId: 'b1',
  tableId: 't2',
  tableName: 'T-2',
  waiterId: 'w1',
  waiterName: 'Jasur Toshmatov',
  status: 'closed',
  paymentType: 'cash',
  items: [
  {
    id: 'oi49',
    productId: 'p6',
    productName: 'Osh (Palov)',
    price: 40000,
    quantity: 4
  },
  {
    id: 'oi50',
    productId: 'p7',
    productName: 'Qozon kabob',
    price: 65000,
    quantity: 2
  },
  {
    id: 'oi51',
    productId: 'p10',
    productName: 'Choy',
    price: 5000,
    quantity: 4
  }],

  total: 310000,
  createdAt: isoAt(6, 12, 0),
  closedAt: isoAt(6, 13, 30)
},
{
  id: 'o21',
  branchId: 'b1',
  tableId: 't5',
  tableName: 'T-5',
  waiterId: 'w2',
  waiterName: 'Malika Yusupova',
  status: 'closed',
  paymentType: 'card',
  items: [
  {
    id: 'oi52',
    productId: 'p8',
    productName: 'Steyk',
    price: 120000,
    quantity: 1
  },
  {
    id: 'oi53',
    productId: 'p2',
    productName: 'Yunon salati',
    price: 38000,
    quantity: 3
  },
  {
    id: 'oi54',
    productId: 'p11',
    productName: 'Cheesecake',
    price: 35000,
    quantity: 2
  }],

  total: 304000,
  createdAt: isoAt(6, 19, 0),
  closedAt: isoAt(6, 20, 30)
},

// ── 7 DAYS AGO ────────────────────────────────────────────────────────────
{
  id: 'o22',
  branchId: 'b1',
  tableId: 't3',
  tableName: 'T-3',
  waiterId: 'w1',
  waiterName: 'Jasur Toshmatov',
  status: 'closed',
  paymentType: 'transfer',
  items: [
  {
    id: 'oi55',
    productId: 'p6',
    productName: 'Osh (Palov)',
    price: 40000,
    quantity: 5
  },
  {
    id: 'oi56',
    productId: 'p5',
    productName: "Sho'rva",
    price: 35000,
    quantity: 4
  },
  {
    id: 'oi57',
    productId: 'p9',
    productName: 'Coca-Cola 1L',
    price: 15000,
    quantity: 5
  }],

  total: 415000,
  createdAt: isoAt(7, 11, 30),
  closedAt: isoAt(7, 13, 0)
},
{
  id: 'o23',
  branchId: 'b1',
  tableId: 't6',
  tableName: 'T-6',
  waiterId: 'w2',
  waiterName: 'Malika Yusupova',
  status: 'closed',
  paymentType: 'cash',
  items: [
  {
    id: 'oi58',
    productId: 'p7',
    productName: 'Qozon kabob',
    price: 65000,
    quantity: 3
  },
  {
    id: 'oi59',
    productId: 'p1',
    productName: 'Sezar salati',
    price: 45000,
    quantity: 2
  },
  {
    id: 'oi60',
    productId: 'p10',
    productName: 'Choy',
    price: 5000,
    quantity: 3
  }],

  total: 300000,
  createdAt: isoAt(7, 18, 0),
  closedAt: isoAt(7, 19, 30)
},

// ── OTHER BRANCHES (open) ─────────────────────────────────────────────────
{
  id: 'o4',
  branchId: 'b2',
  tableId: 't10',
  tableName: 'T-2',
  waiterId: 'w5',
  waiterName: 'Sardor Mirzayev',
  status: 'open',
  items: [
  {
    id: 'oi8',
    productId: 'p14',
    productName: "Lag'mon",
    price: 38000,
    quantity: 3
  },
  {
    id: 'oi9',
    productId: 'p15',
    productName: 'Limonad',
    price: 12000,
    quantity: 3
  }],

  total: 150000,
  createdAt: isoAt(0, 14, 0)
},
{
  id: 'o5',
  branchId: 'b3',
  tableId: 't13',
  tableName: 'T-2',
  waiterId: 'w7',
  waiterName: 'Otabek Qodirov',
  status: 'open',
  items: [
  {
    id: 'oi10',
    productId: 'p16',
    productName: 'Dimlama',
    price: 55000,
    quantity: 2
  }],

  total: 110000,
  createdAt: isoAt(0, 15, 0)
}];


export const mockExpenses: Expense[] = [
{
  id: 'e1',
  branchId: 'b1',
  type: 'market',
  name: "Go'sht xaridi",
  amount: 1200000,
  note: 'Bozordan',
  date: todayStr,
  createdAt: new Date().toISOString()
},
{
  id: 'e2',
  branchId: 'b1',
  type: 'market',
  name: 'Sabzavotlar',
  amount: 450000,
  date: todayStr,
  createdAt: new Date().toISOString()
},
{
  id: 'e3',
  branchId: 'b1',
  type: 'salary',
  name: 'Jasur Toshmatov - avans',
  amount: 500000,
  date: todayStr,
  createdAt: new Date().toISOString()
},
{
  id: 'e4',
  branchId: 'b1',
  type: 'other',
  name: 'Elektr energiyasi',
  amount: 350000,
  date: todayStr,
  createdAt: new Date().toISOString()
},
{
  id: 'e5',
  branchId: 'b2',
  type: 'market',
  name: "Un va yog'",
  amount: 320000,
  date: todayStr,
  createdAt: new Date().toISOString()
},
{
  id: 'e6',
  branchId: 'b2',
  type: 'salary',
  name: 'Sardor Mirzayev - oylik',
  amount: 1500000,
  date: todayStr,
  createdAt: new Date().toISOString()
}];
