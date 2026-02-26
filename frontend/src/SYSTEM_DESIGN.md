
# Baxti POS — System Design Document

> **Last updated:** February 2026  
> This document reflects the current state of the codebase including all recent UI and UX changes.

---

## 1. Overview

**Baxti POS** is a restaurant point-of-sale management system built as a single-page React + TypeScript application. It supports multi-branch restaurant operations with role-based access (currently: `owner` only). The system runs entirely on the client side with an in-memory mock API layer — no backend server is required in the current implementation.

---

## 2. Technology Stack

| Layer | Technology |
|---|---|
| UI Framework | React 18 (TypeScript) |
| Styling | Tailwind CSS |
| Icons | lucide-react |
| Charts | Recharts |
| State Management | React `useState` / `useEffect` (local component state) |
| Routing | Manual page state (`currentPage` string in `App.tsx`) |
| Data Layer | In-memory mock API (`lib/api.ts` + `lib/mockData.ts`) |
| Auth | localStorage-based session (`lib/auth.ts`) |

---

## 3. Project Structure

```
/
├── App.tsx                        # Root component, auth + routing
├── index.tsx                      # Entry point
├── index.css                      # Global styles
├── tailwind.config.js
│
├── components/
│   ├── layout/
│   │   └── OwnerLayout.tsx        # Sidebar + topbar shell for owner pages
│   └── ui/
│       ├── Badge.tsx
│       ├── Button.tsx
│       ├── ConfirmDialog.tsx
│       ├── Input.tsx
│       ├── LoadingSkeleton.tsx
│       ├── Modal.tsx
│       ├── Select.tsx
│       ├── StatCard.tsx
│       └── Toast.tsx
│
├── pages/
│   ├── LoginPage.tsx
│   ├── BranchSelectPage.tsx
│   └── owner/
│       ├── DashboardPage.tsx
│       ├── OrdersPage.tsx         # Sales summary (Sotuvlar)
│       ├── ProductsPage.tsx
│       ├── ExpensesPage.tsx
│       ├── TablesPage.tsx
│       ├── WaitersPage.tsx
│       └── BranchesPage.tsx
│
└── lib/
    ├── types.ts                   # All TypeScript interfaces & types
    ├── mockData.ts                # Static + dynamic seed data
    ├── api.ts                     # Mock API (in-memory CRUD)
    ├── auth.ts                    # Session read/write (localStorage)
    └── formatters.ts              # Currency, date, phone formatters
```

---

## 4. Data Model

### Core Types (`lib/types.ts`)

```
User
  id: string
  name: string
  phone: string
  role: 'owner'

Branch
  id: string
  name: string
  address: string
  shiftStart: string          // "HH:MM"
  shiftEnd: string            // "HH:MM"
  timezone: 'Asia/Tashkent'
  isActive: boolean

Waiter
  id: string
  branchId: string
  name: string
  phone: string
  telegramId: string
  isEnabled: boolean
  shiftStatus: 'active' | 'ended' | 'not_started'
  createdAt: string           // ISO 8601

TableItem
  id: string
  branchId: string
  name: string
  status: 'empty' | 'occupied' | 'closing'
  currentOrderId?: string

Category
  id: string
  branchId: string
  name: string
  sortOrder: number

Product
  id: string
  branchId: string
  categoryId: string
  name: string
  price: number               // in so'm
  isActive: boolean

OrderItem
  id: string
  productId: string
  productName: string
  quantity: number
  price: number               // unit price at time of order

Order
  id: string
  branchId: string
  tableId: string
  tableName: string
  waiterId: string
  waiterName: string
  status: 'open' | 'closed'
  items: OrderItem[]
  total: number               // sum of (item.price * item.quantity)
  paymentType?: 'cash' | 'card' | 'transfer'
  createdAt: string           // ISO 8601
  closedAt?: string           // ISO 8601, set on close

Expense
  id: string
  branchId: string
  type: 'salary' | 'market' | 'other'
  name: string
  amount: number
  note?: string
  date: string                // YYYY-MM-DD
  createdAt: string           // ISO 8601

DashboardStats
  todayRevenue: number
  todayExpenses: number
  todayProfit: number
  openOrdersCount: number
  revenueChart: { date: string; tushum: number; rashod: number }[]
  expensesByType: { name: string; value: number }[]
  ordersChart: { date: string; soni: number }[]
  openOrders: Order[]

WaiterActivity
  waiterId: string
  waiterName: string
  openedOrders: number
  closedOrders: number
  revenue: number
  avgCheck: number
  itemsAdded: number

AuthState
  user: User | null
  token: string | null
  activeBranchId: string | null
```

---

## 5. Authentication & Session Flow

