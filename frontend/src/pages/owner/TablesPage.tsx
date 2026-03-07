import { useEffect, useMemo, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { GridSkeleton } from '../../components/ui/LoadingSkeleton';
import { toast } from '../../components/ui/Toast';
import {
  Plus,
  Edit2,
  Trash2,
  Banknote,
  CreditCard,
  Smartphone,
  Search,
  ShoppingCart,
  X } from
'lucide-react';
import { api } from '../../lib/api';
import { Category, Product, TableItem, Order } from '../../lib/types';
import { formatCurrency } from '../../lib/formatters';
import { printReceipt } from '../../lib/receiptPrinter';
import { clsx } from 'clsx';
import { getAuth } from '../../lib/auth';
interface TablesPageProps {
  activeBranchId: string;
  activeBranchName: string;
}
export function TablesPage({
  activeBranchId,
  activeBranchName
}: TablesPageProps) {
  const auth = getAuth();
  const user = auth.user;
  const isOwner = user?.role === 'owner';
  // ── Table list state ──────────────────────────────────────────────────────
  const [tables, setTables] = useState<TableItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  // ── Table form modal ──────────────────────────────────────────────────────
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<TableItem | null>(null);
  const [tableName, setTableName] = useState('');
  const [nameError, setNameError] = useState('');
  const [saving, setSaving] = useState(false);
  // ── Delete table ──────────────────────────────────────────────────────────
  const [deleteTarget, setDeleteTarget] = useState<TableItem | null>(null);
  const [deleting, setDeleting] = useState(false);
  // ── Order modal ───────────────────────────────────────────────────────────
  const [orderModal, setOrderModal] = useState<Order | null>(null);
  const [mobileTab, setMobileTab] = useState<'order' | 'products'>('order');
  // ── Product search / filter ───────────────────────────────────────────────
  const [productSearch, setProductSearch] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  // ── Payment modal ─────────────────────────────────────────────────────────
  const [paymentOpen, setPaymentOpen] = useState(false);
  const [paymentType, setPaymentType] = useState<'cash' | 'card' | 'transfer'>(
    'cash'
  );
  const [closing, setClosing] = useState(false);
  // ── Delete item confirm ───────────────────────────────────────────────────
  const [deleteItemConfirm, setDeleteItemConfirm] = useState<{
    open: boolean;
    itemId: string | null;
  }>({
    open: false,
    itemId: null
  });
  // ── Load tables ───────────────────────────────────────────────────────────
  const load = async () => {
    setLoading(true);
    try {
      const [tablesData, productsData, categoriesData] = await Promise.all([
      api.tables.listByBranch(activeBranchId),
      api.products.listByBranch(activeBranchId),
      api.categories.listByBranch(activeBranchId)]
      );

      setTables(tablesData);
      setProducts(productsData.filter((product) => product.isActive));
      setCategories(categoriesData);
    } catch {
      setTables([]);
      setProducts([]);
      setCategories([]);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    void load();
  }, [activeBranchId]);
  // ── Table form ────────────────────────────────────────────────────────────
  const openCreate = () => {
    setEditing(null);
    setTableName('');
    setNameError('');
    setFormOpen(true);
  };
  const openEdit = (t: TableItem) => {
    setEditing(t);
    setTableName(t.name);
    setNameError('');
    setFormOpen(true);
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!tableName.trim()) {
      setNameError("Bu maydon to'ldirilishi shart");
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await api.tables.update(editing.id, {
          name: tableName
        });
        toast.success('Stol yangilandi');
      } else {
        await api.tables.create({
          branchId: activeBranchId,
          name: tableName,
          status: 'empty'
        });
        toast.success("Stol qo'shildi");
      }
      setFormOpen(false);
      load();
    } catch {
      toast.error();
    } finally {
      setSaving(false);
    }
  };
  // ── Delete table ──────────────────────────────────────────────────────────
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.tables.delete(deleteTarget.id);
      toast.deleted("Stol o'chirildi");
      setDeleteTarget(null);
      load();
    } catch {
      toast.error();
    } finally {
      setDeleting(false);
    }
  };
  // ── Open order modal ──────────────────────────────────────────────────────
  const openOrderDetail = async (t: TableItem) => {
    setProductSearch('');
    setSelectedCategory('all');
    setMobileTab('order');
    if (t.currentOrderId) {
      const order = await api.orders.getById(t.currentOrderId);
      setOrderModal(order);
    } else {
      // Empty table — create a blank in-memory draft
      setOrderModal({
        id: '',
        branchId: t.branchId,
        tableId: t.id,
        tableName: t.name,
        waiterId: user?.id ?? '',
        waiterName: user?.name ?? '',
        status: 'open',
        items: [],
        total: 0,
        createdAt: new Date().toISOString()
      });
    }
  };
  // ── Create new order (empty table) ───────────────────────────────────────
  const handleCreateOrder = async () => {
    if (!orderModal || orderModal.items.length === 0) return;
    setClosing(true);
    try {
      await api.orders.create({
        branchId: orderModal.branchId,
        tableId: orderModal.tableId,
        tableName: orderModal.tableName,
        waiterId: orderModal.waiterId,
        waiterName: orderModal.waiterName,
        status: 'open',
        items: orderModal.items,
        total: orderModal.total,
        createdAt: orderModal.createdAt
      });
      toast.success('Buyurtma berildi');
      setOrderModal(null);
      load();
    } catch {
      toast.error();
    } finally {
      setClosing(false);
    }
  };
  // ── Update existing order items ───────────────────────────────────────────
  const handleUpdateOrder = async () => {
    if (!orderModal || !orderModal.id) return;
    setClosing(true);
    try {
      await api.orders.updateItems(orderModal.id, orderModal.items);
      toast.success('Buyurtma yangilandi');
      load();
    } catch {
      toast.error();
    } finally {
      setClosing(false);
    }
  };
  // ── Item manipulation ─────────────────────────────────────────────────────
  const recalcTotal = (items: Order['items']) =>
  items.reduce((s, i) => s + i.price * i.quantity, 0);
  const handleIncreaseItem = (itemId: string) => {
    if (!orderModal) return;
    const items = orderModal.items.map((i) =>
    i.id === itemId ?
    {
      ...i,
      quantity: i.quantity + 1
    } :
    i
    );
    setOrderModal({
      ...orderModal,
      items,
      total: recalcTotal(items)
    });
  };
  const handleDecreaseItem = (itemId: string) => {
    if (!orderModal || !isOwner) return;
    const item = orderModal.items.find((i) => i.id === itemId);
    if (!item) return;
    if (item.quantity <= 1) {
      setDeleteItemConfirm({
        open: true,
        itemId
      });
      return;
    }
    const items = orderModal.items.map((i) =>
    i.id === itemId ?
    {
      ...i,
      quantity: i.quantity - 1
    } :
    i
    );
    setOrderModal({
      ...orderModal,
      items,
      total: recalcTotal(items)
    });
  };
  const handleRemoveItem = (itemId: string) => {
    if (!isOwner) return;
    setDeleteItemConfirm({
      open: true,
      itemId
    });
  };
  const confirmRemoveItem = () => {
    if (!orderModal || !deleteItemConfirm.itemId) return;
    const items = orderModal.items.filter(
      (i) => i.id !== deleteItemConfirm.itemId
    );
    setOrderModal({
      ...orderModal,
      items,
      total: recalcTotal(items)
    });
    setDeleteItemConfirm({
      open: false,
      itemId: null
    });
  };
  const handleAddProduct = (product: Product) => {
    if (!orderModal) return;
    const existing = orderModal.items.find((i) => i.productId === product.id);
    if (existing) {
      handleIncreaseItem(existing.id);
    } else {
      const newItem = {
        id: `tmp-${Date.now()}`,
        productId: product.id,
        productName: product.name,
        price: product.price,
        quantity: 1
      };
      const items = [...orderModal.items, newItem];
      setOrderModal({
        ...orderModal,
        items,
        total: recalcTotal(items)
      });
    }
    // Switch to order tab on mobile after adding
    setMobileTab('order');
  };
  // ── Close existing order / payment ────────────────────────────────────────
  const handleCloseOrder = async () => {
    if (!orderModal) return;
    const closedOrder = orderModal;
    const paidAtIso = new Date().toISOString();

    setClosing(true);
    try {
      await api.orders.close(closedOrder.id, paymentType, closedOrder.total);
      toast.success('Buyurtma yopildi');

      try {
        await printReceipt({
          branchName: activeBranchName || 'Filial',
          tableName: closedOrder.tableName,
          waiterName: closedOrder.waiterName,
          orderId: closedOrder.id,
          items: closedOrder.items,
          total: closedOrder.total,
          paymentType,
          paidAtIso
        });
      } catch {
        toast.error("Checkni chop etib bo'lmadi. Xprinter sozlamasini tekshiring");
      }

      setPaymentOpen(false);
      setOrderModal(null);
      load();
    } catch {
      toast.error();
    } finally {
      setClosing(false);
    }
  };
  // ── Derived product list ──────────────────────────────────────────────────
  const branchProducts = useMemo(
    () =>
    products.filter((p) => p.branchId === activeBranchId && p.isActive),
    [activeBranchId, products]
  );
  const branchCategories = useMemo(
    () => categories.filter((c) => c.branchId === activeBranchId),
    [activeBranchId, categories]
  );
  const filteredProducts = useMemo(() => {
    let list = branchProducts;
    if (selectedCategory !== 'all') {
      list = list.filter((p) => p.categoryId === selectedCategory);
    }
    if (productSearch.trim()) {
      const q = productSearch.toLowerCase();
      list = list.filter((p) => p.name.toLowerCase().includes(q));
    }
    return list;
  }, [branchProducts, selectedCategory, productSearch]);
  // ── Status config ────────────────────────────────────────────────────────
  const statusConfig = {
    empty: {
      label: "Bo'sh",
      badge: 'success' as const,
      bg: 'bg-emerald-50 border-emerald-200',
      num: 'bg-emerald-100 text-emerald-700'
    },
    occupied: {
      label: 'Band',
      badge: 'warning' as const,
      bg: 'bg-amber-50 border-amber-200',
      num: 'bg-amber-100 text-amber-700'
    },
    closing: {
      label: 'Band',
      badge: 'warning' as const,
      bg: 'bg-amber-50 border-amber-200',
      num: 'bg-amber-100 text-amber-700'
    }
  };
  // ─────────────────────────────────────────────────────────────────────────
  // DESKTOP PANELS (Legacy)
  // ─────────────────────────────────────────────────────────────────────────
  const DesktopOrderPanel = () =>
  <div className="flex flex-col h-full min-h-0">
      <div className="flex-1 overflow-y-auto min-h-0 pr-1">
        {orderModal && orderModal.items.length === 0 ?
      <div className="flex flex-col items-center justify-center h-full py-10 text-slate-400">
            <ShoppingCart className="w-10 h-10 mb-3 opacity-30" />
            <p className="text-sm">Hozircha mahsulot yo'q</p>
            <p className="text-xs mt-1 opacity-70">
              O'ng paneldan mahsulot qo'shing
            </p>
          </div> :

      <table className="w-full text-sm">
            <thead className="sticky top-0 bg-white z-10">
              <tr className="border-b border-slate-100">
                <th className="py-2 text-left text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Mahsulot
                </th>
                <th className="py-2 text-center text-xs font-semibold text-slate-400 uppercase tracking-wide w-24">
                  Miqdor
                </th>
                <th className="py-2 text-right text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Jami
                </th>
                {isOwner && <th className="py-2 w-8" />}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {orderModal?.items.map((item) =>
          <tr key={item.id}>
                  <td className="py-2.5 text-slate-800 text-sm leading-tight">
                    {item.productName}
                  </td>
                  <td className="py-2.5">
                    <div className="flex items-center justify-center gap-1">
                      {isOwner &&
                <button
                  onClick={() => handleDecreaseItem(item.id)}
                  className="w-6 h-6 rounded-full bg-slate-100 hover:bg-slate-200 flex items-center justify-center text-slate-600 font-bold text-sm leading-none transition-colors">

                          −
                        </button>
                }
                      <span className="w-6 text-center font-semibold text-slate-800 tabular-nums text-sm">
                        {item.quantity}
                      </span>
                      <button
                  onClick={() => handleIncreaseItem(item.id)}
                  className="w-6 h-6 rounded-full bg-indigo-100 hover:bg-indigo-200 flex items-center justify-center text-indigo-600 font-bold text-sm leading-none transition-colors">

                        +
                      </button>
                    </div>
                  </td>
                  <td className="py-2.5 text-right font-medium text-slate-800 tabular-nums text-sm">
                    {formatCurrency(item.price * item.quantity)}
                  </td>
                  {isOwner &&
            <td className="py-2.5 pl-2">
                      <button
                onClick={() => handleRemoveItem(item.id)}
                className="w-6 h-6 rounded-full bg-red-50 hover:bg-red-100 flex items-center justify-center text-red-400 transition-colors"
                title="O'chirish">

                        <Trash2 className="w-3 h-3" />
                      </button>
                    </td>
            }
                </tr>
          )}
            </tbody>
          </table>
      }
      </div>

      <div className="border-t border-slate-200 pt-3 mt-3 space-y-2.5 flex-shrink-0">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm font-semibold text-slate-600">
            Jami summa:
          </span>
          <span className="text-lg font-bold text-indigo-600 tabular-nums">
            {formatCurrency(orderModal?.total ?? 0)}
          </span>
        </div>

        {isOwner ?
      <div className="flex flex-col gap-2">
            {orderModal?.id ?
        <div className="flex gap-2">
                <Button
            className="flex-1"
            variant="secondary"
            isLoading={closing}
            onClick={async () => {
              if (!orderModal) return;
              setClosing(true);
              try {
                await api.orders.updateItems(
                  orderModal.id,
                  orderModal.items
                );
                toast.success('Buyurtma saqlandi');
                setOrderModal(null);
                load();
              } catch {
                toast.error();
              } finally {
                setClosing(false);
              }
            }}>

                  Saqlash
                </Button>
                <Button
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 focus:ring-emerald-500"
            disabled={!orderModal.items.length}
            onClick={() => setPaymentOpen(true)}>

                  💳 Yopish
                </Button>
              </div> :

        <Button
          className="w-full"
          disabled={!orderModal?.items.length}
          isLoading={closing}
          onClick={handleCreateOrder}>

                Buyurtma berish
              </Button>
        }
          </div> :

      <div className="flex flex-col gap-2">
            <Button
          className="w-full"
          isLoading={closing}
          disabled={orderModal?.items.length === 0}
          onClick={async () => {
            if (!orderModal || orderModal.items.length === 0) return;
            if (orderModal.id) {
              await handleUpdateOrder();
            } else {
              await handleCreateOrder();
            }
          }}>

              Buyurtma berish
            </Button>
            <div className="flex items-center gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
              <p className="text-xs text-amber-700">
                Buyurtmani yopish faqat administrator tomonidan amalga
                oshiriladi.
              </p>
            </div>
          </div>
      }
      </div>
    </div>;

  const DesktopProductPanel = () =>
  <div className="flex flex-col h-full min-h-0">
      <div className="mb-3 flex-shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
          type="text"
          placeholder="Mahsulot qidirish..."
          value={productSearch}
          onChange={(e) => setProductSearch(e.target.value)}
          className="w-full pl-9 pr-3 py-2 text-sm border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400 bg-slate-50" />

        </div>
      </div>

      {branchCategories.length > 0 &&
    <div className="flex gap-1.5 flex-wrap mb-3 flex-shrink-0">
          <button
        onClick={() => setSelectedCategory('all')}
        className={clsx(
          'px-3 py-1 rounded-full text-xs font-medium transition-colors',
          selectedCategory === 'all' ?
          'bg-indigo-600 text-white' :
          'bg-slate-100 text-slate-600 hover:bg-slate-200'
        )}>

            Barchasi
          </button>
          {branchCategories.map((cat) =>
      <button
        key={cat.id}
        onClick={() => setSelectedCategory(cat.id)}
        className={clsx(
          'px-3 py-1 rounded-full text-xs font-medium transition-colors',
          selectedCategory === cat.id ?
          'bg-indigo-600 text-white' :
          'bg-slate-100 text-slate-600 hover:bg-slate-200'
        )}>

              {cat.name}
            </button>
      )}
        </div>
    }

      <div className="flex-1 overflow-y-auto min-h-0">
        {filteredProducts.length === 0 ?
      <div className="flex items-center justify-center h-full text-slate-400 text-sm">
            Mahsulot topilmadi
          </div> :

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pb-1">
            {filteredProducts.map((product) => {
          const inOrder = orderModal?.items.find(
            (i) => i.productId === product.id
          );
          return (
            <button
              key={product.id}
              onClick={() => handleAddProduct(product)}
              className={clsx(
                'relative flex flex-col items-start p-3 rounded-xl border transition-all text-left',
                inOrder ?
                'border-indigo-400 bg-indigo-50' :
                'border-slate-200 hover:border-indigo-300 hover:bg-indigo-50'
              )}>

                  {inOrder &&
              <span className="absolute top-1.5 right-1.5 bg-indigo-600 text-white text-[10px] font-bold w-4 h-4 rounded-full flex items-center justify-center tabular-nums">
                      {inOrder.quantity}
                    </span>
              }
                  <span className="text-sm font-medium text-slate-800 leading-tight line-clamp-2 pr-5">
                    {product.name}
                  </span>
                  <span className="text-xs text-indigo-600 font-semibold mt-1.5 tabular-nums">
                    {formatCurrency(product.price)}
                  </span>
                </button>);

        })}
          </div>
      }
      </div>
    </div>;

  return (
    <div className="space-y-6">
      {/* Header (Desktop Only) */}
      <div className="hidden lg:flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-slate-900">Stollar</h1>
          <p className="text-sm text-slate-500 mt-0.5">
            Faol filial:{' '}
            <span className="font-medium text-indigo-600">
              {activeBranchName}
            </span>
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="h-4 w-4 mr-1.5" />
          Stol qo'shish
        </Button>
      </div>

      {/* Table grid */}
      {loading ?
      <GridSkeleton count={8} /> :
      tables.length === 0 ?
      <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <p className="text-slate-500 text-sm">
            Bu filialda hali stollar yo'q
          </p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Stol qo'shish
          </Button>
        </div> :

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {tables.map((t) => {
          const cfg = statusConfig[t.status] ?? statusConfig.empty;
          return (
            <div
              key={t.id}
              className={clsx(
                'group relative bg-white rounded-2xl border-2 p-5 flex flex-col items-center transition-all cursor-pointer hover:shadow-md',
                cfg.bg
              )}
              onClick={() => openOrderDetail(t)}>

                <div
                className="absolute top-2.5 right-2.5 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity"
                onClick={(e) => e.stopPropagation()}>

                  <button
                  onClick={() => openEdit(t)}
                  className="p-1.5 bg-white rounded-lg shadow-sm text-slate-400 hover:text-indigo-600 transition-colors">

                    <Edit2 className="h-3 w-3" />
                  </button>
                  <button
                  onClick={() => setDeleteTarget(t)}
                  className="p-1.5 bg-white rounded-lg shadow-sm text-slate-400 hover:text-red-600 transition-colors">

                    <Trash2 className="h-3 w-3" />
                  </button>
                </div>
                <div
                className={clsx(
                  'h-14 w-14 rounded-full flex items-center justify-center text-xl font-bold mb-3',
                  cfg.num
                )}>

                  {t.name}
                </div>
                <Badge variant={cfg.badge} size="sm">
                  {cfg.label}
                </Badge>
              </div>);

        })}
        </div>
      }

      {/* Mobile FAB — Stol qo'shish (only visible on mobile, hidden when order sheet is open) */}
      {!orderModal &&
      <button
        onClick={openCreate}
        className="lg:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Stol qo'shish">

          <Plus className="h-7 w-7" />
        </button>
      }

      {/* ── Table form modal ─────────────────────────────────────────────── */}
      <Modal
        isOpen={formOpen}
        onClose={() => setFormOpen(false)}
        title={editing ? 'Stolni tahrirlash' : 'Yangi stol'}
        size="sm">

        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Stol nomi/raqami"
            placeholder="Masalan: T-1, VIP-1"
            value={tableName}
            onChange={(e) => {
              setTableName(e.target.value);
              setNameError('');
            }}
            error={nameError}
            required />

          <div className="flex space-x-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setFormOpen(false)}>

              Bekor qilish
            </Button>
            <Button type="submit" className="flex-1" isLoading={saving}>
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>

      {/* ── Order Modal / Sheet ──────────────────────────────────────────── */}
      {orderModal &&
      <>
          {/* Desktop Modal */}
          <div className="hidden lg:block">
            <Modal
            isOpen={!!orderModal}
            onClose={() => setOrderModal(null)}
            title={
            <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-900">
                    Stol: {orderModal.tableName}
                  </span>
                  <span
                className={clsx(
                  'inline-flex items-center text-xs font-semibold px-2.5 py-1 rounded-full border',
                  isOwner ?
                  'bg-indigo-100 text-indigo-700 border-indigo-200' :
                  'bg-amber-100 text-amber-700 border-amber-200'
                )}>

                    {isOwner ? '👑 Admin' : '🧑‍🍳 Ofitsant'}
                  </span>
                </div>
            }
            size="xl">

              <div
              className="flex flex-col"
              style={{
                height: 'calc(90vh - 120px)',
                maxHeight: '640px'
              }}>

                <div className="flex gap-0 flex-1 min-h-0">
                  <div className="w-[40%] flex-shrink-0 border-r border-slate-200 pr-5 flex flex-col min-h-0">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex-shrink-0">
                      Buyurtma
                    </p>
                    <DesktopOrderPanel />
                  </div>
                  <div className="flex-1 pl-5 flex flex-col min-h-0">
                    <p className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-3 flex-shrink-0">
                      Mahsulotlar
                    </p>
                    <DesktopProductPanel />
                  </div>
                </div>
              </div>
            </Modal>
          </div>

          {/* Mobile Full-Screen Sheet */}
          <div className="lg:hidden fixed inset-0 z-[60] bg-slate-50 flex flex-col">
            {/* Mobile Sheet Header */}
            <div className="bg-white border-b border-slate-200 px-4 py-3 flex justify-between items-center flex-shrink-0">
              <div className="flex items-center gap-2">
                <span className="font-bold text-slate-900 text-lg">
                  Stol: {orderModal.tableName}
                </span>
                <span className="inline-flex items-center text-xs font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {isOwner ? 'Admin' : 'Ofitsant'}
                </span>
              </div>
              <button
              onClick={() => setOrderModal(null)}
              className="p-2 -mr-2 text-slate-400 hover:text-slate-600">

                <X className="h-6 w-6" />
              </button>
            </div>

            {/* Mobile Tabs */}
            <div className="bg-white px-4 py-2 border-b border-slate-200 flex-shrink-0">
              <div className="flex bg-slate-100 p-1 rounded-lg">
                <button
                onClick={() => setMobileTab('order')}
                className={clsx(
                  'flex-1 py-1.5 text-sm font-medium rounded-md text-center transition-all',
                  mobileTab === 'order' ?
                  'bg-white text-slate-900 shadow-sm' :
                  'text-slate-500'
                )}>

                  Buyurtma ({orderModal.items.length})
                </button>
                <button
                onClick={() => setMobileTab('products')}
                className={clsx(
                  'flex-1 py-1.5 text-sm font-medium rounded-md text-center transition-all',
                  mobileTab === 'products' ?
                  'bg-white text-slate-900 shadow-sm' :
                  'text-slate-500'
                )}>

                  Mahsulotlar
                </button>
              </div>
            </div>

            {/* Mobile Content */}
            <div className="flex-1 overflow-y-auto p-4 min-h-0">
              {mobileTab === 'order' ?
            <div className="space-y-3 pb-20">
                  {orderModal.items.length === 0 ?
              <div className="text-center py-10 text-slate-400">
                      <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-20" />
                      <p>Buyurtma bo'sh</p>
                    </div> :

              orderModal.items.map((item) =>
              <div
                key={item.id}
                className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">

                        <div className="flex justify-between items-start mb-3">
                          <div className="pr-3">
                            <p className="font-bold text-slate-900 line-clamp-2 text-sm">
                              {item.productName}
                            </p>
                          </div>
                          <div className="flex items-center gap-2 bg-slate-50 rounded-lg p-1">
                            {isOwner &&
                    <button
                      onClick={() => handleDecreaseItem(item.id)}
                      className="w-7 h-7 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 font-bold">

                                −
                              </button>
                    }
                            <span className="w-6 text-center font-bold text-slate-900 text-sm">
                              {item.quantity}
                            </span>
                            <button
                      onClick={() => handleIncreaseItem(item.id)}
                      className="w-7 h-7 rounded-md bg-indigo-600 text-white flex items-center justify-center font-bold">

                              +
                            </button>
                          </div>
                        </div>
                        <div className="flex justify-between items-end">
                          <p className="text-xs text-slate-400">
                            {formatCurrency(item.price)}
                          </p>
                          <p className="font-semibold text-indigo-600 text-sm">
                            Jami: {formatCurrency(item.price * item.quantity)}
                          </p>
                        </div>
                      </div>
              )
              }
                </div> :

            <div className="pb-20">
                  <div className="mb-3">
                    <input
                  type="text"
                  placeholder="Mahsulot qidirish..."
                  value={productSearch}
                  onChange={(e) => setProductSearch(e.target.value)}
                  className="w-full px-3 py-2.5 text-sm border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white" />

                  </div>
                  {branchCategories.length > 0 &&
              <div className="flex gap-2 overflow-x-auto pb-2 mb-2 no-scrollbar">
                      <button
                  onClick={() => setSelectedCategory('all')}
                  className={clsx(
                    'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                    selectedCategory === 'all' ?
                    'bg-indigo-600 text-white' :
                    'bg-white border border-slate-200 text-slate-600'
                  )}>

                        Barchasi
                      </button>
                      {branchCategories.map((cat) =>
                <button
                  key={cat.id}
                  onClick={() => setSelectedCategory(cat.id)}
                  className={clsx(
                    'flex-shrink-0 px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                    selectedCategory === cat.id ?
                    'bg-indigo-600 text-white' :
                    'bg-white border border-slate-200 text-slate-600'
                  )}>

                          {cat.name}
                        </button>
                )}
                    </div>
              }
                  <div className="grid grid-cols-2 gap-3">
                    {filteredProducts.map((product) => {
                  const inOrder = orderModal.items.find(
                    (i) => i.productId === product.id
                  );
                  return (
                    <button
                      key={product.id}
                      onClick={() => handleAddProduct(product)}
                      className={clsx(
                        'relative bg-white p-3 rounded-xl border flex flex-col h-full text-left shadow-sm active:scale-95 transition-all',
                        inOrder ?
                        'border-indigo-500 ring-1 ring-indigo-500' :
                        'border-slate-200'
                      )}>

                          {inOrder &&
                      <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center shadow-sm z-10">
                              {inOrder.quantity}
                            </span>
                      }
                          <span className="text-sm font-medium text-slate-900 line-clamp-2 mb-auto">
                            {product.name}
                          </span>
                          <span className="text-sm font-bold text-indigo-600 mt-2">
                            {formatCurrency(product.price)}
                          </span>
                        </button>);

                })}
                  </div>
                </div>
            }
            </div>

            {/* Mobile Sticky Footer */}
            <div className="bg-white border-t border-slate-200 p-4 pb-[env(safe-area-inset-bottom)] flex-shrink-0 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)] mt-[10px] mb-[10px]">
              <div className="flex justify-between items-center mb-3">
                <span className="text-slate-500 text-sm font-medium">
                  Jami summa
                </span>
                <span className="text-xl font-bold text-indigo-600">
                  {formatCurrency(orderModal.total)}
                </span>
              </div>
              <div className="flex gap-3">
                {orderModal.id ?
              <>
                    <Button
                  variant="secondary"
                  className="flex-1 h-12 rounded-xl"
                  isLoading={closing}
                  onClick={async () => {
                    setClosing(true);
                    try {
                      await api.orders.updateItems(
                        orderModal.id,
                        orderModal.items
                      );
                      toast.success('Saqlandi');
                      setOrderModal(null);
                      load();
                    } catch {
                      toast.error();
                    } finally {
                      setClosing(false);
                    }
                  }}>

                      Saqlash
                    </Button>
                    {isOwner &&
                <Button
                  className="flex-1 h-12 rounded-xl bg-emerald-600 hover:bg-emerald-700"
                  disabled={!orderModal.items.length}
                  onClick={() => setPaymentOpen(true)}>

                        To'lov qilish
                      </Button>
                }
                  </> :

              <Button
                className="w-full h-12 rounded-xl"
                disabled={!orderModal.items.length}
                isLoading={closing}
                onClick={handleCreateOrder}>

                    Buyurtma berish
                  </Button>
              }
              </div>
            </div>
          </div>
        </>
      }

      {/* ── Payment modal ────────────────────────────────────────────────── */}
      <Modal
        isOpen={paymentOpen}
        onClose={() => setPaymentOpen(false)}
        title="To'lovni qabul qilish"
        size="sm">

        <div className="space-y-5">
          <div className="text-center py-2">
            <p className="text-sm text-slate-500 mb-1">To'lov summasi</p>
            <p className="text-3xl font-bold text-indigo-600">
              {orderModal && formatCurrency(orderModal.total)}
            </p>
          </div>
          <div className="grid grid-cols-3 gap-3">
            {(
            [
            ['cash', 'Naqd', Banknote],
            ['card', 'Karta', CreditCard],
            ['transfer', "O'tkazma", Smartphone]] as
            const).
            map(([val, label, Icon]) =>
            <button
              key={val}
              onClick={() => setPaymentType(val)}
              className={clsx(
                'flex flex-col items-center p-4 rounded-xl border-2 transition-all',
                paymentType === val ?
                'border-indigo-500 bg-indigo-50 text-indigo-700' :
                'border-slate-200 text-slate-600 hover:border-slate-300'
              )}>

                <Icon className="h-6 w-6 mb-1.5" />
                <span className="text-xs font-medium">{label}</span>
              </button>
            )}
          </div>
          <div className="flex space-x-3">
            <Button
              variant="secondary"
              className="flex-1"
              onClick={() => setPaymentOpen(false)}>

              Bekor qilish
            </Button>
            <Button
              className="flex-1"
              isLoading={closing}
              onClick={handleCloseOrder}>

              Tasdiqlash
            </Button>
          </div>
        </div>
      </Modal>

      {/* ── Delete item confirm ──────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={deleteItemConfirm.open}
        onClose={() =>
        setDeleteItemConfirm({
          open: false,
          itemId: null
        })
        }
        onConfirm={confirmRemoveItem}
        title="Mahsulotni o'chirmoqchimisiz?"
        message="Bu mahsulot buyurtmadan butunlay o'chiriladi."
        confirmText="Tasdiqlash" />


      {/* ── Delete table confirm ─────────────────────────────────────────── */}
      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Stolni o'chirish"
        message={`"${deleteTarget?.name}" stolni o'chirishni tasdiqlaysizmi?`}
        isLoading={deleting} />

    </div>);

}
