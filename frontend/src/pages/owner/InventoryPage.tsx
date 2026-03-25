import { useEffect, useState } from 'react';
import { AlertTriangle, BarChart3, Edit2, Package, Plus, Search, ShoppingCart } from 'lucide-react';
import { Badge } from '../../components/ui/Badge';
import { Button } from '../../components/ui/Button';
import { CardSkeleton, TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { StatCard } from '../../components/ui/StatCard';
import { toast } from '../../components/ui/Toast';
import { formatCurrency, formatDateShort, formatDateTime, todayStr } from '../../lib/formatters';
import { getAuth } from '../../lib/auth';
import { inventoryApi } from '../../lib/inventoryApi';
import { hasPermission } from '../../lib/permissions';
import { onRealtimeEvent } from '../../lib/socket';
import {
  Ingredient,
  InventoryDashboard,
  InventoryProductSummary,
  InventoryPurchase,
  InventoryUnit,
  InventoryUsageReport,
  StockMovement
} from '../../lib/types';

interface InventoryPageProps {
  activeBranchId: string;
  activeBranchName: string;
}

interface IngredientFormState {
  name: string;
  unit: InventoryUnit;
  minQty: string;
  currentQty: string;
  avgUnitCost: string;
  isActive: boolean;
  note: string;
  adjustmentNote: string;
}

interface PurchaseFormRow {
  ingredientId: string;
  quantity: string;
  unitCost: string;
}

interface PurchaseFormState {
  supplierName: string;
  note: string;
  purchasedAt: string;
  items: PurchaseFormRow[];
}

interface RecipeFormRow {
  ingredientId: string;
  quantity: string;
}

interface RecipeFormState {
  note: string;
  items: RecipeFormRow[];
}

const unitOptions = [
  { value: 'GRAM', label: 'Gram' },
  { value: 'MILLILITER', label: 'Millilitr' },
  { value: 'PIECE', label: 'Dona' }
];

const movementTypeLabels: Record<string, string> = {
  INITIAL_IN: 'Boshlangich qoldiq',
  PURCHASE_IN: 'Kirim',
  SALE_OUT: 'Sotuv deduct',
  ADJUSTMENT_IN: 'Tuzatish +',
  ADJUSTMENT_OUT: 'Tuzatish -'
};

const createDefaultRange = () => {
  const now = new Date();
  const from = new Date(now.getFullYear(), now.getMonth(), 1);
  return {
    from: from.toISOString().slice(0, 10),
    to: todayStr()
  };
};

const createIngredientForm = (): IngredientFormState => ({
  name: '',
  unit: 'GRAM',
  minQty: '0',
  currentQty: '0',
  avgUnitCost: '0',
  isActive: true,
  note: '',
  adjustmentNote: ''
});

const createPurchaseForm = (): PurchaseFormState => ({
  supplierName: '',
  note: '',
  purchasedAt: todayStr(),
  items: [
    {
      ingredientId: '',
      quantity: '',
      unitCost: ''
    }
  ]
});

const createRecipeForm = (): RecipeFormState => ({
  note: '',
  items: []
});

const toNumberString = (value: number) => {
  if (Number.isInteger(value)) {
    return String(value);
  }

  return String(value);
};

const parseNumber = (value: string, fallback = 0) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const formatQty = (value: number) =>
  new Intl.NumberFormat('uz-UZ', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 3
  })
    .format(value)
    .replace(/,/g, ' ');

const formatUnit = (unit: InventoryUnit) => {
  if (unit === 'GRAM') return 'g';
  if (unit === 'MILLILITER') return 'ml';
  return 'dona';
};

const getStockBadge = (ingredient: Ingredient) => {
  if (!ingredient.isActive) {
    return <Badge variant='secondary'>Nofaol</Badge>;
  }

  if (ingredient.isLowStock) {
    return <Badge variant='warning'>Kam qoldiq</Badge>;
  }

  return <Badge variant='success'>Yetarli</Badge>;
};