```
App mounts
  └─ getAuth() reads localStorage
       ├─ token + user found → restore session → load branches
       │     └─ activeBranchId found → go to Dashboard
       │     └─ no activeBranchId → go to BranchSelectPage
       └─ no token → show LoginPage

LoginPage
  └─ api.auth.login(phone, password)
       └─ success → setAuth(user, token) → App shows BranchSelectPage

BranchSelectPage
  └─ user clicks a branch card → immediately calls onSelect(branchId)
       └─ App sets activeBranchId → shows OwnerLayout/Dashboard
       (No "Davom etish" confirmation step — selection is instant)

Logout
  └─ clearAuth() → reset all state → LoginPage
```

**Credentials (mock):**
- Phone: `+998901234567`
- Password: `admin123`

---

## 6. Routing

There is no URL-based router. Navigation is managed via a `currentPage` string in `App.tsx`:

```
type Page = 'dashboard' | 'branches' | 'waiters' | 'tables' | 'products' | 'expenses' | 'orders'
```

`OwnerLayout` renders a sidebar (desktop) and bottom tab bar (mobile) with nav items. Clicking a nav item calls `onNavigate(pageId)` which updates `currentPage` in `App.tsx`. The correct page component is conditionally rendered inside `OwnerLayout`.

---

## 7. API Layer (`lib/api.ts`)

All API calls simulate async network requests with a configurable `delay()` (default 350ms). Data is stored in module-level mutable arrays initialized from `mockData.ts`.

### Namespaces

| Namespace | Methods |
|---|---|
| `api.auth` | `login`, `logout` |
| `api.branches` | `list`, `create`, `update`, `delete` |
| `api.waiters` | `listByBranch`, `create`, `update`, `delete` |
| `api.tables` | `listByBranch`, `create`, `update`, `delete` |
| `api.categories` | `listByBranch`, `create`, `update`, `delete` |
| `api.products` | `listByBranch`, `create`, `update`, `delete` |
| `api.expenses` | `listByBranchAndDate`, `create`, `update`, `delete` |
| `api.orders` | `listByBranch`, `getById`, `create`, `updateItems`, `close` |
| `api.dashboard` | `getStats` |
| `api.reports` | `daily`, `monthly`, `waiterActivity` |

### Order Lifecycle

```
api.orders.create(data)
  └─ status: 'open'
  └─ table.status → 'occupied'

api.orders.updateItems(id, items)
  └─ recalculates total

api.orders.close(id, paymentType, amount)
  └─ status: 'closed'
  └─ closedAt: new Date().toISOString()
  └─ table.status → 'empty'
  └─ table.currentOrderId → undefined
```

### Filtering: `api.orders.listByBranch`

```
filters.status  → 'open' | 'closed' | 'all'
filters.from    → YYYY-MM-DD (inclusive, matches createdAt)
filters.to      → YYYY-MM-DD (inclusive, matches createdAt)
```

> **Note:** The sales summary page (`OrdersPage`) filters by `closedAt` on the client side after fetching, since the API currently filters by `createdAt`.

---

## 8. Pages

### LoginPage
- Phone + password form
- Calls `api.auth.login`
- On success: calls `onLogin(user, token)`

### BranchSelectPage
- Lists all branches as selectable cards (1-col on mobile, 2-col on sm+)
- Clicking a card **immediately** redirects to the dashboard — no confirmation button
- Logout link at the bottom

### DashboardPage
- Stat cards: today's revenue, expenses, profit, open orders
- Line chart: weekly revenue vs expenses
- Donut chart: expense breakdown by type
- Bar chart: daily order count
- Table: currently open orders

### OrdersPage (Sotuvlar)
Four tabs:

**Tab 1 — Sotuvlar (Sales Summary)**
- Date range filter: Bugun / Kecha / Dan–gacha
- 4 stat cards: total qty sold, total revenue, closed orders count, avg check
- Table grouped by day (aggregated, not individual orders)
- Expandable rows: product breakdown per day, sorted by qty desc
- Pagination: 10 rows/page

**Tab 2 — Kunlik hisobot**
- Date picker
- Stat cards: revenue, expenses, profit
- Breakdown panels: payment types, expense types

**Tab 3 — Oylik hisobot**
- Date range picker
- Stat cards: total revenue, expenses, profit
- Line chart: daily revenue/expenses/profit over selected range

**Tab 4 — Ofitsant faoliyati**
- Date range picker
- Table: per-waiter stats (orders opened/closed, revenue, avg check, items added)

### ProductsPage
- Left panel: category list with inline edit/delete
- Right panel: product table filtered by selected category + search
- "Kategoriya qo'shish" → opens category create modal
- "Mahsulot qo'shish" → opens product create modal
- Toggle switch for product active/inactive status

