# Baxti POS Monorepo

Baxti POS - bu filialli ovqatlanish bizneslari uchun qurilgan POS va operatsion boshqaruv platformasi. Hozirgi product yadro oqimi `Owner`, `Manager` va `Waiter` rollari atrofida qurilgan bo'lib, filial, stol, buyurtma, mahsulot, xarajat, hisobot, ulush va realtime sinxronizatsiyani bitta tizim ichida boshqaradi.

Repository ikkita asosiy ilovadan iborat:
- `backend/` - Express + TypeScript + Prisma + PostgreSQL + Socket.IO
- `frontend/` - React + TypeScript + Vite + PWA + Socket.IO client

Bu README ikki katta qismga bo'lingan:
- `Business Logic` - tizim qanday ishlaydi, rollar va operatsion qoidalar
- `Technical Architecture` - kod bazasi qanday qurilgan, qanday ishlaydi va qanday ishga tushiriladi

## Mundarija

1. [Business Logic](#business-logic)
2. [Technical Architecture](#technical-architecture)
3. [Local Development](#local-development)
4. [Production va Operatsion Eslatmalar](#production-va-operatsion-eslatmalar)

## Business Logic

### 1. Product maqsadi

Baxti POS quyidagi amaliy ehtiyojlarni yopadi:
- filiallar bo'yicha savdoni boshqarish
- stol kesimida buyurtma yuritish
- waiter faoliyatini nazorat qilish
- managerga cheklangan boshqaruv berish
- xarajat va savdoni bir joyda ko'rish
- realtime yangilanishlar bilan bir nechta qurilmani sinxron ushlash
- waiter uchun mobil-first PWA tajribasini berish

Hozirgi tizim asosan `cafe / restaurant / lounge uslubidagi stol bilan ishlaydigan biznes` uchun optimallashtirilgan.

### 2. Rollar

#### Owner

Owner tizimdagi eng yuqori operatsion rol.

Owner quyidagilarni boshqaradi:
- filiallar
- managerlar
- waiterlar
- kategoriyalar
- mahsulotlar
- stollar
- buyurtmalar
- xarajatlar va xarajat kategoriyalari
- hisobotlar
- o'z profili

Owner bir nechta filialga ega bo'lishi mumkin va aktiv filial tanlash orqali ish kontekstini o'zgartiradi.

#### Manager

Manager - filial darajasidagi boshqaruv roli.

Manager:
- login qilganda assign qilingan filialga tushadi
- ownerga qaraganda cheklangan huquqda ishlaydi
- permissionlar asosida faqat ruxsat berilgan sahifa va API'larni ishlata oladi

Manager uchun oldindan belgilangan permissionlar:
- `DASHBOARD_VIEW`
- `TABLES_VIEW`
- `TABLES_MANAGE`
- `ORDERS_VIEW`
- `ORDERS_MANAGE`
- `ORDERS_EDIT`
- `ORDERS_CLOSE`
- `PRODUCTS_VIEW`
- `PRODUCTS_MANAGE`
- `EXPENSES_VIEW`
- `EXPENSES_MANAGE`
- `WAITERS_VIEW`
- `WAITERS_MANAGE`
- `REPORTS_VIEW`

Permissionlar backendda haqiqiy authorization qatlami sifatida ishlaydi, frontend esa shu qoidaga mos UI ko'rsatadi.

#### Waiter

Waiter intentionally minimal rol.

Waiter quyidagilarni qila oladi:
- telefon va parol bilan login qilish
- o'z filialidagi stollarni ko'rish
- kategoriyalar va mahsulotlarni ko'rish
- stol uchun order ochish
- orderga mahsulot qo'shish
- smenani boshlash va tugatish
- kunlik, oylik, yillik ulushini ko'rish

Waiter quyidagilarni qilmaydi:
- mahsulot yoki kategoriya yaratish
- xarajat boshqarish
- manager yoki filial sozlamalarini o'zgartirish
- odatiy oqimda buyurtmani yopish

### 3. Autentifikatsiya va session

Autentifikatsiya JWT asosida ishlaydi.

Asosiy oqim:
1. foydalanuvchi telefon va parol bilan login qiladi
2. backend password hash'ni tekshiradi
3. JWT access token qaytaradi
4. frontend tokenni saqlaydi va keyingi so'rovlarda `Authorization: Bearer <token>` yuboradi
5. backend `auth` middleware orqali user'ni request context'ga joylaydi

Qo'shimcha qoidalar:
- login endpointida rate limit bor: 1 daqiqada 10 urinish
- owner va manager uchun `/auth/me` orqali profil olinadi
- owner va manager profilini `/auth/me` orqali yangilay oladi
- owner va manager uchun `/auth/select-branch` mavjud
- manager assign qilingan filial bilan ishlaydi va ko'p holatda alohida tanlov bosqichi chetlab o'tiladi

### 4. Filial logikasi

`Branch` tizimning markaziy biznes birligi.

Har bir filial quyidagilarni ushlaydi:
- nomi
- manzili
- smena tugash vaqti (`shiftEnd`)
- faollik holati
- owner
- staff va manager assignmentlari
- stollar
- kategoriyalar
- mahsulotlar
- buyurtmalar
- xarajatlar
- shiftlar

Deyarli barcha operatsion endpointlar aktiv filial kontekstida ishlaydi.

### 5. Manager assignment logikasi

Manager yaratilganda:
- login credential yaratiladi
- permissionlar belgilanadi
- bitta yoki bir nechta filialga assignment qilinadi

Assignment modeli `ManagerBranch` orqali yuritiladi.

Manager login qilganda:
- ruxsat etilgan filiallar aniqlanadi
- aktiv ish konteksti shu assignmentlar asosida belgilanadi
- permission bo'lmasa, tegishli bo'limlar backend va frontendda bloklanadi

### 6. Waiter logikasi

Waiter yaratilganda:
- telefon va parol majburiy
- `salesSharePercent` saqlanadi
- filialga biriktiriladi
- aktiv/nofaol holatga ega bo'ladi

Amaldagi product oqimida Telegram auth ishlatilmaydi. Schema'da `telegramUserId` va `telegramUsername` kabi legacy maydonlar qolgan bo'lsa ham, hozirgi aktiv autentifikatsiya telefon + parol orqali ishlaydi.

Waiter o'chirilganda biznes kutuvi - uni tizimdan butunlay olib tashlash.

### 7. Kategoriya va mahsulot logikasi

Kategoriyalar va mahsulotlar filial kesimida yuritiladi.

Asosiy qoidalar:
- kategoriya nomi filial ichida unikal
- mahsulot kategoriya bilan bog'langan
- mahsulot `isActive` orqali faol/nofaol bo'lishi mumkin
- frontendda `Barchasi` default kategoriya filteri mavjud
- waiterga barcha faol kategoriyalar va mahsulotlar ko'rinadi

Mahsulot o'zgarganda branch ichidagi clientlarga realtime event yuboriladi:
- `products.updated`

### 8. Stol logikasi

Stol filialga tegishli alohida biznes obyekt.

Asosiy qoidalar:
- stol nomi filial ichida unikal
- `AVAILABLE`, `OCCUPIED`, `DISABLED` statuslari mavjud
- ochiq stolga odatda bitta aktiv order bog'lanadi
- ochiq stol qaysi waiter tomonidan yuritilayotganini UI ko'rsatadi

Stol oqimi:
- stol yaratish
- stolni tahrirlash
- stolni o'chirish
- stol uchun order ochish
- stol statusini avtomatik yangilash

Stol holati o'zgarganda:
- `tables.updated` realtime event yuboriladi

### 9. Buyurtma logikasi

Buyurtma `Order` va `OrderItem` orqali yuritiladi.

Lifecycle:
1. stol uchun order ochiladi
2. mahsulotlar item sifatida qo'shiladi
3. kerak bo'lsa owner yoki tegishli permissionli manager itemni tahrirlaydi yoki o'chiradi
4. total Prisma transaction ichida qayta hisoblanadi
5. to'lov paytida order yopiladi

Asosiy qoidalar:
- order statuslari: `OPEN`, `CLOSED`, `CANCELLED`
- order filial ichida o'z `orderNumber`iga ega
- `subtotalAmount`, `discountAmount`, `totalAmount`, `paidAmount` saqlanadi
- `paymentMethod` `CASH`, `CARD`, `TRANSFER`, `MIXED` bo'lishi mumkin
- `closedAt` faqat yakuniy yopilgan orderlar uchun to'ldiriladi

Realtime eventlar:
- `order.updated`
- `order.closed`

### 10. To'lov va chek logikasi

To'lov jarayoni order yopilishi bilan bog'langan.

Yopilgandan keyin:
- order savdo hisobotlariga kiradi
- stol bo'shatiladi yoki yangilanadi
- waiter ulushiga ta'sir qiladi
- realtime eventlar boshqa clientlarga uzatiladi

Frontendda lokal receipt print adapter mavjud. Hozirgi oqim brauzer print oynasi orqali 80mm formatli check tayyorlashga mo'ljallangan. Bu yechim Xprinter kabi lokal printer ssenariylari uchun integratsion qatlam bo'lib xizmat qiladi, lekin printer drayveri va OS darajasidagi chiqish muhiti deploymentga bog'liq.

### 11. Xarajatlar logikasi

Xarajat moduli filial kesimida ishlaydi.

Qo'llab-quvvatlanadigan oqimlar:
- xarajat kategoriyalarini yaratish
- xarajat qo'shish
- xarajatni tahrirlash
- xarajatni o'chirish
- sana bo'yicha xarajatlarni ko'rish

Bu ma'lumotlar dashboard va hisobotlar bilan bog'langan.

### 12. Shift logikasi

Waiter smenasi `WaiterShift` modeli orqali yuritiladi.

Qo'llab-quvvatlanadigan oqimlar:
- shift start
- shift end
- shift status
- boshlang'ich va yakuniy naqd qiymat
- opening/closing note
- filial `shiftEnd` asosida auto-stop logika

Muhim qoidalar:
- ayrim order amallari shift talab qiladi
- waiter faoliyati va hisoboti shift bilan bog'lanishi mumkin

### 13. Ulush va payout logikasi

Har bir waiter uchun `salesSharePercent` saqlanadi.

Hisoblash qoidasi:
- faqat yopilgan orderlar hisobga olinadi
- kunlik, oylik, yillik agregatsiya mavjud
- order hali yopilmagan bo'lsa ulushga kirmaydi

Owner yoki ruxsatli manager quyidagilarni ham qila oladi:
- waiter commission summary ko'rish
- payout qo'shish

Shuning uchun tizimda `CommissionPayout` alohida model sifatida mavjud.

### 14. Hisobotlar

Hozirgi hisobot qatlami quyidagilarni qoplaydi:
- dashboard statistikasi
- `sales-summary`
- `waiter-activity`
- mahsulot performance hisobotlari
- kunlik va oylik moliyaviy kesim

Hisobotlarda asosiy tamoyil:
- savdo `closedAt` asosida hisoblanadi
- ochiq order yakuniy revenue'ga kirmaydi
- xarajat va savdo alohida yig'ilib, foyda hisoblanadi

### 15. Realtime biznes qiymati

Socket.IO branch-room modeli bilan ishlaydi.

Asosiy mexanizm:
- client branch'ga kirganda `join_branch` yuboradi
- server socket'ni `branch:<branchId>` room'iga qo'shadi
- branch ichidagi o'zgarishlar shu room'ga broadcast qilinadi

Amaliy natija:
- stol holati turli ekranlarda bir vaqtda yangilanadi
- order o'zgarishi owner/manager/waiter ekranlarida ko'rinadi
- mahsulot o'zgarishi branch ichidagi menyu ko'rinishiga tushadi

### 16. Waiter PWA tajribasi

Waiter oqimi mobil-first qilib moslashtirilgan.

Mavjud imkoniyatlar:
- installable PWA
- home screen icon
- standalone/fullscreen launch
- service worker registratsiyasi
- iOS qurilmalarda install fallback yo'riqnomasi

Bu qaror waiterga brauzer oynasi emas, app'ga yaqinroq ish tajribasini berish uchun qilingan.

## Technical Architecture

### 1. Repository tuzilmasi

```text
restaurant/
|-- README.md
|-- backend/
|   |-- package.json
|   |-- tsconfig.json
|   |-- prisma/
|   |   |-- schema.prisma
|   |   `-- seed.ts
|   `-- src/
|       |-- app.ts
|       |-- server.ts
|       |-- config.ts
|       |-- prisma.ts
|       |-- constants/
|       |-- middlewares/
|       |-- modules/
|       `-- socket/
`-- frontend/
    |-- package.json
    |-- vite.config.ts
    |-- public/
    `-- src/
        |-- App.tsx
        |-- components/
        |-- lib/
        `-- pages/
```

### 2. Backend stack

Backend texnologiyalari:
- `Node.js`
- `TypeScript`
- `Express 4`
- `Prisma`
- `PostgreSQL`
- `Socket.IO`
- `jsonwebtoken`
- `bcryptjs`
- `dotenv`
- `express-rate-limit`

Backend ESM uslubida ishlaydi.

### 3. Frontend stack

Frontend texnologiyalari:
- `React 18`
- `TypeScript`
- `Vite 5`
- `socket.io-client`
- `react-router-dom`
- `recharts`
- `sonner`
- `lucide-react`

Frontend allaqachon real backend API bilan ishlaydi. Asosiy HTTP qatlam `frontend/src/lib/api.ts` ichida qurilgan va fetch orqali backend endpointlariga ulanadi.

### 4. Backend arxitektura qatlamlari

Backend quyidagi qatlamlarga bo'lingan:
- `routes` - HTTP endpoint mapping
- `controller` - request/response orchestration
- `service` - business logic
- `prisma` - persistence layer
- `middlewares` - auth, branch scope, permission va active branch tekshiruvlari
- `socket` - realtime room/event qatlami

Asosiy route modullar:
- `auth`
- `branches`
- `waiters`
- `managers`
- `categories`
- `products`
- `tables`
- `orders`
- `expenses`
- `reports`
- `me`

### 5. Frontend arxitektura qatlamlari

Frontend quyidagi yondashuvda qurilgan:
- `pages/` - sahifalar
- `components/` - shared UI va layout komponentlar
- `lib/api.ts` - backend client
- `lib/auth.ts` - auth state saqlash
- `lib/socket.ts` - realtime ulanish
- `lib/pwa.ts` - install va standalone holat boshqaruvi
- `lib/receiptPrinter.ts` - chek print helper
- `lib/permissions.ts` - frontend permission tekshiruvlari

### 6. Ma'lumotlar modeli

Prisma schema markazida quyidagi obyektlar turadi:
- `User`
- `Branch`
- `ManagerBranch`
- `Table`
- `Category`
- `Product`
- `Order`
- `OrderItem`
- `Expense`
- `ExpenseCategory`
- `WaiterShift`
- `CommissionPayout`

Muhim enum'lar:
- `UserRole`: `OWNER`, `MANAGER`, `WAITER`
- `TableStatus`: `AVAILABLE`, `OCCUPIED`, `DISABLED`
- `OrderStatus`: `OPEN`, `CLOSED`, `CANCELLED`
- `PaymentMethod`: `CASH`, `CARD`, `TRANSFER`, `MIXED`
- `ShiftStatus`: `OPEN`, `CLOSED`

### 7. Request lifecycle

Oddiy backend request oqimi:
1. request Express'ga keladi
2. request/response logging middleware ishga tushadi
3. auth middleware tokenni tekshiradi
4. role/permission middleware access'ni tekshiradi
5. active branch va branch scope middleware kontekstni tekshiradi
6. controller service'ni chaqiradi
7. service Prisma orqali ma'lumot bilan ishlaydi
8. kerak bo'lsa socket event emit qilinadi
9. response JSON qaytariladi

Backend request loglari konsolga chiqadi:
- `[REQ] ...`
- `[RES] ...`

### 8. Asosiy API endpoint guruhlari

#### Auth
- `POST /auth/login`
- `POST /auth/select-branch`
- `GET /auth/me`
- `PATCH /auth/me`

#### Branches
- `GET /branches`
- `POST /branches`
- `PATCH /branches/:branchId`
- `DELETE /branches/:branchId`

#### Managers
- `GET /managers/permissions`
- `GET /managers`
- `POST /managers`
- `PATCH /managers/:managerId`
- `DELETE /managers/:managerId`

#### Waiters
- `GET /waiters`
- `POST /waiters`
- `PATCH /waiters/:waiterId`
- `DELETE /waiters/:waiterId`
- `GET /waiters/:waiterId/shifts`
- `POST /waiters/:waiterId/shifts/open`
- `POST /waiters/:waiterId/shifts/close`
- `GET /waiters/:waiterId/commission-summary`
- `POST /waiters/:waiterId/payouts`

#### Catalog
- `GET /categories`
- `POST /categories`
- `PATCH /categories/:categoryId`
- `DELETE /categories/:categoryId`
- `GET /products`
- `POST /products`
- `PATCH /products/:productId`
- `DELETE /products/:productId`

#### Tables va Orders
- `GET /tables`
- `POST /tables`
- `PATCH /tables/:tableId`
- `DELETE /tables/:tableId`
- `GET /orders`
- `GET /orders/open`
- `GET /orders/:orderId`
- `POST /orders/open-for-table`
- `POST /orders/:orderId/items`
- `PATCH /orders/:orderId/items/:itemId`
- `DELETE /orders/:orderId/items/:itemId`
- `POST /orders/:orderId/close`

#### Expenses va Reports
- `GET /expenses`
- `POST /expenses`
- `PATCH /expenses/:expenseId`
- `DELETE /expenses/:expenseId`
- `GET /expenses/categories`
- `POST /expenses/categories`
- `PATCH /expenses/categories/:categoryId`
- `DELETE /expenses/categories/:categoryId`
- `GET /reports/dashboard`
- `GET /reports/sales-summary`
- `GET /reports/waiter-activity`
- `GET /reports/products`

#### Waiter self-service (`/me`)
- `GET /me/tables`
- `GET /me/products`
- `GET /me/categories`
- `GET /me/earnings`
- `GET /me/shift/status`
- `POST /me/shift/start`
- `POST /me/shift/end`
- `POST /me/orders/open-for-table`
- `POST /me/orders/:orderId/items`

### 9. Socket arxitekturasi

Backend `server.ts` ichida HTTP server yaratadi va shu serverga Socket.IO ulaydi.

Frontend `frontend/src/lib/socket.ts` orqali ulanadi.

Qo'llab-quvvatlanadigan eventlar:
- `connected`
- `joined_branch`
- `join_branch_ack`
- `tables.updated`
- `order.updated`
- `order.closed`
- `products.updated`

Lokal developmentda Vite `'/socket.io'` ni backend'ga websocket sifatida proxy qiladi.

### 10. Frontend app flow

Frontend umumiy oqimi:
1. login
2. token va user state saqlash
3. kerak bo'lsa branch select
4. sahifa initial data fetch qiladi
5. branch aniqlangach realtime socket ulanadi
6. event kelsa UI refresh yoki refetch qiladi
7. waiter uchun PWA install holati va standalone rejim kuzatiladi

### 11. Environment konfiguratsiyasi

#### Backend `.env`

Asosiy backend env'lar:

| O'zgaruvchi | Majburiy | Tavsif |
|---|---:|---|
| `PORT` | Ha | Backend porti |
| `NODE_ENV` | Ha | Runtime muhiti |
| `CORS_ORIGIN` | Ha | REST va socket uchun origin |
| `JWT_SECRET` | Ha | JWT signing secret |
| `DATABASE_URL` | Ha | PostgreSQL ulanish manzili |
| `SEED_OWNER_PHONE` | Yo'q | Seed owner phone override |
| `SEED_OWNER_PASSWORD` | Yo'q | Seed owner password override |
| `SEED_OWNER_FULLNAME` | Yo'q | Seed owner name override |
| `SEED_WAITER_PHONE` | Yo'q | Seed waiter phone override |
| `SEED_WAITER_PASSWORD` | Yo'q | Seed waiter password override |

Muhim texnik nuqta:
- backend config default `PORT=4000` fallback bilan keladi
- frontend `vite.config.ts` esa local proxy'ni `http://localhost:3000` ga yo'naltiradi
- shuning uchun local developmentda backend `.env` ichida odatda `PORT=3000` qo'yish kerak

#### Frontend env

Frontend uchun ixtiyoriy env'lar:
- `VITE_API_BASE_URL` - default `'/api'`
- `VITE_SOCKET_URL` - default browser current origin/socket path orqali ishlaydi

### 12. Seed data

`backend/prisma/seed.ts` lokal development uchun boshlang'ich ma'lumot yaratadi:
- owner: `Baxti Owner`
- owner phone: `+998901234567`
- owner password: `admin123`
- branch: `Chilonzor filiali`
- waiter: `Girgitton`
- waiter phone: `+998911111111`
- waiter password: `waiter123`
- waiter share: `8%`
- tables: `T-1` dan `T-4` gacha
- category: `Ichimliklar`
- mahsulotlar: `Americano`, `Cappuccino`, `Limonad`, `Choy`

Bu credential va ma'lumotlar faqat local test uchun.

## Local Development

### 1. Talablar

Kerak bo'ladi:
- `Node.js 20+`
- `npm`
- `PostgreSQL`

Docker majburiy emas. Loyiha local PostgreSQL bilan ishlaydi.

### 2. Dependency o'rnatish

```bash
cd backend
npm install

cd ../frontend
npm install
```

### 3. Backend `.env`

`backend/.env.example` dan nusxa oling va to'ldiring.

Minimal tavsiya etilgan local konfiguratsiya:

```env
PORT=3000
NODE_ENV=development
CORS_ORIGIN=http://localhost:5173
JWT_SECRET=some_long_secret
DATABASE_URL=postgresql://USER:PASSWORD@localhost:5432/baxti_pos?schema=public
```

### 4. Database tayyorlash

```bash
cd backend
npx prisma generate
npx prisma migrate dev --name init
npm run prisma:seed
```

Agar development paytida tez sinov kerak bo'lsa:

```bash
npx prisma db push
```

Lekin barqaror schema tarixi uchun `migrate dev` afzal.

### 5. Ilovalarni ishga tushirish

Backend:

```bash
cd backend
npm run dev
```

Frontend:

```bash
cd frontend
npm run dev
```

Odatdagi local URL'lar:
- backend: `http://localhost:3000`
- frontend: `http://localhost:5173`

### 6. Tez smoke test

Backend health:

```bash
curl http://localhost:3000/health
```

Owner login:

```bash
curl -X POST http://localhost:3000/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "phone": "+998901234567",
    "password": "admin123"
  }'
```

Frontend proxy orqali health:

```bash
curl http://localhost:5173/api/health
```

### 7. Build

Backend:

```bash
cd backend
npm run build
```

Frontend:

```bash
cd frontend
npm run build
```

## Production va Operatsion Eslatmalar

Production uchun minimal tavsiyalar:
- `CORS_ORIGIN=*` ishlatmang, aniq allowlist ishlating
- `JWT_SECRET` kuchli va maxfiy bo'lsin
- `prisma migrate deploy` ni deploy pipeline'ga qo'shing
- structured logging va monitoring qo'shing
- PostgreSQL backup va restore jarayoni bo'lsin
- frontend va backend origin/socket mosligini tekshiring
- PWA/service worker cache invalidation strategiyasini nazorat qiling

Operatsion tekshiruvlar:
1. login ishlashi
2. branch access va permissionlar ishlashi
3. products/tables/orders realtime eventlari ishlashi
4. order close va receipt print oqimi ishlashi
5. waiter PWA install ishlashi
6. dashboard va reports sonlari yopilgan orderlar bilan mos kelishi

## Qisqa xulosa

Baxti POS hozirgi holatda `branch-centric`, `role-aware`, `realtime-enabled` POS platforma hisoblanadi. Business qatlamda asosiy qiymat - stol, buyurtma, waiter faoliyati, ulush va hisobotlarning bitta oqimga yig'ilganidir. Technical qatlamda esa kuchli tomon - `Express + Prisma + PostgreSQL + Socket.IO + React/PWA` stack orqali boshqariladigan va keyinchalik kengaytiriladigan arxitekturaga ega ekanidir.