export function InventoryPage({ activeBranchId, activeBranchName }: InventoryPageProps) {
  const authUser = getAuth().user;
  const canManageInventory = hasPermission(authUser, 'INVENTORY_MANAGE');
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState(createDefaultRange);
  const [ingredientSearch, setIngredientSearch] = useState('');
  const [dashboard, setDashboard] = useState<InventoryDashboard | null>(null);
  const [usageReport, setUsageReport] = useState<InventoryUsageReport | null>(null);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [purchases, setPurchases] = useState<InventoryPurchase[]>([]);
  const [movements, setMovements] = useState<StockMovement[]>([]);
  const [products, setProducts] = useState<InventoryProductSummary[]>([]);

  const [ingredientModalOpen, setIngredientModalOpen] = useState(false);
  const [editingIngredient, setEditingIngredient] = useState<Ingredient | null>(null);
  const [ingredientForm, setIngredientForm] = useState<IngredientFormState>(createIngredientForm);
  const [ingredientSaving, setIngredientSaving] = useState(false);

  const [purchaseModalOpen, setPurchaseModalOpen] = useState(false);
  const [purchaseForm, setPurchaseForm] = useState<PurchaseFormState>(createPurchaseForm);
  const [purchaseSaving, setPurchaseSaving] = useState(false);

  const [recipeModalOpen, setRecipeModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<InventoryProductSummary | null>(null);
  const [recipeForm, setRecipeForm] = useState<RecipeFormState>(createRecipeForm);
  const [recipeSaving, setRecipeSaving] = useState(false);

  const load = async (silent = false) => {
    if (!silent) {
      setLoading(true);
    }

    try {
      const [dashboardData, ingredientRows, purchaseRows, movementRows, usageData, productRows] =
        await Promise.all([
          inventoryApi.dashboard(range.from, range.to),
          inventoryApi.listIngredients(),
          inventoryApi.listPurchases(range.from, range.to, 20),
          inventoryApi.listMovements(range.from, range.to, undefined, 20),
          inventoryApi.usage(range.from, range.to),
          inventoryApi.listProducts()
        ]);

      setDashboard(dashboardData);
      setIngredients(ingredientRows);
      setPurchases(purchaseRows);
      setMovements(movementRows);
      setUsageReport(usageData);
      setProducts(productRows);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Inventar malumotlarini yuklab bolmadi';
      toast.error(message);
    } finally {
      if (!silent) {
        setLoading(false);
      }
    }
  };

  useEffect(() => {
    void load();
  }, [activeBranchId, range.from, range.to]);

  useEffect(() => {
    const unsubscribe = onRealtimeEvent(({ event, payload }) => {
      if (event !== 'inventory.updated' && event !== 'products.updated') {
        return;
      }

      if (
        payload &&
        typeof payload === 'object' &&
        'branchId' in payload &&
        (payload as { branchId?: string }).branchId !== activeBranchId
      ) {
        return;
      }

      void load(true);
    });

    return unsubscribe;
  }, [activeBranchId, range.from, range.to]);

  const filteredIngredients = ingredients.filter((ingredient) =>
    ingredient.name.toLowerCase().includes(ingredientSearch.toLowerCase())
  );

  const activeIngredientOptions = ingredients
    .filter((ingredient) => ingredient.isActive)
    .map((ingredient) => ({
      value: ingredient.id,
      label: `${ingredient.name} (${formatUnit(ingredient.unit)})`
    }));

  const openCreateIngredient = () => {
    setEditingIngredient(null);
    setIngredientForm(createIngredientForm());
    setIngredientModalOpen(true);
  };

  const openEditIngredient = (ingredient: Ingredient) => {
    setEditingIngredient(ingredient);
    setIngredientForm({
      name: ingredient.name,
      unit: ingredient.unit,
      minQty: toNumberString(ingredient.minQty),
      currentQty: toNumberString(ingredient.currentQty),
      avgUnitCost: toNumberString(ingredient.avgUnitCost),
      isActive: ingredient.isActive,
      note: '',
      adjustmentNote: ''
    });
    setIngredientModalOpen(true);
  };

  const handleIngredientSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!ingredientForm.name.trim()) {
      toast.error('Ingredient nomini kiriting');
      return;
    }

    setIngredientSaving(true);
    try {
      const payload = {
        name: ingredientForm.name.trim(),
        unit: ingredientForm.unit,
        minQty: parseNumber(ingredientForm.minQty),
        currentQty: parseNumber(ingredientForm.currentQty),
        avgUnitCost: parseNumber(ingredientForm.avgUnitCost),
        isActive: ingredientForm.isActive,
        ...(editingIngredient
          ? { adjustmentNote: ingredientForm.adjustmentNote.trim() || undefined }
          : { note: ingredientForm.note.trim() || undefined })
      };

      if (editingIngredient) {
        await inventoryApi.updateIngredient(editingIngredient.id, payload);
        toast.success('Ingredient yangilandi');
      } else {
        await inventoryApi.createIngredient(payload);
        toast.success('Ingredient yaratildi');
      }

      setIngredientModalOpen(false);
      setEditingIngredient(null);
      setIngredientForm(createIngredientForm());
      await load(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Ingredient saqlanmadi';
      toast.error(message);
    } finally {
      setIngredientSaving(false);
    }
  };

  const handlePurchaseRowChange = (
    index: number,
    key: keyof PurchaseFormRow,
    value: string
  ) => {
    setPurchaseForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    }));
  };

  const handlePurchaseSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (purchaseForm.items.some((item) => !item.ingredientId || !item.quantity || !item.unitCost)) {
      toast.error('Har bir kirim qatorini toliq toldiring');
      return;
    }

    setPurchaseSaving(true);
    try {
      await inventoryApi.createPurchase({
        supplierName: purchaseForm.supplierName.trim() || undefined,
        note: purchaseForm.note.trim() || undefined,
        purchasedAt: purchaseForm.purchasedAt,
        items: purchaseForm.items.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: parseNumber(item.quantity),
          unitCost: parseNumber(item.unitCost)
        }))
      });

      toast.success('Kirim saqlandi');
      setPurchaseModalOpen(false);
      setPurchaseForm(createPurchaseForm());
      await load(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Kirim saqlanmadi';
      toast.error(message);
    } finally {
      setPurchaseSaving(false);
    }
  };

  const openRecipeModal = (product: InventoryProductSummary) => {
    setEditingProduct(product);
    setRecipeForm({
      note: product.recipe?.note ?? '',
      items:
        product.recipe?.items.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: toNumberString(item.quantity)
        })) ?? []
    });
    setRecipeModalOpen(true);
  };

  const handleRecipeRowChange = (
    index: number,
    key: keyof RecipeFormRow,
    value: string
  ) => {
    setRecipeForm((prev) => ({
      ...prev,
      items: prev.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, [key]: value } : item
      )
    }));
  };

  const handleRecipeSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!editingProduct) {
      return;
    }

    if (recipeForm.items.some((item) => !item.ingredientId || !item.quantity)) {
      toast.error('Retsept qatorlarini toliq toldiring yoki olib tashlang');
      return;
    }

    setRecipeSaving(true);
    try {
      await inventoryApi.saveProductRecipe(editingProduct.id, {
        note: recipeForm.note.trim() || undefined,
        items: recipeForm.items.map((item) => ({
          ingredientId: item.ingredientId,
          quantity: parseNumber(item.quantity)
        }))
      });

      toast.success('Retsept saqlandi');
      setRecipeModalOpen(false);
      setEditingProduct(null);
      setRecipeForm(createRecipeForm());
      await load(true);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Retsept saqlanmadi';
      toast.error(message);
    } finally {
      setRecipeSaving(false);
    }
  };

  return (
    <div className='space-y-6'>
      <div className='hidden lg:flex items-center justify-between gap-4'>
        <div>
          <h1 className='text-xl font-bold text-slate-900'>Inventar</h1>
          <p className='text-sm text-slate-500 mt-0.5'>
            Faol filial: <span className='font-medium text-indigo-600'>{activeBranchName}</span>
          </p>
        </div>

        {canManageInventory && (
          <div className='flex items-center gap-3'>
            <Button variant='outline' onClick={() => setPurchaseModalOpen(true)}>
              <Plus className='h-4 w-4 mr-2' />
              Kirim qo'shish
            </Button>
            <Button onClick={openCreateIngredient}>
              <Plus className='h-4 w-4 mr-2' />
              Ingredient qo'shish
            </Button>
          </div>
        )}
      </div>

      <div className='bg-white rounded-xl border border-slate-200 p-5 flex flex-wrap gap-4 items-end'>
        <div className='w-full sm:w-44'>
          <Input
            label='Dan'
            type='date'
            value={range.from}
            onChange={(event) => setRange((prev) => ({ ...prev, from: event.target.value }))}
          />
        </div>
        <div className='w-full sm:w-44'>
          <Input
            label='Gacha'
            type='date'
            value={range.to}
            onChange={(event) => setRange((prev) => ({ ...prev, to: event.target.value }))}
          />
        </div>
        <div className='w-full sm:flex-1 sm:max-w-sm'>
          <Input
            label='Ingredient qidirish'
            placeholder="Nom bo'yicha qidiring"
            value={ingredientSearch}
            onChange={(event) => setIngredientSearch(event.target.value)}
            icon={<Search className='h-4 w-4 text-slate-400' />}
          />
        </div>
        {canManageInventory && (
          <div className='w-full sm:w-auto flex gap-2'>
            <Button variant='outline' className='flex-1 sm:flex-none' onClick={() => setPurchaseModalOpen(true)}>
              Kirim
            </Button>
            <Button className='flex-1 sm:flex-none' onClick={openCreateIngredient}>
              Ingredient
            </Button>
          </div>
        )}
      </div>

      {loading || !dashboard || !usageReport ? (
        <>
          <CardSkeleton count={4} />
          <TableSkeleton rows={4} />
        </>
      ) : (
        <>
          <div className='grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4'>
            <StatCard
              title='Ingredientlar'
              value={`${dashboard.summary.ingredientsCount} ta`}
              icon={Package}
              color='indigo'
              subtitle='Aktiv ingredientlar soni'
            />
            <StatCard
              title='Inventar qiymati'
              value={formatCurrency(dashboard.summary.inventoryValue)}
              icon={BarChart3}
              color='green'
              subtitle='Ombordagi joriy qiymat'
            />
            <StatCard
              title='Kirim summasi'
              value={formatCurrency(dashboard.summary.purchaseTotal)}
              icon={ShoppingCart}
              color='amber'
              subtitle={`${dashboard.summary.purchaseCount} ta kirim hujjati`}
            />
            <StatCard
              title='Kam qoldiq'
              value={`${dashboard.summary.lowStockCount} ta`}
              icon={AlertTriangle}
              color='red'
              subtitle='Minimal qoldiqdan past ingredientlar'
            />
          </div>

          <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
            <div className='bg-white rounded-xl border border-slate-200 overflow-hidden'>
              <div className='px-5 py-4 border-b border-slate-100 flex items-center justify-between'>
                <div>
                  <h2 className='text-sm font-semibold text-slate-900'>Kam qoldiq</h2>
                  <p className='text-xs text-slate-500 mt-1'>Tez tugashi mumkin bo'lgan ingredientlar</p>
                </div>
                <Badge variant='warning'>{dashboard.lowStock.length} ta</Badge>
              </div>
              <div className='divide-y divide-slate-100'>
                {dashboard.lowStock.length > 0 ? (
                  dashboard.lowStock.map((ingredient) => (
                    <div key={ingredient.id} className='px-5 py-4 flex items-center justify-between gap-3'>
                      <div>
                        <p className='font-medium text-slate-800'>{ingredient.name}</p>
                        <p className='text-xs text-slate-500 mt-1'>
                          Min: {formatQty(ingredient.minQty)} {formatUnit(ingredient.unit)}
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='font-semibold text-amber-700'>
                          {formatQty(ingredient.currentQty)} {formatUnit(ingredient.unit)}
                        </p>
                        {getStockBadge(ingredient)}
                      </div>
                    </div>
                  ))
                ) : (
                  <p className='px-5 py-6 text-sm text-slate-500'>Kam qoldiq topilmadi.</p>
                )}
              </div>
            </div>

            <div className='bg-white rounded-xl border border-slate-200 overflow-hidden'>
              <div className='px-5 py-4 border-b border-slate-100 flex items-center justify-between'>
                <div>
                  <h2 className='text-sm font-semibold text-slate-900'>Hozir tayyorlash mumkin</h2>
                  <p className='text-xs text-slate-500 mt-1'>Retsept asosida mavjud maksimal son</p>
                </div>
                <Badge variant='primary'>{dashboard.canMakeNow.length} ta</Badge>
              </div>
              <div className='divide-y divide-slate-100'>
                {dashboard.canMakeNow.length > 0 ? (
                  dashboard.canMakeNow.map((product) => (
                    <div key={product.id} className='px-5 py-4 flex items-center justify-between gap-3'>
                      <div>
                        <p className='font-medium text-slate-800'>{product.name}</p>
                        <p className='text-xs text-slate-500 mt-1'>
                          Tannarx: {formatCurrency(product.theoreticalCost)}
                        </p>
                      </div>
                      <div className='text-right'>
                        <p className='font-semibold text-slate-900'>
                          {product.possibleQty ?? 0} ta
                        </p>
                        <Badge variant={product.possibleQty !== null && product.possibleQty <= 10 ? 'warning' : 'success'}>
                          {product.possibleQty !== null && product.possibleQty <= 10 ? 'Kam qolgan' : 'Tayyor'}
                        </Badge>
                      </div>
                    </div>
                  ))
                ) : (
                  <p className='px-5 py-6 text-sm text-slate-500'>Retseptli mahsulot topilmadi.</p>
                )}
              </div>
            </div>
          </div>

          <div className='bg-white rounded-xl border border-slate-200 overflow-hidden'>
            <div className='px-5 py-4 border-b border-slate-100 flex items-center justify-between gap-3'>
              <div>
                <h2 className='text-sm font-semibold text-slate-900'>Ingredientlar</h2>
                <p className='text-xs text-slate-500 mt-1'>Qoldiq, minimal limit va birlik tannarx nazorati</p>
              </div>
              <Badge variant='secondary'>{filteredIngredients.length} ta</Badge>
            </div>
            <div className='overflow-x-auto'>
              <table className='w-full text-sm min-w-[760px]'>
                <thead className='bg-slate-50 border-b border-slate-200'>
                  <tr>
                    <th className='px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase'>Ingredient</th>
                    <th className='px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase'>Birlik</th>
                    <th className='px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase'>Qoldiq</th>
                    <th className='px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase'>Minimal</th>
                    <th className='px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase'>Birlik tannarx</th>
                    <th className='px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase'>Qiymat</th>
                    <th className='px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase'>Holat</th>
                    {canManageInventory && (
                      <th className='px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase'>Amal</th>
                    )}
                  </tr>
                </thead>
                <tbody className='divide-y divide-slate-100'>
                  {filteredIngredients.length > 0 ? (
                    filteredIngredients.map((ingredient) => (
                      <tr key={ingredient.id} className='hover:bg-slate-50'>
                        <td className='px-4 py-3 font-medium text-slate-800'>{ingredient.name}</td>
                        <td className='px-4 py-3 text-slate-600'>{formatUnit(ingredient.unit)}</td>
                        <td className='px-4 py-3 text-right tabular-nums text-slate-700'>
                          {formatQty(ingredient.currentQty)}
                        </td>
                        <td className='px-4 py-3 text-right tabular-nums text-slate-500'>
                          {formatQty(ingredient.minQty)}
                        </td>
                        <td className='px-4 py-3 text-right tabular-nums text-slate-700'>
                          {formatCurrency(ingredient.avgUnitCost)}
                        </td>
                        <td className='px-4 py-3 text-right tabular-nums font-semibold text-slate-900'>
                          {formatCurrency(ingredient.inventoryValue)}
                        </td>
                        <td className='px-4 py-3 text-center'>{getStockBadge(ingredient)}</td>
                        {canManageInventory && (
                          <td className='px-4 py-3 text-right'>
                            <Button variant='ghost' size='icon' onClick={() => openEditIngredient(ingredient)}>
                              <Edit2 className='h-4 w-4' />
                            </Button>
                          </td>
                        )}
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td
                        colSpan={canManageInventory ? 8 : 7}
                        className='px-4 py-6 text-center text-sm text-slate-500'
                      >
                        Ingredient topilmadi.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
            <div className='bg-white rounded-xl border border-slate-200 overflow-hidden'>
              <div className='px-5 py-4 border-b border-slate-100 flex items-center justify-between'>
                <div>
                  <h2 className='text-sm font-semibold text-slate-900'>Kirimlar</h2>
                  <p className='text-xs text-slate-500 mt-1'>Oxirgi inventar kirim hujjatlari</p>
                </div>
                <Badge variant='info'>{purchases.length} ta</Badge>
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm min-w-[620px]'>
                  <thead className='bg-slate-50 border-b border-slate-200'>
                    <tr>
                      <th className='px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase'>Sana</th>
                      <th className='px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase'>Yetkazuvchi</th>
                      <th className='px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase'>Item</th>
                      <th className='px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase'>Jami</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {purchases.length > 0 ? (
                      purchases.map((purchase) => (
                        <tr key={purchase.id} className='hover:bg-slate-50'>
                          <td className='px-4 py-3 text-slate-700'>{formatDateShort(purchase.purchasedAt)}</td>
                          <td className='px-4 py-3'>
                            <p className='font-medium text-slate-800'>
                              {purchase.supplierName || 'Kiritilgan kirim'}
                            </p>
                            <p className='text-xs text-slate-500 mt-1'>
                              {purchase.createdBy?.fullName || 'Noma\'lum'}
                            </p>
                          </td>
                          <td className='px-4 py-3 text-right tabular-nums text-slate-600'>
                            {purchase.items.length}
                          </td>
                          <td className='px-4 py-3 text-right tabular-nums font-semibold text-slate-900'>
                            {formatCurrency(purchase.totalAmount)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className='px-4 py-6 text-center text-sm text-slate-500'>
                          Bu oraliqda kirim yo'q.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className='bg-white rounded-xl border border-slate-200 overflow-hidden'>
              <div className='px-5 py-4 border-b border-slate-100 flex items-center justify-between'>
                <div>
                  <h2 className='text-sm font-semibold text-slate-900'>So'nggi harakatlar</h2>
                  <p className='text-xs text-slate-500 mt-1'>Kirim, deduct va qoldiq tuzatishlar</p>
                </div>
                <Badge variant='secondary'>{movements.length} ta</Badge>
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm min-w-[620px]'>
                  <thead className='bg-slate-50 border-b border-slate-200'>
                    <tr>
                      <th className='px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase'>Vaqt</th>
                      <th className='px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase'>Ingredient</th>
                      <th className='px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase'>Harakat</th>
                      <th className='px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase'>Miqdor</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {movements.length > 0 ? (
                      movements.map((movement) => (
                        <tr key={movement.id} className='hover:bg-slate-50'>
                          <td className='px-4 py-3 text-slate-600'>{formatDateTime(movement.createdAt)}</td>
                          <td className='px-4 py-3'>
                            <p className='font-medium text-slate-800'>{movement.ingredient.name}</p>
                            <p className='text-xs text-slate-500 mt-1'>
                              Qoldiq: {formatQty(movement.quantityAfter)} {formatUnit(movement.ingredient.unit)}
                            </p>
                          </td>
                          <td className='px-4 py-3 text-slate-700'>
                            {movementTypeLabels[movement.type] || movement.type}
                          </td>
                          <td className='px-4 py-3 text-right tabular-nums'>
                            <span
                              className={movement.quantityChange < 0 ? 'text-red-600 font-semibold' : 'text-emerald-600 font-semibold'}
                            >
                              {movement.quantityChange > 0 ? '+' : ''}
                              {formatQty(movement.quantityChange)}
                            </span>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={4} className='px-4 py-6 text-center text-sm text-slate-500'>
                          Harakatlar hali yo'q.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className='grid grid-cols-1 xl:grid-cols-2 gap-6'>
            <div className='bg-white rounded-xl border border-slate-200 overflow-hidden'>
              <div className='px-5 py-4 border-b border-slate-100 flex items-center justify-between'>
                <div>
                  <h2 className='text-sm font-semibold text-slate-900'>Ingredient sarfi</h2>
                  <p className='text-xs text-slate-500 mt-1'>Yopilgan buyurtmalar bo'yicha sarflangan ingredientlar</p>
                </div>
                <Badge variant='primary'>{usageReport.summary.totalIngredients} ta</Badge>
              </div>
              <div className='px-5 pt-4'>
                <div className='rounded-xl bg-slate-50 border border-slate-200 px-4 py-3 flex items-center justify-between gap-3'>
                  <div>
                    <p className='text-xs uppercase tracking-wide text-slate-500'>Jami sarf tannarxi</p>
                    <p className='text-lg font-semibold text-slate-900 mt-1'>
                      {formatCurrency(usageReport.summary.totalUsageCost)}
                    </p>
                  </div>
                </div>
              </div>
              <div className='overflow-x-auto mt-4'>
                <table className='w-full text-sm min-w-[520px]'>
                  <thead className='bg-slate-50 border-y border-slate-200'>
                    <tr>
                      <th className='px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase'>Ingredient</th>
                      <th className='px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase'>Sarfi</th>
                      <th className='px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase'>Tannarx</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {usageReport.data.length > 0 ? (
                      usageReport.data.map((item) => (
                        <tr key={item.ingredientId} className='hover:bg-slate-50'>
                          <td className='px-4 py-3 font-medium text-slate-800'>{item.ingredientName}</td>
                          <td className='px-4 py-3 text-right tabular-nums text-slate-700'>
                            {formatQty(item.usageQty)} {formatUnit(item.unit)}
                          </td>
                          <td className='px-4 py-3 text-right tabular-nums font-semibold text-slate-900'>
                            {formatCurrency(item.usageCost)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className='px-4 py-6 text-center text-sm text-slate-500'>
                          Bu davr uchun sarf topilmadi.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className='bg-white rounded-xl border border-slate-200 overflow-hidden'>
              <div className='px-5 py-4 border-b border-slate-100 flex items-center justify-between'>
                <div>
                  <h2 className='text-sm font-semibold text-slate-900'>Mahsulot retseptlari</h2>
                  <p className='text-xs text-slate-500 mt-1'>Qaysi mahsulotga nima va qancha ketishi</p>
                </div>
                <Badge variant='info'>
                  {products.filter((product) => product.tracked).length} ta retseptli mahsulot
                </Badge>
              </div>
              <div className='overflow-x-auto'>
                <table className='w-full text-sm min-w-[680px]'>
                  <thead className='bg-slate-50 border-b border-slate-200'>
                    <tr>
                      <th className='px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase'>Mahsulot</th>
                      <th className='px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase'>Kategoriya</th>
                      <th className='px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase'>Narx</th>
                      <th className='px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase'>Tannarx</th>
                      <th className='px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase'>Mumkin son</th>
                      <th className='px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase'>Holat</th>
                      <th className='px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase'>Amal</th>
                    </tr>
                  </thead>
                  <tbody className='divide-y divide-slate-100'>
                    {products.length > 0 ? (
                      products.map((product) => (
                        <tr key={product.id} className='hover:bg-slate-50'>
                          <td className='px-4 py-3'>
                            <p className='font-medium text-slate-800'>{product.name}</p>
                            <p className='text-xs text-slate-500 mt-1'>
                              {product.recipe?.items.length ?? 0} ta ingredient
                            </p>
                          </td>
                          <td className='px-4 py-3 text-slate-600'>{product.category?.name || '-'}</td>
                          <td className='px-4 py-3 text-right tabular-nums text-slate-700'>
                            {formatCurrency(product.price)}
                          </td>
                          <td className='px-4 py-3 text-right tabular-nums font-semibold text-slate-900'>
                            {product.tracked ? formatCurrency(product.theoreticalCost) : '-'}
                          </td>
                          <td className='px-4 py-3 text-right tabular-nums text-slate-700'>
                            {product.possibleQty === null ? '-' : `${product.possibleQty} ta`}
                          </td>
                          <td className='px-4 py-3 text-center'>
                            <Badge variant={product.tracked ? 'success' : 'secondary'}>
                              {product.tracked ? 'Retsept bor' : 'Biriktirilmagan'}
                            </Badge>
                          </td>
                          <td className='px-4 py-3 text-right'>
                            <Button variant='ghost' size='icon' onClick={() => openRecipeModal(product)}>
                              <Edit2 className='h-4 w-4' />
                            </Button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={7} className='px-4 py-6 text-center text-sm text-slate-500'>
                          Mahsulot topilmadi.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}

      <Modal
        isOpen={ingredientModalOpen}
        onClose={() => {
          if (ingredientSaving) return;
          setIngredientModalOpen(false);
        }}
        title={editingIngredient ? 'Ingredientni tahrirlash' : 'Ingredient qo\'shish'}
        size='md'
      >
        <form className='space-y-4' onSubmit={handleIngredientSubmit}>
          <Input
            label='Nomi'
            value={ingredientForm.name}
            onChange={(event) => setIngredientForm((prev) => ({ ...prev, name: event.target.value }))}
            required
          />
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <Select
              label='Birlik'
              value={ingredientForm.unit}
              onChange={(event) =>
                setIngredientForm((prev) => ({ ...prev, unit: event.target.value as InventoryUnit }))
              }
              options={unitOptions}
            />
            <Input
              label='Minimal qoldiq'
              type='number'
              min='0'
              step='0.001'
              value={ingredientForm.minQty}
              onChange={(event) => setIngredientForm((prev) => ({ ...prev, minQty: event.target.value }))}
            />
            <Input
              label='Joriy qoldiq'
              type='number'
              min='0'
              step='0.001'
              value={ingredientForm.currentQty}
              onChange={(event) =>
                setIngredientForm((prev) => ({ ...prev, currentQty: event.target.value }))
              }
            />
            <Input
              label='Birlik tannarx'
              type='number'
              min='0'
              step='0.0001'
              value={ingredientForm.avgUnitCost}
              onChange={(event) =>
                setIngredientForm((prev) => ({ ...prev, avgUnitCost: event.target.value }))
              }
            />
          </div>
          <Input
            label={editingIngredient ? 'Tuzatish izohi' : 'Boshlangich izoh'}
            value={editingIngredient ? ingredientForm.adjustmentNote : ingredientForm.note}
            onChange={(event) =>
              setIngredientForm((prev) =>
                editingIngredient
                  ? { ...prev, adjustmentNote: event.target.value }
                  : { ...prev, note: event.target.value }
              )
            }
            placeholder='Ixtiyoriy izoh'
          />
          <label className='flex items-center gap-3 rounded-xl border border-slate-200 px-4 py-3'>
            <input
              type='checkbox'
              checked={ingredientForm.isActive}
              onChange={(event) =>
                setIngredientForm((prev) => ({ ...prev, isActive: event.target.checked }))
              }
            />
            <span className='text-sm text-slate-700'>Ingredient faol bo'lsin</span>
          </label>
          <div className='flex gap-3 pt-2'>
            <Button
              type='button'
              variant='secondary'
              className='flex-1'
              onClick={() => setIngredientModalOpen(false)}
              disabled={ingredientSaving}
            >
              Bekor qilish
            </Button>
            <Button type='submit' className='flex-1' isLoading={ingredientSaving}>
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={purchaseModalOpen}
        onClose={() => {
          if (purchaseSaving) return;
          setPurchaseModalOpen(false);
        }}
        title='Inventar kirimi'
        size='lg'
      >
        <form className='space-y-4' onSubmit={handlePurchaseSubmit}>
          <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
            <Input
              label='Yetkazuvchi'
              value={purchaseForm.supplierName}
              onChange={(event) =>
                setPurchaseForm((prev) => ({ ...prev, supplierName: event.target.value }))
              }
              placeholder='Ixtiyoriy'
            />
            <Input
              label='Sana'
              type='date'
              value={purchaseForm.purchasedAt}
              onChange={(event) =>
                setPurchaseForm((prev) => ({ ...prev, purchasedAt: event.target.value }))
              }
              required
            />
          </div>
          <Input
            label='Izoh'
            value={purchaseForm.note}
            onChange={(event) => setPurchaseForm((prev) => ({ ...prev, note: event.target.value }))}
            placeholder='Ixtiyoriy'
          />
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <h3 className='text-sm font-semibold text-slate-900'>Kirim itemlari</h3>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() =>
                  setPurchaseForm((prev) => ({
                    ...prev,
                    items: [...prev.items, { ingredientId: '', quantity: '', unitCost: '' }]
                  }))
                }
              >
                <Plus className='h-4 w-4 mr-1.5' />
                Qator
              </Button>
            </div>
            {purchaseForm.items.map((item, index) => (
              <div key={index} className='grid grid-cols-1 sm:grid-cols-[minmax(0,1.4fr)_1fr_1fr_auto] gap-3 items-end'>
                <Select
                  label={`Ingredient ${index + 1}`}
                  value={item.ingredientId}
                  onChange={(event) =>
                    handlePurchaseRowChange(index, 'ingredientId', event.target.value)
                  }
                  options={activeIngredientOptions}
                  placeholder='Ingredient tanlang'
                />
                <Input
                  label='Miqdor'
                  type='number'
                  min='0'
                  step='0.001'
                  value={item.quantity}
                  onChange={(event) => handlePurchaseRowChange(index, 'quantity', event.target.value)}
                />
                <Input
                  label='Birlik tannarx'
                  type='number'
                  min='0'
                  step='0.0001'
                  value={item.unitCost}
                  onChange={(event) => handlePurchaseRowChange(index, 'unitCost', event.target.value)}
                />
                <Button
                  type='button'
                  variant='ghost'
                  size='sm'
                  className='mb-0.5'
                  onClick={() =>
                    setPurchaseForm((prev) => ({
                      ...prev,
                      items:
                        prev.items.length === 1
                          ? [{ ingredientId: '', quantity: '', unitCost: '' }]
                          : prev.items.filter((_, itemIndex) => itemIndex !== index)
                    }))
                  }
                >
                  Olib tashlash
                </Button>
              </div>
            ))}
          </div>
          <div className='flex gap-3 pt-2'>
            <Button
              type='button'
              variant='secondary'
              className='flex-1'
              onClick={() => setPurchaseModalOpen(false)}
              disabled={purchaseSaving}
            >
              Bekor qilish
            </Button>
            <Button type='submit' className='flex-1' isLoading={purchaseSaving}>
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={recipeModalOpen}
        onClose={() => {
          if (recipeSaving) return;
          setRecipeModalOpen(false);
        }}
        title={editingProduct ? `${editingProduct.name} retsepti` : 'Retsept'}
        size='lg'
      >
        <form className='space-y-4' onSubmit={handleRecipeSubmit}>
          <Input
            label='Izoh'
            value={recipeForm.note}
            onChange={(event) => setRecipeForm((prev) => ({ ...prev, note: event.target.value }))}
            placeholder='Ixtiyoriy izoh'
          />
          <div className='space-y-3'>
            <div className='flex items-center justify-between'>
              <h3 className='text-sm font-semibold text-slate-900'>Retsept itemlari</h3>
              <Button
                type='button'
                variant='outline'
                size='sm'
                onClick={() =>
                  setRecipeForm((prev) => ({
                    ...prev,
                    items: [...prev.items, { ingredientId: '', quantity: '' }]
                  }))
                }
              >
                <Plus className='h-4 w-4 mr-1.5' />
                Ingredient
              </Button>
            </div>
            {recipeForm.items.length > 0 ? (
              recipeForm.items.map((item, index) => (
                <div key={index} className='grid grid-cols-1 sm:grid-cols-[minmax(0,1.5fr)_1fr_auto] gap-3 items-end'>
                  <Select
                    label={`Ingredient ${index + 1}`}
                    value={item.ingredientId}
                    onChange={(event) =>
                      handleRecipeRowChange(index, 'ingredientId', event.target.value)
                    }
                    options={activeIngredientOptions}
                    placeholder='Ingredient tanlang'
                  />
                  <Input
                    label='Miqdor'
                    type='number'
                    min='0'
                    step='0.001'
                    value={item.quantity}
                    onChange={(event) => handleRecipeRowChange(index, 'quantity', event.target.value)}
                  />
                  <Button
                    type='button'
                    variant='ghost'
                    size='sm'
                    className='mb-0.5'
                    onClick={() =>
                      setRecipeForm((prev) => ({
                        ...prev,
                        items: prev.items.filter((_, itemIndex) => itemIndex !== index)
                      }))
                    }
                  >
                    Olib tashlash
                  </Button>
                </div>
              ))
            ) : (
              <div className='rounded-xl border border-dashed border-slate-300 px-4 py-6 text-sm text-slate-500'>
                Hozircha retsept biriktirilmagan. Kerak bo'lsa ingredient qo'shing yoki bo'sh saqlab retseptni olib tashlang.
              </div>
            )}
          </div>
          <div className='flex gap-3 pt-2'>
            <Button
              type='button'
              variant='secondary'
              className='flex-1'
              onClick={() => setRecipeModalOpen(false)}
              disabled={recipeSaving}
            >
              Bekor qilish
            </Button>
            <Button type='submit' className='flex-1' isLoading={recipeSaving}>
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