### ExpensesPage
- Date picker (filters expense list)
- 4 stat cards: total, salary, market, other
- Desktop: inline create form (left column) + expense table (right column)
- Mobile: FAB opens create/edit modal; expense cards in list view
- Edit/delete per expense row

### TablesPage
- Grid of table cards showing status (empty / occupied / closing)
- Clicking a table card opens the order detail view
- **Desktop:** order detail opens in a large `xl` Modal with two panels side-by-side:
  - Left (40%): current order items + total + action buttons
  - Right (60%): product grid with category filter + search
- **Mobile:** order detail opens as a full-screen overlay (not Modal component) with tab switcher (Buyurtma / Mahsulotlar) and sticky footer with total + action buttons
- Owner can increase/decrease/remove items; waiters can only increase
- Payment modal: choose cash / card / transfer → confirm closes the order
- Create, rename, delete tables via Modal form
- Mobile FAB for adding new tables (hidden when order sheet is open)

### WaitersPage
- List of waiters with shift status badges
- Create, edit, toggle enabled, delete waiters

### BranchesPage
- List of branches (cards on mobile, table on desktop)
- Desktop: "Filial qo'shish" button in page header
- Mobile: FAB only (no duplicate header button)
- Create, edit, delete branches via Modal form

---

## 9. UI Component System

All components live in `components/ui/`.

### Button
```
variant: 'primary' | 'secondary' | 'outline' | 'ghost' | 'danger'
size:    'sm' | 'md' | 'lg' | 'icon'
isLoading: boolean   // shows spinner, disables button
```

### StatCard
```
title:    string
value:    string | number
icon:     LucideIcon
color:    'indigo' | 'green' | 'red' | 'amber'
subtitle: string     // optional caption below value
trend:    number     // optional, shows up/down arrow
```

### Badge
```
variant: 'success' | 'danger' | 'warning' | 'primary' | 'secondary' | 'info'
size:    'sm' | 'md'
```

### Input
```
label:     string
error:     string
type:      HTML input types
...rest:   all native input props
```

### Select
```
label:    string
options:  { value: string; label: string }[]
error:    string
...rest:  all native select props
```

### Modal
```
isOpen:   boolean
onClose:  () => void
title:    ReactNode
size:     'sm' | 'md' | 'lg' | 'xl'
```

**Behavior:**
- **Mobile:** renders as a bottom sheet — auto height, rounded top corners (`rounded-t-2xl`), max 85vh, with a drag handle indicator
- **Desktop:** centered modal, max 90vh, `rounded-2xl`, `shadow-2xl`
- **Scroll lock:** when open, sets `overflow: hidden` on `document.documentElement`, `document.body`, and the `<main>` element to prevent background scrolling on all devices
- **Keyboard:** `Escape` key closes the modal
- **Backdrop:** clicking the dimmed overlay closes the modal
- Safe area inset applied to content bottom padding

### ConfirmDialog
```
isOpen:      boolean
onClose:     () => void
onConfirm:   () => void
title:       string
message:     string
confirmText: string    // optional, defaults to "O'chirish"
isLoading:   boolean
```

### Toast
```
toast.success(message)
toast.error(message?)    // defaults to generic error text
toast.deleted(message)
```

### LoadingSkeleton
```
<TableSkeleton rows={number} />
<CardSkeleton count={number} />
<GridSkeleton count={number} />
```

---

## 10. Formatters (`lib/formatters.ts`)

| Function | Input | Output example |
|---|---|---|
| `formatCurrency(amount)` | `number` | `"110 000 so'm"` |
| `formatDate(dateStr)` | `string \| Date` | `"24 fevral 2026"` |
| `formatDateShort(dateStr)` | `string \| Date` | `"24.02.2026"` |
| `formatTime(dateStr)` | `string \| Date` | `"14:35"` |
| `formatDateTime(dateStr)` | `string \| Date` | `"24.02.2026 14:35"` |
| `formatPhone(phone)` | `string` | `"+998 90 123 45 67"` |
| `todayStr()` | — | `"2026-02-24"` |

---

## 11. Layout System

### Desktop Layout

`OwnerLayout` provides the persistent shell on `lg+` screens:

