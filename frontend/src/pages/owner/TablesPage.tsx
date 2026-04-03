import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { GridSkeleton } from "../../components/ui/LoadingSkeleton";
import { toast } from "../../components/ui/Toast";
import {
  Plus,
  Edit2,
  Trash2,
  Banknote,
  CreditCard,
  Smartphone,
  Search,
  ShoppingCart,
  X,
  QrCode,
  Printer,
  RefreshCcw,
  BellRing,
  CheckCircle2,
  Users,
  ShoppingBag,
} from "lucide-react";
import { api } from "../../lib/api";
import { tablesFeatureApi } from "../../lib/tablesFeatureApi";
import { productsFeatureApi } from "../../lib/productsFeatureApi";
import { ordersFeatureApi } from "../../lib/ordersFeatureApi";
import { guestRequestsApi } from "../../lib/guestRequestsApi";
import {
  Category,
  Product,
  TableItem,
  Order,
  TableQrData,
  GuestRequestsOverview,
  OrderItem,
  OrderItemFulfillmentStatus,
} from "../../lib/types";
import { formatCurrency } from "../../lib/formatters";
import { printReceipt } from "../../lib/receiptPrinter";
import { printTableQr } from "../../lib/qrPrint";
import { clsx } from "clsx";
import { getAuth } from "../../lib/auth";
import { hasAnyPermission, hasPermission } from "../../lib/permissions";
import { onRealtimeEvent } from "../../lib/socket";
import { GuestInboxPanel } from "../../components/tables/GuestInboxPanel";

interface TablesPageProps {
  activeBranchId: string;
  activeBranchName: string;
  activeBranchCommissionPercent: number;
}

const getErrorMessage = (error: unknown) =>
  error instanceof Error
    ? error.message
    : "Xatolik yuz berdi. Qayta urinib ko'ring";

const nextFulfillmentStatus: Partial<
  Record<OrderItemFulfillmentStatus, OrderItemFulfillmentStatus>
> = {
  ACCEPTED: "PREPARING",
  PREPARING: "READY",
  READY: "SERVED",
};

const fulfillmentLabel: Record<OrderItemFulfillmentStatus, string> = {
  ACCEPTED: "Qabul qilindi",
  PREPARING: "Tayyorlanmoqda",
  READY: "Tayyor",
  SERVED: "Yetkazildi",
  CANCELED: "Bekor qilindi",
};

const fulfillmentVariant = (status?: OrderItemFulfillmentStatus) => {
  if (status === "READY" || status === "SERVED") return "success" as const;
  if (status === "CANCELED") return "danger" as const;
  return "warning" as const;
};

const TAKEOUT_DRAFT_TABLE_ID = "__takeout__";

const formatActivityTime = (value?: string | null) => {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return date.toLocaleString("uz-UZ", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });
};

function ToggleRow({
  label,
  description,
  checked,
  onToggle,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 bg-slate-50 px-3 py-3">
      <div>
        <p className="text-sm font-medium text-slate-900">{label}</p>
        <p className="text-xs text-slate-500 mt-0.5">{description}</p>
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={onToggle}
        className={clsx(
          "relative mt-0.5 h-6 w-11 rounded-full transition-colors",
          checked ? "bg-indigo-600" : "bg-slate-300",
          disabled && "opacity-60",
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all",
            checked ? "left-[22px]" : "left-[2px]",
          )}
        />
      </button>
    </div>
  );
}