```
┌──────────────────────────────────────────────────────────┐
│  SIDEBAR (w-64, bg-slate-900, fixed)                     │
│  ┌──────────────────────────────────────────────────┐    │
│  │  Logo: 🍴 Baxti POS                              │    │
│  ├──────────────────────────────────────────────────┤    │
│  │  Nav items (7):                                  │    │
│  │  • Bosh sahifa    (dashboard)                    │    │
│  │  • Stollar        (tables)                       │    │
│  │  • Buyurtmalar    (orders)                       │    │
│  │  • Mahsulotlar    (products)                     │    │
│  │  • Xarajatlar     (expenses)                     │    │
│  │  • Girgittonlar   (waiters)                      │    │
│  │  • Filiallar      (branches)                     │    │
│  ├──────────────────────────────────────────────────┤    │
│  │  Chiqish (logout)                                │    │
│  └──────────────────────────────────────────────────┘    │
│                                                          │
│  MAIN AREA (ml-64)                                       │
│  ┌──────────────────────────────────────────────────┐    │
│  │  TOPBAR (sticky, h-16, bg-white)                 │    │
│  │  [● Faol filial: X ▾]          [👤 Admin ▾]      │    │
│  ├──────────────────────────────────────────────────┤    │
│  │  PAGE CONTENT (p-6, max-w-7xl, overflow-y-auto)  │    │
│  └──────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
```

### Mobile Layout

On screens smaller than `lg`:

```
┌──────────────────────────────┐
│  MOBILE HEADER (sticky)      │
│  [Page Title]       [👤]     │
│  Faol filial: X              │
├──────────────────────────────┤
│                              │
│  PAGE CONTENT (scrollable)   │
│                              │
├──────────────────────────────┤
│  BOTTOM TAB BAR (fixed)      │
│  🏠  🍽  🛍  📦  🧾  ···    │
│  Bosh Stollar Sotuvlar ...   │
└──────────────────────────────┘
```

**Mobile bottom tabs (5 visible + "Ko'proq"):**
1. Bosh sahifa (dashboard)
2. Stollar (tables)
3. Sotuvlar (orders)
4. Mahsulotlar (products)
5. Xarajatlar (expenses)
6. Ko'proq → bottom sheet with: Girgittonlar, Filiallar, Chiqish

**Mobile navigation notes:**
- Sidebar is desktop-only (`hidden lg:flex`)
- Bottom tab bar is mobile-only (`lg:hidden fixed bottom-0`)
- Pages use FABs (floating action buttons) for primary create actions on mobile
- Bottom tab bar has `pb-[env(safe-area-inset-bottom)]` for notched devices

---

## 12. Color Tokens (Tailwind)

| Role | Class |
|---|---|
| Primary accent | `indigo-600` |
| Success / revenue | `emerald-500` / `emerald-600` |
| Danger / expenses | `red-500` / `red-600` |
| Warning / pending | `amber-500` |
| Page background | `slate-50` |
| Sidebar | `slate-900` |
| Card background | `white` |
| Border | `slate-200` |
| Muted text | `slate-500` |
| Body text | `slate-900` |

---

## 13. Z-Index Scale

| Layer | z-index | Usage |
|---|---|---|
| Page content | default | Normal content |
| Sticky header | `z-30` | Topbar / mobile header |
| FAB buttons | `z-40` | Floating action buttons |
| Sidebar | `z-50` | Desktop sidebar, mobile bottom sheet |
| Bottom tab bar | `z-50` | Mobile navigation |
| Modals / overlays | `z-[60]` | Modal, order sheet overlay |

---

## 14. Mobile UX Patterns

### Modals (bottom sheet)
- All `<Modal>` instances render as bottom sheets on mobile
- Auto height (content-driven), capped at 85vh
- Rounded top corners with drag handle
- Background scroll locked via `overflow: hidden` on `html`, `body`, and `main`

### Order Detail (TablesPage)
- Mobile uses a custom full-screen overlay (`fixed inset-0 z-[60]`) — **not** the Modal component
- Tab switcher between "Buyurtma" and "Mahsulotlar"
- Sticky footer with total + action buttons
- Safe area insets applied to header and footer

### FAB Pattern
- Used on: TablesPage, ExpensesPage, BranchesPage (mobile only)
- Position: `fixed bottom-20 right-4` (above bottom tab bar)
- Hidden when conflicting overlays are open (e.g., order sheet on TablesPage)

### Branch Selection
- Clicking a branch card on `BranchSelectPage` immediately redirects — no extra confirmation step

---

## 15. Known Limitations & Future Work

| Area | Current State | Future Improvement |
|---|---|---|
| Backend | In-memory mock only | Connect real REST/GraphQL API |
| Auth | localStorage token (no expiry) | JWT with refresh tokens |
| Order filtering | Filters by `createdAt`, not `closedAt` | Fix API filter to use `closedAt` for sales reports |
| Roles | `owner` only | Add `waiter` role with restricted access |
| Real-time | None | WebSocket for live order updates |
| Offline | Not supported | Service worker + IndexedDB |
| i18n | Uzbek (Latin) only | Multi-language support |
| Pagination | Client-side only | Server-side pagination |
| Data persistence | Resets on page refresh | Persist to localStorage or backend |
| Sidebar (mobile) | Sidebar hidden on mobile; no hamburger menu | Consider slide-in drawer if needed |