export function TablesPage({
  activeBranchId,
  activeBranchName,
  activeBranchCommissionPercent,
}: TablesPageProps) {
  const auth = getAuth();
  const user = auth.user;
  const isWaiter = user?.role === "waiter";
  const canManageTables = hasPermission(user, "TABLES_MANAGE");
  const canReadOrders =
    isWaiter ||
    hasAnyPermission(user, [
      "ORDERS_VIEW",
      "ORDERS_MANAGE",
      "ORDERS_EDIT",
      "ORDERS_CLOSE",
    ]);
  const canViewProducts =
    isWaiter ||
    hasAnyPermission(user, [
      "PRODUCTS_VIEW",
      "PRODUCTS_MANAGE",
      "ORDERS_MANAGE",
    ]);
  const canAddProductsToOrder =
    isWaiter || hasPermission(user, "ORDERS_MANAGE");
  const canEditOrderItems = hasPermission(user, "ORDERS_EDIT");
  const canCloseOrders = hasPermission(user, "ORDERS_CLOSE");
  const canSubmitOrderChanges = canAddProductsToOrder || canEditOrderItems;
  const canViewGuestInbox =
    isWaiter ||
    hasAnyPermission(user, [
      "TABLES_VIEW",
      "TABLES_MANAGE",
      "ORDERS_VIEW",
      "ORDERS_MANAGE",
    ]);
  const canHandleGuestActions =
    isWaiter || hasPermission(user, "ORDERS_MANAGE");
  const roleLabel =
    user?.role === "owner"
      ? "Admin"
      : user?.role === "manager"
        ? "Menejer"
        : "Girgitton";

  const [tables, setTables] = useState<TableItem[]>([]);
  const [takeoutOrders, setTakeoutOrders] = useState<Order[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TableItem | null>(null);
  const [tableName, setTableName] = useState("");
  const [tableSeatsCount, setTableSeatsCount] = useState("4");
  const [tableQrEnabled, setTableQrEnabled] = useState(true);
  const [tableSelfOrderEnabled, setTableSelfOrderEnabled] = useState(true);
  const [tableCallWaiterEnabled, setTableCallWaiterEnabled] = useState(true);
  const [nameError, setNameError] = useState("");
  const [saving, setSaving] = useState(false);

  const [deleteTarget, setDeleteTarget] = useState<TableItem | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [activeTable, setActiveTable] = useState<TableItem | null>(null);
  const [orderModal, setOrderModal] = useState<Order | null>(null);
  const [guestInbox, setGuestInbox] = useState<GuestRequestsOverview | null>(
    null,
  );
  const [guestBusyKey, setGuestBusyKey] = useState<string | null>(null);
  const [mobileTab, setMobileTab] = useState<"order" | "products">("order");

  const [productSearch, setProductSearch] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const desktopSearchInputRef = useRef<HTMLInputElement | null>(null);
  const mobileSearchInputRef = useRef<HTMLInputElement | null>(null);

  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<"cash" | "card" | "transfer">(
    "cash",
  );
  const [closing, setClosing] = useState(false);

  const [deleteItemConfirm, setDeleteItemConfirm] = useState<{
    open: boolean;
    itemId: string | null;
  }>({
    open: false,
    itemId: null,
  });

  const [qrModal, setQrModal] = useState<TableQrData | null>(null);
  const [qrBusyTableId, setQrBusyTableId] = useState<string | null>(null);

  const isTakeoutDraft = orderModal?.tableId === TAKEOUT_DRAFT_TABLE_ID;

  const closeOrderSheet = () => {
    setOrderModal(null);
    setActiveTable(null);
    setGuestInbox(null);
    setGuestBusyKey(null);
    setPaymentOpen(false);
    setMobileTab("order");
  };

  const load = async () => {
    setLoading(true);

    const [
      tablesResult,
      takeoutOrdersResult,
      productsResult,
      categoriesResult,
    ] = await Promise.allSettled([
      tablesFeatureApi.list(),
      canReadOrders
        ? api.orders.listByBranch(activeBranchId, { status: "open" })
        : Promise.resolve([]),
      canViewProducts
        ? isWaiter
          ? api.me.products()
          : productsFeatureApi.list()
        : Promise.resolve([]),
      canViewProducts
        ? isWaiter
          ? api.me.categories()
          : api.categories.listByBranch(activeBranchId)
        : Promise.resolve([]),
    ]);

    const nextTables =
      tablesResult.status === "fulfilled" ? tablesResult.value : [];
    const nextTakeoutOrders =
      takeoutOrdersResult.status === "fulfilled"
        ? takeoutOrdersResult.value.filter(
            (order) => order.isTakeout && order.status === "open",
          )
        : [];
    const nextProducts =
      productsResult.status === "fulfilled"
        ? productsResult.value.filter((product) => product.isActive)
        : [];
    const nextCategories =
      categoriesResult.status === "fulfilled" ? categoriesResult.value : [];

    setTables(nextTables);
    setTakeoutOrders(nextTakeoutOrders);
    setProducts(nextProducts);
    setCategories(nextCategories);
    setActiveTable((current) =>
      current
        ? (nextTables.find((table) => table.id === current.id) ?? current)
        : current,
    );
    setLoading(false);
  };

  const loadTables = async () => {
    try {
      const [tables, orders] = await Promise.all([
        tablesFeatureApi.list(),
        canReadOrders
          ? api.orders.listByBranch(activeBranchId, { status: "open" })
          : Promise.resolve([]),
      ]);
      setTables(tables);
      setTakeoutOrders(
        orders.filter((order) => order.isTakeout && order.status === "open"),
      );
      setActiveTable((current) =>
        current
          ? (tables.find((table) => table.id === current.id) ?? current)
          : current,
      );
    } catch {}
  };

  const loadProducts = async () => {
    if (!canViewProducts) return;
    try {
      const [nextProducts, nextCategories] = await Promise.all([
        isWaiter ? api.me.products() : productsFeatureApi.list(),
        isWaiter
          ? api.me.categories()
          : api.categories.listByBranch(activeBranchId),
      ]);
      setProducts(nextProducts.filter((p) => p.isActive));
      setCategories(nextCategories);
    } catch {}
  };

  const loadGuestInbox = async (tableId: string) => {
    if (!canViewGuestInbox) {
      setGuestInbox(null);
      return;
    }

    try {
      const inbox = await guestRequestsApi.getTableInbox(tableId);
      setGuestInbox(inbox);
    } catch {
      setGuestInbox(null);
    }
  };

  const refreshOrder = async (orderId: string) => {
    if (!orderId || !canReadOrders) {
      return;
    }

    try {
      const order = await ordersFeatureApi.getById(orderId);

      if (order.status !== "open") {
        closeOrderSheet();
        return;
      }

      setOrderModal(order);
    } catch {
      // Order yopilgan yoki o'zgargan bo'lishi mumkin.
    }
  };

  useEffect(() => {
    void load();
  }, [activeBranchId, canReadOrders, canViewProducts, isWaiter]);

  useEffect(() => {
    const unsubscribe = onRealtimeEvent(({ event, payload }) => {
      const isWrongBranch =
        payload &&
        typeof payload === "object" &&
        "branchId" in payload &&
        (payload as { branchId?: string }).branchId !== activeBranchId;

      if (isWrongBranch) return;

      const payloadTableId =
        payload && typeof payload === "object" && "tableId" in payload
          ? (payload as { tableId?: string }).tableId
          : undefined;
      const payloadOrderId =
        payload && typeof payload === "object" && "orderId" in payload
          ? (payload as { orderId?: string }).orderId
          : undefined;

      // Table/order events → reload tables only
      if (
        event === "tables.updated" ||
        event === "order.updated" ||
        event === "order.closed"
      ) {
        void loadTables();
        if (
          orderModal?.id &&
          (!payloadOrderId || payloadOrderId === orderModal.id)
        ) {
          void refreshOrder(orderModal.id);
        }
        return;
      }

      // Product catalog changed → reload products + categories only
      if (event === "products.updated") {
        void loadProducts();
        return;
      }

      // QR / service events → reload tables (badge counts) + guest inbox if same table
      if (
        event === "qr.order.created" ||
        event === "qr.order.accepted" ||
        event === "qr.order.rejected" ||
        event === "service.request.created" ||
        event === "service.request.acknowledged" ||
        event === "service.request.completed"
      ) {
        void loadTables();
        if (
          activeTable &&
          (!payloadTableId || payloadTableId === activeTable.id)
        ) {
          void loadGuestInbox(activeTable.id);
        }
      }
    });

    return unsubscribe;
  }, [activeBranchId, activeTable?.id, orderModal?.id]);

  const restoreSearchFocus = (
    target: "desktop" | "mobile",
    cursorPosition?: number,
  ) => {
    requestAnimationFrame(() => {
      const input =
        target === "desktop"
          ? desktopSearchInputRef.current
          : mobileSearchInputRef.current;
      if (!input) return;
      input.focus({ preventScroll: true });
      if (typeof cursorPosition === "number") {
        input.setSelectionRange(cursorPosition, cursorPosition);
      }
    });
  };

  const handleProductSearchChange =
    (target: "desktop" | "mobile") =>
    (event: React.ChangeEvent<HTMLInputElement>) => {
      const nextValue = event.target.value;
      const cursorPosition = event.target.selectionStart ?? nextValue.length;
      setProductSearch(nextValue);
      restoreSearchFocus(target, cursorPosition);
    };

  const handleTakeoutClick = () => {
    setActiveTable(null);
    setGuestInbox(null);
    setGuestBusyKey(null);
    setPaymentOpen(false);
    setProductSearch("");
    setSelectedCategory("all");
    setMobileTab("products");
    setOrderModal({
      id: "",
      branchId: activeBranchId,
      tableId: TAKEOUT_DRAFT_TABLE_ID,
      tableName: "Olib ketish",
      waiterId: user?.id ?? "",
      waiterName: user?.name ?? roleLabel,
      status: "open",
      items: [],
      subtotal: 0,
      discount: 0,
      commissionPercent: 0,
      commission: 0,
      total: 0,
      createdAt: new Date().toISOString(),
    });
  };

  const openTakeoutOrder = async (orderId: string) => {
    setActiveTable(null);
    setGuestInbox(null);
    setGuestBusyKey(null);
    setPaymentOpen(false);
    setProductSearch("");
    setSelectedCategory("all");
    setMobileTab("order");

    try {
      const order = await api.orders.getById(orderId);
      setOrderModal(order);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    }
  };

  const openCreate = () => {
    setEditing(null);
    setTableName("");
    setTableSeatsCount("4");
    setTableQrEnabled(true);
    setTableSelfOrderEnabled(true);
    setTableCallWaiterEnabled(true);
    setNameError("");
    setFormOpen(true);
  };

  const openEdit = (table: TableItem) => {
    setEditing(table);
    setTableName(table.name);
    setTableSeatsCount(String(table.seatsCount ?? 4));
    setTableQrEnabled(table.qrEnabled ?? true);
    setTableSelfOrderEnabled(table.selfOrderEnabled ?? true);
    setTableCallWaiterEnabled(table.callWaiterEnabled ?? true);
    setNameError("");
    setFormOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canManageTables) return;

    if (!tableName.trim()) {
      setNameError("Bu maydon to'ldirilishi shart");
      return;
    }

    const seatsCount = Math.max(1, Math.trunc(Number(tableSeatsCount) || 0));
    setSaving(true);

    try {
      if (editing) {
        await tablesFeatureApi.update(editing.id, {
          name: tableName.trim(),
          seatsCount,
          qrEnabled: tableQrEnabled,
          selfOrderEnabled: tableSelfOrderEnabled,
          callWaiterEnabled: tableCallWaiterEnabled,
        });
        toast.success("Stol yangilandi");
      } else {
        const created = await tablesFeatureApi.create({
          name: tableName.trim(),
          seatsCount,
          qrEnabled: tableQrEnabled,
          selfOrderEnabled: tableSelfOrderEnabled,
          callWaiterEnabled: tableCallWaiterEnabled,
        });
        setQrModal(created.qr);
        toast.success("Stol qo'shildi va QR tayyorlandi");
      }

      setFormOpen(false);
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!canManageTables || !deleteTarget) return;

    setDeleting(true);
    try {
      await tablesFeatureApi.delete(deleteTarget.id);
      toast.deleted("Stol o'chirildi");
      setDeleteTarget(null);
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  const showQr = async (tableId: string) => {
    setQrBusyTableId(tableId);
    try {
      const qr = await tablesFeatureApi.getQr(tableId);
      setQrModal(qr);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setQrBusyTableId(null);
    }
  };

  const handlePrintQr = async (tableId: string) => {
    setQrBusyTableId(tableId);
    try {
      const qr = await tablesFeatureApi.getQr(tableId);
      setQrModal(qr);
      printTableQr(qr);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setQrBusyTableId(null);
    }
  };

  const handleRegenerateQr = async (tableId: string) => {
    if (
      !window.confirm("Yangi QR yaratilsa, eski QR ishlamaydi. Davom etasizmi?")
    ) {
      return;
    }

    setQrBusyTableId(tableId);
    try {
      const qr = await tablesFeatureApi.regenerateQr(tableId);
      setQrModal(qr);
      toast.success("Stol QR kodi yangilandi");
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setQrBusyTableId(null);
    }
  };

  const openOrderDetail = async (table: TableItem) => {
    setActiveTable(table);
    setProductSearch("");
    setSelectedCategory("all");
    setMobileTab("order");
    void loadGuestInbox(table.id);

    if (table.currentOrderId && canReadOrders) {
      try {
        const order = await ordersFeatureApi.getById(table.currentOrderId);
        setOrderModal(order);
        return;
      } catch (error: unknown) {
        toast.error(getErrorMessage(error));
      }
    }

    setOrderModal({
      id: "",
      branchId: table.branchId,
      tableId: table.id,
      tableName: table.name,
      waiterId: user?.id ?? "",
      waiterName: user?.name ?? roleLabel,
      status: "open",
      items: [],
      subtotal: 0,
      discount: 0,
      commissionPercent: activeBranchCommissionPercent,
      commission: 0,
      total: 0,
      createdAt: new Date().toISOString(),
    });
  };

  const handleCreateOrder = async () => {
    if (!orderModal || orderModal.items.length === 0 || !canAddProductsToOrder)
      return;

    if (isTakeoutDraft) {
      setClosing(true);
      try {
        await api.orders.createTakeout({
          ...orderModal,
          commissionPercent: 0,
          commission: 0,
          total: orderModal.subtotal - orderModal.discount,
        });
        toast.success("Olib ketish buyurtma yaratildi");
        await loadTables();
        closeOrderSheet();
      } catch (error: unknown) {
        toast.error(getErrorMessage(error));
      } finally {
        setClosing(false);
      }
      return;
    }

    setClosing(true);
    try {
      const created = await api.orders.create({
        branchId: orderModal.branchId,
        tableId: orderModal.tableId,
        tableName: orderModal.tableName,
        waiterId: orderModal.waiterId,
        waiterName: orderModal.waiterName,
        status: "open",
        items: orderModal.items,
        subtotal: orderModal.subtotal,
        discount: orderModal.discount,
        commissionPercent: orderModal.commissionPercent,
        commission: orderModal.commission,
        total: orderModal.total,
        createdAt: orderModal.createdAt,
      });
      toast.success("Buyurtma berildi");
      await Promise.all([loadTables(), loadGuestInbox(created.tableId)]);
      closeOrderSheet();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setClosing(false);
    }
  };

  const handleUpdateOrder = async () => {
    if (!orderModal || !orderModal.id || !canSubmitOrderChanges) return;

    setClosing(true);
    try {
      const result = await api.orders.updateItems(
        orderModal.id,
        orderModal.items,
      );

      if (result.deleted) {
        toast.success("Buyurtma bo'sh qolgani uchun bekor qilindi");
        await loadTables();
        closeOrderSheet();
        return;
      }

      if (!result.order) {
        throw new Error("Buyurtma ma'lumoti yangilanmadi");
      }

      toast.success("Buyurtma saqlandi");
      await loadTables();
      if (result.tableId) {
        await loadGuestInbox(result.tableId);
      }
      closeOrderSheet();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setClosing(false);
    }
  };

  const recalcOrderSummary = (items: Order["items"]) => {
    const subtotal = items.reduce(
      (sum, item) => sum + item.price * item.quantity,
      0,
    );
    const discount = orderModal?.discount ?? 0;
    const commissionPercent = orderModal?.commissionPercent ?? 0;
    const commission = Math.round((subtotal * commissionPercent) / 100);

    return {
      subtotal,
      commission,
      total: subtotal - discount + commission,
    };
  };

  const handleIncreaseItem = (itemId: string) => {
    if (!orderModal || !canSubmitOrderChanges) return;

    const items = orderModal.items.map((item) =>
      item.id === itemId
        ? {
            ...item,
            quantity: item.quantity + 1,
          }
        : item,
    );

    setOrderModal({
      ...orderModal,
      items,
      ...recalcOrderSummary(items),
    });
  };

  const handleDecreaseItem = (itemId: string) => {
    if (!orderModal || !canEditOrderItems) return;

    const item = orderModal.items.find((row) => row.id === itemId);
    if (!item) return;

    if (item.quantity <= 1) {
      setDeleteItemConfirm({ open: true, itemId });
      return;
    }

    const items = orderModal.items.map((row) =>
      row.id === itemId
        ? {
            ...row,
            quantity: row.quantity - 1,
          }
        : row,
    );

    setOrderModal({
      ...orderModal,
      items,
      ...recalcOrderSummary(items),
    });
  };

  const handleRemoveItem = (itemId: string) => {
    if (!canEditOrderItems) return;
    setDeleteItemConfirm({ open: true, itemId });
  };

  const confirmRemoveItem = () => {
    if (!orderModal || !deleteItemConfirm.itemId) return;

    const items = orderModal.items.filter(
      (item) => item.id !== deleteItemConfirm.itemId,
    );
    setOrderModal({
      ...orderModal,
      items,
      ...recalcOrderSummary(items),
    });
    setDeleteItemConfirm({ open: false, itemId: null });
  };

  const handleAddProduct = (product: Product) => {
    if (!orderModal || !canAddProductsToOrder) return;

    const existing = orderModal.items.find(
      (item) => item.productId === product.id && item.source !== "QR_CUSTOMER",
    );

    if (existing) {
      handleIncreaseItem(existing.id);
      return;
    }

    const newItem: OrderItem = {
      id: `tmp-${Date.now()}`,
      productId: product.id,
      productName: product.name,
      price: product.price,
      quantity: 1,
      source: "STAFF",
    };

    const items = [...orderModal.items, newItem];
    setOrderModal({
      ...orderModal,
      items,
      ...recalcOrderSummary(items),
    });
  };

  const handleAcceptOrder = async (requestId: string) => {
    setGuestBusyKey(`accept:${requestId}`);
    try {
      const { order } = await guestRequestsApi.acceptOrder(requestId);
      setOrderModal(order);
      toast.success("QR buyurtma qabul qilindi");
      await Promise.all([load(), loadGuestInbox(order.tableId)]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setGuestBusyKey(null);
    }
  };

  const handleRejectOrder = async (requestId: string) => {
    const reason = window.prompt("Rad etish sababi (ixtiyoriy)");
    if (reason === null) {
      return;
    }

    setGuestBusyKey(`reject:${requestId}`);
    try {
      await guestRequestsApi.rejectOrder(requestId, reason);
      toast.success("QR buyurtma rad etildi");
      if (activeTable) {
        await Promise.all([load(), loadGuestInbox(activeTable.id)]);
      } else {
        await load();
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setGuestBusyKey(null);
    }
  };

  const handleAcknowledgeCall = async (requestId: string) => {
    setGuestBusyKey(`ack:${requestId}`);
    try {
      await guestRequestsApi.acknowledgeServiceRequest(requestId);
      toast.success("Chaqiruv qabul qilindi");
      if (activeTable) {
        await Promise.all([load(), loadGuestInbox(activeTable.id)]);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setGuestBusyKey(null);
    }
  };

  const handleCompleteCall = async (requestId: string) => {
    setGuestBusyKey(`complete:${requestId}`);
    try {
      await guestRequestsApi.completeServiceRequest(requestId);
      toast.success("Chaqiruv bajarildi");
      if (activeTable) {
        await Promise.all([load(), loadGuestInbox(activeTable.id)]);
      }
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setGuestBusyKey(null);
    }
  };

  const handleAdvanceItemStatus = async (item: OrderItem) => {
    if (!orderModal?.id || !canHandleGuestActions) return;

    const currentStatus = item.fulfillmentStatus ?? "ACCEPTED";
    const nextStatus = nextFulfillmentStatus[currentStatus];
    if (!nextStatus) return;

    setGuestBusyKey(`item:${item.id}`);
    try {
      const updated = await ordersFeatureApi.updateFulfillmentStatus(
        orderModal.id,
        item.id,
        nextStatus,
      );
      setOrderModal(updated);
      toast.success(`Holat yangilandi: ${fulfillmentLabel[nextStatus]}`);
      await Promise.all([load(), loadGuestInbox(updated.tableId)]);
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setGuestBusyKey(null);
    }
  };

  const handleCloseOrder = async () => {
    if (!orderModal) return;

    const closedOrder = orderModal;
    const paidAtIso = new Date().toISOString();
    setClosing(true);

    try {
      await api.orders.close(closedOrder.id, paymentType, closedOrder.total);
      closeOrderSheet();
      toast.success("Buyurtma yopildi");

      try {
        await printReceipt({
          branchName: activeBranchName || "Filial",
          tableName: closedOrder.tableName,
          waiterName: closedOrder.waiterName,
          orderId: closedOrder.id,
          items: closedOrder.items,
          total: closedOrder.total,
          paymentType,
          paidAtIso,
        });
      } catch {
        toast.error(
          "Checkni chop etib bo'lmadi. Xprinter sozlamasini tekshiring",
        );
      }

      await loadTables();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setClosing(false);
    }
  };

  const branchProducts = useMemo(
    () =>
      products.filter(
        (product) => product.branchId === activeBranchId && product.isActive,
      ),
    [activeBranchId, products],
  );

  const branchCategories = useMemo(
    () => categories.filter((category) => category.branchId === activeBranchId),
    [activeBranchId, categories],
  );

  const filteredProducts = useMemo(() => {
    let list = branchProducts;

    if (selectedCategory !== "all") {
      list = list.filter((product) => product.categoryId === selectedCategory);
    }

    if (productSearch.trim()) {
      const query = productSearch.toLowerCase();
      list = list.filter((product) =>
        product.name.toLowerCase().includes(query),
      );
    }

    return list;
  }, [branchProducts, selectedCategory, productSearch]);

  const statusConfig = {
    empty: {
      label: "Bo'sh",
      badge: "success" as const,
      bg: "bg-emerald-50 border-emerald-200",
      num: "bg-emerald-100 text-emerald-700",
    },
    occupied: {
      label: "Band",
      badge: "danger" as const,
      bg: "bg-red-50 border-red-300",
      num: "bg-red-100 text-red-700",
    },
    closing: {
      label: "Nofaol",
      badge: "secondary" as const,
      bg: "bg-slate-100 border-slate-200",
      num: "bg-slate-200 text-slate-700",
    },
  };

  const renderDesktopOrderPanel = () => (
    <div className="flex h-full min-h-0 flex-col">
      <div className="mb-3 flex-shrink-0">
        {!isTakeoutDraft && (
          <GuestInboxPanel
            inbox={guestInbox}
            orderItems={orderModal?.items ?? []}
            canHandleActions={canHandleGuestActions}
            busyKey={guestBusyKey}
            onAcceptOrder={handleAcceptOrder}
            onRejectOrder={handleRejectOrder}
            onAcknowledgeCall={handleAcknowledgeCall}
            onCompleteCall={handleCompleteCall}
            onAdvanceItemStatus={handleAdvanceItemStatus}
          />
        )}
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto pr-1">
        {orderModal && orderModal.items.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center py-10 text-slate-400">
            <ShoppingCart className="mb-3 h-10 w-10 opacity-30" />
            <p className="text-sm">Hozircha mahsulot yo'q</p>
            <p className="mt-1 text-xs opacity-70">
              O'ng paneldan mahsulot qo'shing
            </p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-white">
              <tr className="border-b border-slate-100">
                <th className="py-2 text-left text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Mahsulot
                </th>
                <th className="w-24 py-2 text-center text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Miqdor
                </th>
                <th className="py-2 text-right text-xs font-semibold uppercase tracking-wide text-slate-400">
                  Jami
                </th>
                {canEditOrderItems && <th className="w-8 py-2" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orderModal?.items.map((item) => {
                const isQrItem = item.source === "QR_CUSTOMER";
                return (
                  <tr key={item.id}>
                    <td className="py-2.5 text-sm leading-tight text-slate-800">
                      <div>
                        <div className="flex flex-wrap items-center gap-2">
                          <span>{item.productName}</span>
                          {item.source === "QR_CUSTOMER" && (
                            <Badge variant="secondary" size="sm">
                              QR
                            </Badge>
                          )}
                          {item.fulfillmentStatus && (
                            <Badge
                              variant={fulfillmentVariant(
                                item.fulfillmentStatus,
                              )}
                              size="sm"
                            >
                              {fulfillmentLabel[item.fulfillmentStatus]}
                            </Badge>
                          )}
                        </div>
                        {item.note && (
                          <span className="mt-0.5 block text-[11px] italic text-amber-600">
                            Izoh: {item.note}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2.5">
                      {isQrItem ? (
                        <div className="text-center font-semibold text-slate-800">
                          {item.quantity}
                        </div>
                      ) : (
                        <div className="flex items-center justify-center gap-1">
                          {canEditOrderItems && (
                            <button
                              onClick={() => handleDecreaseItem(item.id)}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-sm font-bold leading-none text-slate-600 transition-colors hover:bg-slate-200"
                            >
                              −
                            </button>
                          )}
                          <span className="w-6 text-center text-sm font-semibold tabular-nums text-slate-800">
                            {item.quantity}
                          </span>
                          {canSubmitOrderChanges && (
                            <button
                              onClick={() => handleIncreaseItem(item.id)}
                              className="flex h-6 w-6 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold leading-none text-indigo-600 transition-colors hover:bg-indigo-200"
                            >
                              +
                            </button>
                          )}
                        </div>
                      )}
                    </td>
                    <td className="py-2.5 text-right text-sm font-medium tabular-nums text-slate-800">
                      {formatCurrency(item.price * item.quantity)}
                    </td>
                    {canEditOrderItems && (
                      <td className="py-2.5 pl-2">
                        {!isQrItem && (
                          <button
                            onClick={() => handleRemoveItem(item.id)}
                            className="flex h-6 w-6 items-center justify-center rounded-full bg-red-50 text-red-400 transition-colors hover:bg-red-100"
                            title="O'chirish"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        )}
                      </td>
                    )}
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      <div className="mt-3 flex-shrink-0 space-y-2.5 border-t border-slate-200 pt-3">
        <div className="space-y-1 mb-1">
          <div className="flex items-center justify-between">
            <span className="text-sm text-slate-500">Mahsulotlar:</span>
            <span className="text-sm tabular-nums text-slate-700">
              {formatCurrency(orderModal?.subtotal ?? 0)}
            </span>
          </div>
          {(orderModal?.discount ?? 0) > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">Chegirma:</span>
              <span className="text-sm tabular-nums text-emerald-600">
                -{formatCurrency(orderModal?.discount ?? 0)}
              </span>
            </div>
          )}
          {(orderModal?.commission ?? 0) > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500">
                Xizmat ({orderModal?.commissionPercent ?? 0}%):
              </span>
              <span className="text-sm tabular-nums text-amber-600">
                +{formatCurrency(orderModal?.commission ?? 0)}
              </span>
            </div>
          )}
          <div className="flex items-center justify-between border-t border-slate-100 pt-1">
            <span className="text-sm font-semibold text-slate-600">
              Jami summa:
            </span>
            <span className="text-lg font-bold tabular-nums text-indigo-600">
              {formatCurrency(orderModal?.total ?? 0)}
            </span>
          </div>
        </div>

        {orderModal?.id ? (
          <div className="space-y-2">
            {(canSubmitOrderChanges || canCloseOrders) && (
              <div className="flex gap-2">
                {canSubmitOrderChanges && (
                  <Button
                    className="flex-1"
                    isLoading={closing}
                    onClick={handleUpdateOrder}
                  >
                    Saqlash
                  </Button>
                )}
                {canCloseOrders && (
                  <Button
                    className="flex-1 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
                    disabled={!orderModal.items.length}
                    onClick={() => setPaymentOpen(true)}
                  >
                    To'lov qilish
                  </Button>
                )}
              </div>
            )}
            {!canSubmitOrderChanges && !canCloseOrders && (
              <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
                Buyurtmani o'zgartirish yoki yopish uchun ruxsat yetarli emas.
              </div>
            )}
          </div>
        ) : canAddProductsToOrder ? (
          <Button
            className="w-full"
            variant={isTakeoutDraft ? "outline" : "primary"}
            disabled={!orderModal?.items.length}
            isLoading={closing}
            onClick={handleCreateOrder}
          >
            {isTakeoutDraft ? "Olib ketish yaratish" : "Buyurtma berish"}
          </Button>
        ) : (
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-700">
            Bu stol uchun buyurtma ochish ruxsati yo'q.
          </div>
        )}
      </div>
    </div>
  );

  const renderTableModalActions = (compact = false) => {
    if (!canManageTables || !activeTable) {
      return null;
    }

    const baseButtonClass = compact
      ? "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-500 transition-colors hover:text-indigo-600 disabled:opacity-40"
      : "inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-600 transition-colors hover:text-indigo-600 disabled:opacity-40";

    const dangerButtonClass = compact
      ? "inline-flex h-8 w-8 items-center justify-center rounded-lg border border-red-200 bg-white text-red-400 transition-colors hover:bg-red-50"
      : "inline-flex items-center gap-1.5 rounded-lg border border-red-200 bg-white px-2.5 py-1.5 text-xs font-medium text-red-500 transition-colors hover:bg-red-50";

    return (
      <div className="flex flex-wrap items-center gap-1.5">
        <button
          type="button"
          onClick={() => openEdit(activeTable)}
          title="Tahrirlash"
          className={baseButtonClass}
        >
          <Edit2 className="h-3.5 w-3.5" />
          {!compact && <span>Tahrirlash</span>}
        </button>
        <button
          type="button"
          onClick={() => showQr(activeTable.id)}
          title="QR ko'rish"
          className={baseButtonClass}
        >
          <QrCode className="h-3.5 w-3.5" />
          {!compact && <span>QR ko'rish</span>}
        </button>
        <button
          type="button"
          disabled={qrBusyTableId === activeTable.id}
          onClick={() => handlePrintQr(activeTable.id)}
          title="Chop etish"
          className={baseButtonClass}
        >
          <Printer className="h-3.5 w-3.5" />
          {!compact && <span>Chop etish</span>}
        </button>
        <button
          type="button"
          disabled={qrBusyTableId === activeTable.id}
          onClick={() => handleRegenerateQr(activeTable.id)}
          title="Yangi QR"
          className={baseButtonClass}
        >
          <RefreshCcw className="h-3.5 w-3.5" />
          {!compact && <span>Yangi QR</span>}
        </button>
        <button
          type="button"
          onClick={() => setDeleteTarget(activeTable)}
          title="O'chirish"
          className={dangerButtonClass}
        >
          <Trash2 className="h-3.5 w-3.5" />
          {!compact && <span>O'chirish</span>}
        </button>
      </div>
    );
  };

  const renderDesktopProductPanel = () => {
    if (!canViewProducts) {
      return (
        <div className="flex h-full items-center justify-center rounded-2xl border border-dashed border-slate-200 text-sm text-slate-500">
          Mahsulotlarni ko'rish ruxsati yo'q
        </div>
      );
    }

    return (
      <div className="flex h-full min-h-0 flex-col">
        <div className="mb-3 flex-shrink-0">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              ref={desktopSearchInputRef}
              type="text"
              placeholder="Mahsulot qidirish..."
              value={productSearch}
              onChange={handleProductSearchChange("desktop")}
              className="w-full rounded-lg border border-slate-200 bg-slate-50 py-2 pl-9 pr-3 text-sm focus:border-indigo-400 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
          </div>
        </div>

        {branchCategories.length > 0 && (
          <div className="mb-3 flex flex-wrap gap-1.5 flex-shrink-0">
            <button
              onClick={() => setSelectedCategory("all")}
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                selectedCategory === "all"
                  ? "bg-indigo-600 text-white"
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200",
              )}
            >
              Barchasi
            </button>
            {branchCategories.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={clsx(
                  "rounded-full px-3 py-1 text-xs font-medium transition-colors",
                  selectedCategory === category.id
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                )}
              >
                {category.name}
              </button>
            ))}
          </div>
        )}

        <div className="min-h-0 flex-1 overflow-y-auto">
          {filteredProducts.length === 0 ? (
            <div className="flex h-full items-center justify-center text-sm text-slate-400">
              Mahsulot topilmadi
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2 pb-1 sm:grid-cols-3">
              {filteredProducts.map((product) => {
                const inOrder = orderModal?.items.find(
                  (item) => item.productId === product.id,
                );
                return (
                  <button
                    key={product.id}
                    type="button"
                    disabled={!canAddProductsToOrder}
                    onClick={() => handleAddProduct(product)}
                    className={clsx(
                      "relative flex h-full flex-col items-start rounded-2xl border p-3 text-left transition-all",
                      inOrder
                        ? "border-indigo-400 bg-indigo-50"
                        : "border-slate-200 hover:border-indigo-300 hover:bg-indigo-50",
                      !canAddProductsToOrder && "cursor-not-allowed opacity-60",
                    )}
                  >
                    {inOrder && (
                      <span className="absolute right-1.5 top-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-[10px] font-bold text-white">
                        {inOrder.quantity}
                      </span>
                    )}
                    {product.imageUrl && (
                      <img
                        src={product.imageUrl}
                        alt={product.name}
                        className="mb-2 h-24 w-full rounded-xl object-cover"
                      />
                    )}
                    <span className="line-clamp-2 pr-5 text-sm font-medium leading-tight text-slate-800">
                      {product.name}
                    </span>
                    {product.portionLabel && (
                      <span className="mt-1 text-xs text-slate-500">
                        {product.portionLabel}
                      </span>
                    )}
                    <span className="mt-1.5 text-xs text-indigo-600 font-semibold tabular-nums">
                      {formatCurrency(product.price)}
                    </span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="hidden items-center justify-between lg:flex">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Stollar</h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Faol filial:{" "}
            <span className="font-medium text-indigo-600">
              {activeBranchName}
            </span>
          </p>
        </div>
        {canManageTables && (
          <div className="flex items-center gap-3">
            <Button
              variant="outline"
              className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
              onClick={handleTakeoutClick}
            >
              <ShoppingBag className="mr-1.5 h-4 w-4" />
              Olib ketish
            </Button>
            <Button onClick={openCreate}>
              <Plus className="mr-1.5 h-4 w-4" />
              Stol qo'shish
            </Button>
          </div>
        )}
      </div>

      {canReadOrders && takeoutOrders.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-200 bg-amber-50/70 px-4 py-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">
                Olib ketish buyurtmalar
              </p>
            </div>
            <Badge variant="warning" size="sm">
              {takeoutOrders.length} ta faol
            </Badge>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {takeoutOrders.map((order) => {
              const totalQty = order.items.reduce(
                (sum, item) => sum + item.quantity,
                0,
              );
              return (
                <button
                  key={order.id}
                  type="button"
                  onClick={() => void openTakeoutOrder(order.id)}
                  className="rounded-2xl border border-amber-200 bg-white p-3.5 text-left shadow-sm transition-all hover:border-amber-300 hover:shadow-md"
                >
                  <div className="mb-3 flex items-start justify-between gap-3">
                    <div className="inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">
                      {order.tableName}
                    </div>
                    <ShoppingBag className="h-5 w-5 text-amber-600" />
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Mahsulotlar</span>
                      <span className="font-semibold text-slate-900">
                        {totalQty} ta
                      </span>
                    </div>
                    <div className="flex items-center justify-between">
                      <span className="text-slate-500">Jami</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(order.total)}
                      </span>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {loading ? (
        <GridSkeleton count={8} />
      ) : tables.length === 0 ? (
        <div className="rounded-xl border border-slate-200 bg-white py-16 text-center">
          <p className="text-sm text-slate-500">
            Bu filialda hali stollar yo'q
          </p>
          {canManageTables && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <Button
                variant="outline"
                className="border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:text-amber-800"
                onClick={handleTakeoutClick}
              >
                <ShoppingBag className="mr-1.5 h-4 w-4" />
                Olib ketish
              </Button>
              <Button onClick={openCreate}>
                <Plus className="mr-1.5 h-4 w-4" />
                Stol qo'shish
              </Button>
            </div>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
          {tables.map((table) => {
            const cfg = statusConfig[table.status] ?? statusConfig.empty;
            const hasSignals =
              (table.pendingQrOrdersCount ?? 0) > 0 ||
              (table.activeServiceRequestsCount ?? 0) > 0 ||
              (table.readyItemsCount ?? 0) > 0;

            return (
              <div
                key={table.id}
                className={clsx(
                  "group relative cursor-pointer rounded-2xl border-[3px] bg-white p-5 transition-all hover:shadow-md",
                  cfg.bg,
                )}
                onClick={() => void openOrderDetail(table)}
              >
                <div className="mb-4 flex items-start justify-between gap-3">
                  <div>
                    <div
                      className={clsx(
                        "mb-2 inline-flex rounded-full px-3 py-1 text-sm font-bold",
                        cfg.num,
                      )}
                    >
                      {table.name}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-500">
                      <Users className="h-3.5 w-3.5" />
                      <span>{table.seatsCount ?? 4} o'rin</span>
                    </div>
                  </div>
                  <Badge variant={cfg.badge} size="sm">
                    {cfg.label}
                  </Badge>
                </div>

                {/* Order info */}
                {table.status === "occupied" ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Mahsulotlar</span>
                      <span className="font-semibold text-slate-900">
                        {table.currentOrderItemCount ?? 0} ta
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-slate-500">Jami</span>
                      <span className="font-bold text-slate-900">
                        {formatCurrency(table.currentOrderTotal ?? 0)}
                      </span>
                    </div>
                    {table.currentOrderWaiterName && (
                      <div className="text-xs text-slate-400">
                        Girgitton:{" "}
                        <span className="font-medium text-slate-600">
                          {table.currentOrderWaiterName}
                        </span>
                      </div>
                    )}
                    {/* Signal badges */}
                    {hasSignals && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {(table.pendingQrOrdersCount ?? 0) > 0 && (
                          <Badge variant="warning" size="sm">
                            QR: {table.pendingQrOrdersCount}
                          </Badge>
                        )}
                        {(table.activeServiceRequestsCount ?? 0) > 0 && (
                          <Badge variant="warning" size="sm">
                            <BellRing className="mr-1 h-3 w-3" />
                            {table.activeServiceRequestsCount}
                          </Badge>
                        )}
                        {(table.readyItemsCount ?? 0) > 0 && (
                          <Badge variant="success" size="sm">
                            <CheckCircle2 className="mr-1 h-3 w-3" />
                            Tayyor: {table.readyItemsCount}
                          </Badge>
                        )}
                      </div>
                    )}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400">Bo'sh stol</p>
                )}

                {hasSignals && (
                  <div className="pointer-events-none absolute inset-0 rounded-2xl ring-2 ring-indigo-300/40" />
                )}
              </div>
            );
          })}
        </div>
      )}

      {!orderModal && canManageTables && (
        <button
          onClick={openCreate}
          className="fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-indigo-600 text-white shadow-lg transition-transform active:scale-95 lg:hidden"
          aria-label="Stol qo'shish"
        >
          <Plus className="h-7 w-7" />
        </button>
      )}

      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? "Stolni tahrirlash" : "Yangi stol"}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Stol nomi / raqami"
            placeholder="Masalan: T-1, VIP-1"
            value={tableName}
            onChange={(e) => {
              setTableName(e.target.value);
              setNameError("");
            }}
            error={nameError}
            required
          />

          <Input
            label="O'rinlar soni"
            type="number"
            min={1}
            value={tableSeatsCount}
            onChange={(e) => setTableSeatsCount(e.target.value)}
            required
          />

          <ToggleRow
            label="QR kod faol"
            description="Stol uchun QR link va preview ishlaydi"
            checked={tableQrEnabled}
            onToggle={() => setTableQrEnabled((current) => !current)}
          />
          <ToggleRow
            label="Self-order yoqilgan"
            description="Mijoz QR orqali savatchadan buyurtma bera oladi"
            checked={tableSelfOrderEnabled}
            onToggle={() => setTableSelfOrderEnabled((current) => !current)}
            disabled={!tableQrEnabled}
          />
          <ToggleRow
            label="Girgitton chaqiruvi yoqilgan"
            description="Mijoz QR sahifasidan xizmat chaqiruvi yubora oladi"
            checked={tableCallWaiterEnabled}
            onToggle={() => setTableCallWaiterEnabled((current) => !current)}
            disabled={!tableQrEnabled}
          />

          <div className="flex space-x-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setFormOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button type="submit" className="flex-1" isLoading={saving}>
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>

      {orderModal &&
        createPortal(
          <>
            <div className="hidden lg:block">
              <Modal
                isOpen={!!orderModal}
                onClose={closeOrderSheet}
                title={
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold text-slate-900">
                      {isTakeoutDraft
                        ? "Olib ketish buyurtma"
                        : `Stol: ${orderModal.tableName}`}
                    </span>
                    <span
                      className={clsx(
                        "inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold",
                        canSubmitOrderChanges
                          ? "border-indigo-200 bg-indigo-100 text-indigo-700"
                          : "border-amber-200 bg-amber-100 text-amber-700",
                      )}
                    >
                      {roleLabel}
                    </span>
                    {renderTableModalActions(false)}
                  </div>
                }
                size="xl"
                zIndexClass="z-[60]"
              >
                <div className="flex max-h-[680px] h-[calc(90vh-120px)] flex-col">
                  <div className="flex min-h-0 flex-1 gap-0">
                    <div className="flex min-h-0 w-[42%] flex-shrink-0 flex-col border-r border-slate-200 pr-5">
                      <p className="mb-3 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        {isTakeoutDraft
                          ? "Olib ketish buyurtma"
                          : "Buyurtma va QR inbox"}
                      </p>
                      {renderDesktopOrderPanel()}
                    </div>
                    <div className="flex min-h-0 flex-1 flex-col pl-5">
                      <p className="mb-3 flex-shrink-0 text-xs font-semibold uppercase tracking-wide text-slate-400">
                        Mahsulotlar
                      </p>
                      {renderDesktopProductPanel()}
                    </div>
                  </div>
                </div>
              </Modal>
            </div>

            <div className="fixed inset-0 z-[60] flex flex-col bg-slate-50 lg:hidden">
              <div className="flex flex-shrink-0 items-start justify-between border-b border-slate-200 bg-white px-4 py-3">
                <div className="min-w-0 space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-lg font-bold text-slate-900">
                      {isTakeoutDraft
                        ? "Olib ketish buyurtma"
                        : `Stol: ${orderModal.tableName}`}
                    </span>
                    <span className="inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600">
                      {roleLabel}
                    </span>
                  </div>
                  {renderTableModalActions(true)}
                </div>
                <button
                  onClick={closeOrderSheet}
                  className="-mr-2 p-2 text-slate-400 hover:text-slate-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              <div className="flex-shrink-0 border-b border-slate-200 bg-white px-4 py-2">
                <div className="flex rounded-lg bg-slate-100 p-1">
                  <button
                    onClick={() => setMobileTab("order")}
                    className={clsx(
                      "flex-1 rounded-md py-1.5 text-center text-sm font-medium transition-all",
                      mobileTab === "order"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500",
                    )}
                  >
                    Buyurtma ({orderModal.items.length})
                  </button>
                  <button
                    onClick={() => setMobileTab("products")}
                    className={clsx(
                      "flex-1 rounded-md py-1.5 text-center text-sm font-medium transition-all",
                      mobileTab === "products"
                        ? "bg-white text-slate-900 shadow-sm"
                        : "text-slate-500",
                    )}
                  >
                    Mahsulotlar
                  </button>
                </div>
              </div>

              <div className="min-h-0 flex-1 overflow-y-auto p-4">
                {mobileTab === "order" ? (
                  <div className="space-y-3 pb-20">
                    {!isTakeoutDraft && (
                      <GuestInboxPanel
                        inbox={guestInbox}
                        orderItems={orderModal.items}
                        canHandleActions={canHandleGuestActions}
                        busyKey={guestBusyKey}
                        onAcceptOrder={handleAcceptOrder}
                        onRejectOrder={handleRejectOrder}
                        onAcknowledgeCall={handleAcknowledgeCall}
                        onCompleteCall={handleCompleteCall}
                        onAdvanceItemStatus={handleAdvanceItemStatus}
                      />
                    )}

                    {orderModal.items.length === 0 ? (
                      <div className="py-10 text-center text-slate-400">
                        <ShoppingCart className="mx-auto mb-3 h-12 w-12 opacity-20" />
                        <p>Buyurtma bo'sh</p>
                      </div>
                    ) : (
                      orderModal.items.map((item) => {
                        const isQrItem = item.source === "QR_CUSTOMER";
                        return (
                          <div
                            key={item.id}
                            className="rounded-xl border border-slate-200 bg-white p-3 shadow-sm"
                          >
                            <div className="mb-3 flex items-start justify-between gap-3">
                              <div className="pr-3">
                                <div className="flex flex-wrap items-center gap-2">
                                  <p className="line-clamp-2 text-sm font-bold text-slate-900">
                                    {item.productName}
                                  </p>
                                  {item.source === "QR_CUSTOMER" && (
                                    <Badge variant="secondary" size="sm">
                                      QR
                                    </Badge>
                                  )}
                                  {item.fulfillmentStatus && (
                                    <Badge
                                      variant={fulfillmentVariant(
                                        item.fulfillmentStatus,
                                      )}
                                      size="sm"
                                    >
                                      {fulfillmentLabel[item.fulfillmentStatus]}
                                    </Badge>
                                  )}
                                </div>
                                {item.note && (
                                  <p className="mt-1 text-xs italic text-amber-600">
                                    Izoh: {item.note}
                                  </p>
                                )}
                              </div>
                              {isQrItem ? (
                                <div className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
                                  x{item.quantity}
                                </div>
                              ) : (
                                <div className="flex items-center gap-2 rounded-lg bg-slate-50 p-1">
                                  {canEditOrderItems && (
                                    <button
                                      onClick={() =>
                                        handleDecreaseItem(item.id)
                                      }
                                      className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white font-bold text-slate-600"
                                    >
                                      −
                                    </button>
                                  )}
                                  <span className="w-6 text-center text-sm font-bold text-slate-900">
                                    {item.quantity}
                                  </span>
                                  {canSubmitOrderChanges && (
                                    <button
                                      onClick={() =>
                                        handleIncreaseItem(item.id)
                                      }
                                      className="flex h-7 w-7 items-center justify-center rounded-md bg-indigo-600 font-bold text-white"
                                    >
                                      +
                                    </button>
                                  )}
                                </div>
                              )}
                            </div>
                            <div className="flex items-end justify-between">
                              <p className="text-xs text-slate-400">
                                {formatCurrency(item.price)}
                              </p>
                              <p className="text-sm font-semibold text-indigo-600">
                                Jami:{" "}
                                {formatCurrency(item.price * item.quantity)}
                              </p>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                ) : (
                  <div className="pb-20">
                    {!canViewProducts ? (
                      <div className="rounded-xl border border-dashed border-slate-200 bg-white py-12 text-center text-sm text-slate-500">
                        Mahsulotlarni ko'rish ruxsati yo'q
                      </div>
                    ) : (
                      <>
                        <div className="mb-3">
                          <input
                            ref={mobileSearchInputRef}
                            type="text"
                            placeholder="Mahsulot qidirish..."
                            value={productSearch}
                            onChange={handleProductSearchChange("mobile")}
                            className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                          />
                        </div>
                        {branchCategories.length > 0 && (
                          <div className="no-scrollbar mb-2 flex gap-2 overflow-x-auto pb-2">
                            <button
                              onClick={() => setSelectedCategory("all")}
                              className={clsx(
                                "flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                                selectedCategory === "all"
                                  ? "bg-indigo-600 text-white"
                                  : "border border-slate-200 bg-white text-slate-600",
                              )}
                            >
                              Barchasi
                            </button>
                            {branchCategories.map((category) => (
                              <button
                                key={category.id}
                                onClick={() => setSelectedCategory(category.id)}
                                className={clsx(
                                  "flex-shrink-0 rounded-full px-3 py-1.5 text-xs font-medium transition-colors",
                                  selectedCategory === category.id
                                    ? "bg-indigo-600 text-white"
                                    : "border border-slate-200 bg-white text-slate-600",
                                )}
                              >
                                {category.name}
                              </button>
                            ))}
                          </div>
                        )}
                        <div className="grid grid-cols-2 gap-3">
                          {filteredProducts.map((product) => {
                            const inOrder = orderModal.items.find(
                              (item) => item.productId === product.id,
                            );
                            return (
                              <button
                                key={product.id}
                                type="button"
                                disabled={!canAddProductsToOrder}
                                onClick={() => handleAddProduct(product)}
                                className={clsx(
                                  "relative flex h-full flex-col rounded-xl border bg-white p-3 text-left shadow-sm transition-all active:scale-95",
                                  inOrder
                                    ? "border-indigo-500 ring-1 ring-indigo-500"
                                    : "border-slate-200",
                                  !canAddProductsToOrder &&
                                    "cursor-not-allowed opacity-60",
                                )}
                              >
                                {inOrder && (
                                  <span className="absolute -right-2 -top-2 z-10 flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-xs font-bold text-white shadow-sm">
                                    {inOrder.quantity}
                                  </span>
                                )}
                                {product.imageUrl && (
                                  <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="mb-2 h-24 w-full rounded-xl object-cover"
                                  />
                                )}
                                <span className="mb-auto line-clamp-2 text-sm font-medium text-slate-900">
                                  {product.name}
                                </span>
                                {product.portionLabel && (
                                  <span className="mt-1 text-xs text-slate-500">
                                    {product.portionLabel}
                                  </span>
                                )}
                                <span className="mt-2 text-sm font-bold text-indigo-600">
                                  {formatCurrency(product.price)}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </>
                    )}
                  </div>
                )}
              </div>

              <div className="mb-[10px] mt-[10px] flex-shrink-0 border-t border-slate-200 bg-white p-4 pb-[env(safe-area-inset-bottom)] shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
                <div className="mb-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="text-sm text-slate-500">Mahsulotlar:</span>
                    <span className="text-sm tabular-nums text-slate-700">
                      {formatCurrency(orderModal.subtotal ?? 0)}
                    </span>
                  </div>
                  {(orderModal.discount ?? 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">Chegirma:</span>
                      <span className="text-sm tabular-nums text-emerald-600">
                        -{formatCurrency(orderModal.discount ?? 0)}
                      </span>
                    </div>
                  )}
                  {(orderModal.commission ?? 0) > 0 && (
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-slate-500">
                        Xizmat ({orderModal.commissionPercent ?? 0}%):
                      </span>
                      <span className="text-sm tabular-nums text-amber-600">
                        +{formatCurrency(orderModal.commission ?? 0)}
                      </span>
                    </div>
                  )}
                  <div className="flex items-center justify-between border-t border-slate-100 pt-1">
                    <span className="text-sm font-medium text-slate-500">
                      Jami summa
                    </span>
                    <span className="text-xl font-bold text-indigo-600">
                      {formatCurrency(orderModal.total)}
                    </span>
                  </div>
                </div>
                {orderModal.id ? (
                  <div className="flex gap-3">
                    {canSubmitOrderChanges && (
                      <Button
                        variant="secondary"
                        className="flex-1 h-12 rounded-xl"
                        isLoading={closing}
                        onClick={handleUpdateOrder}
                      >
                        Saqlash
                      </Button>
                    )}
                    {canCloseOrders && (
                      <Button
                        className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                        disabled={!orderModal.items.length}
                        onClick={() => setPaymentOpen(true)}
                      >
                        To'lov qilish
                      </Button>
                    )}
                    {!canSubmitOrderChanges && !canCloseOrders && (
                      <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-700">
                        Buyurtmani o'zgartirish yoki yopish uchun ruxsat yetarli
                        emas.
                      </div>
                    )}
                  </div>
                ) : canAddProductsToOrder ? (
                  <Button
                    className="w-full h-12 rounded-xl"
                    variant={isTakeoutDraft ? "outline" : "primary"}
                    disabled={!orderModal.items.length}
                    isLoading={closing}
                    onClick={handleCreateOrder}
                  >
                    {isTakeoutDraft
                      ? "Olib ketish yaratish"
                      : "Buyurtma berish"}
                  </Button>
                ) : (
                  <div className="w-full rounded-xl border border-amber-200 bg-amber-50 px-3 py-3 text-xs text-amber-700">
                    Bu stol uchun buyurtma ochish ruxsati yo'q.
                  </div>
                )}
              </div>
            </div>
          </>,
          document.body,
        )}

      <Modal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="To'lovni qabul qilish"
        size="sm"
      >
        <div className="space-y-5">
          <div className="py-2 text-center">
            <p className="mb-1 text-sm text-slate-500">To'lov summasi</p>
            <p className="text-3xl font-bold text-indigo-600">
              {orderModal && formatCurrency(orderModal.total)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(
              [
                ["cash", "Naqd", Banknote],
                ["card", "Karta", CreditCard],
                ["transfer", "O'tkazma", Smartphone],
              ] as const
            ).map(([value, label, Icon]) => (
              <button
                key={value}
                onClick={() => setPaymentType(value)}
                className={clsx(
                  "flex flex-col items-center rounded-xl border-2 p-4 transition-all",
                  paymentType === value
                    ? "border-indigo-500 bg-indigo-50 text-indigo-700"
                    : "border-slate-200 text-slate-600 hover:border-slate-300",
                )}
              >
                <Icon className="mb-1.5 h-6 w-6" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            ))}
          </div>
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setPaymentOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button
              className="flex-1"
              isLoading={closing}
              onClick={handleCloseOrder}
            >
              Tasdiqlash
            </Button>
          </div>
        </div>
      </Modal>

      <Modal
        isOpen={!!qrModal}
        onClose={() => setQrModal(null)}
        title={qrModal ? `${qrModal.tableName} QR kodi` : "Stol QR kodi"}
        size="sm"
      >
        {qrModal && (
          <div className="space-y-4">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-center">
              <div
                className="mx-auto mb-3 flex w-full max-w-[260px] items-center justify-center rounded-2xl bg-white p-4 shadow-sm"
                dangerouslySetInnerHTML={{ __html: qrModal.svgMarkup }}
              />
              <p className="text-sm font-semibold text-slate-900">
                {qrModal.tableName}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Buyurtma berish uchun skaner qiling
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-white px-3 py-3 text-xs text-slate-500">
              <p className="mb-1 font-medium text-slate-700">Public URL</p>
              <p className="break-all">{qrModal.publicUrl}</p>
            </div>

            <div className="grid grid-cols-2 gap-3 text-xs text-slate-600">
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="block text-slate-400">QR versiya</span>
                <span className="font-semibold text-slate-900">
                  v{qrModal.qrVersion}
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-slate-50 px-3 py-2">
                <span className="block text-slate-400">Yaratilgan</span>
                <span className="font-semibold text-slate-900">
                  {formatActivityTime(qrModal.qrLastGeneratedAt)}
                </span>
              </div>
            </div>

            <div className="flex flex-wrap gap-3">
              <Button
                type="button"
                className="flex-1"
                onClick={() => printTableQr(qrModal)}
              >
                <Printer className="mr-1.5 h-4 w-4" />
                Chop etish
              </Button>
              <Button
                type="button"
                variant="secondary"
                className="flex-1"
                onClick={() =>
                  window.open(
                    qrModal.publicUrl,
                    "_blank",
                    "noopener,noreferrer",
                  )
                }
              >
                <QrCode className="mr-1.5 h-4 w-4" />
                QR sahifa
              </Button>
            </div>

            {canManageTables && (
              <Button
                type="button"
                variant="secondary"
                className="w-full"
                isLoading={qrBusyTableId === qrModal.tableId}
                onClick={() => void handleRegenerateQr(qrModal.tableId)}
              >
                <RefreshCcw className="mr-1.5 h-4 w-4" />
                Yangi QR yaratish
              </Button>
            )}
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={deleteItemConfirm.open}
        onClose={() => setDeleteItemConfirm({ open: false, itemId: null })}
        onConfirm={confirmRemoveItem}
        title="Mahsulotni o'chirmoqchimisiz?"
        message="Bu mahsulot buyurtmadan butunlay o'chiriladi."
        confirmText="Tasdiqlash"
      />

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Stolni o'chirish"
        message={`"${deleteTarget?.name}" stolni o'chirishni tasdiqlaysizmi?`}
        isLoading={deleting}
      />
    </div>
  );
}
