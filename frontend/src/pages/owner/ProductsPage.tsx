import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { Select } from '../../components/ui/Select';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { toast } from '../../components/ui/Toast';
import { Plus, Edit2, Trash2, ShoppingBag, Search, Tag } from 'lucide-react';
import { api } from '../../lib/api';
import { Category, Product } from '../../lib/types';
import { formatCurrency } from '../../lib/formatters';
import { clsx } from 'clsx';
interface ProductsPageProps {
  activeBranchId: string;
  activeBranchName: string;
}
export function ProductsPage({
  activeBranchId,
  activeBranchName
}: ProductsPageProps) {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCat, setSelectedCat] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [catModal, setCatModal] = useState(false);
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [catName, setCatName] = useState('');
  const [catNameError, setCatNameError] = useState('');
  const [savingCat, setSavingCat] = useState(false);
  const [deleteCat, setDeleteCat] = useState<Category | null>(null);
  const [deletingCat, setDeletingCat] = useState(false);
  const [prodModal, setProdModal] = useState(false);
  const [editingProd, setEditingProd] = useState<Product | null>(null);
  const [prodForm, setProdForm] = useState({
    name: '',
    price: '',
    categoryId: '',
    isActive: true
  });
  const [prodErrors, setProdErrors] = useState<Record<string, string>>({});
  const [savingProd, setSavingProd] = useState(false);
  const [deleteProd, setDeleteProd] = useState<Product | null>(null);
  const [deletingProd, setDeletingProd] = useState(false);
  const [categoryModal, setCategoryModal] = useState({
    open: false,
    editing: null
  });
  const [productModal, setProductModal] = useState({
    open: false,
    editing: null
  });
  const load = async () => {
    setLoading(true);
    const [cats, prods] = await Promise.all([
    api.categories.listByBranch(activeBranchId),
    api.products.listByBranch(activeBranchId)]
    );
    setCategories(cats);
    setProducts(prods);
    if (cats.length > 0 && !selectedCat) setSelectedCat(cats[0].id);
    setLoading(false);
  };
  useEffect(() => {
    load();
  }, [activeBranchId]);
  const filteredProducts = products.filter((p) => {
    const matchCat = !selectedCat || p.categoryId === selectedCat;
    const matchSearch = p.name.toLowerCase().includes(search.toLowerCase());
    return matchCat && matchSearch;
  });
  // Category handlers
  const openCreateCat = () => {
    setEditingCat(null);
    setCatName('');
    setCatNameError('');
    setCategoryModal({
      open: true,
      editing: null
    });
  };
  const openEditCat = (c: Category) => {
    setEditingCat(c);
    setCatName(c.name);
    setCatNameError('');
    setCategoryModal({
      open: true,
      editing: c
    });
  };
  const handleSaveCat = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!catName.trim()) {
      setCatNameError("Bu maydon to'ldirilishi shart");
      return;
    }
    setSavingCat(true);
    try {
      if (editingCat) {
        await api.categories.update(editingCat.id, {
          name: catName
        });
        toast.success('Kategoriya yangilandi');
      } else {
        const c = await api.categories.create({
          branchId: activeBranchId,
          name: catName,
          sortOrder: categories.length + 1
        });
        setSelectedCat(c.id);
        toast.success("Kategoriya qo'shildi");
      }
      setCategoryModal({
        open: false,
        editing: null
      });
      load();
    } catch {
      toast.error();
    } finally {
      setSavingCat(false);
    }
  };
  const handleDeleteCat = async () => {
    if (!deleteCat) return;
    setDeletingCat(true);
    try {
      await api.categories.delete(deleteCat.id);
      toast.deleted("Kategoriya o'chirildi");
      setDeleteCat(null);
      if (selectedCat === deleteCat.id) setSelectedCat(null);
      load();
    } catch {
      toast.error();
    } finally {
      setDeletingCat(false);
    }
  };
  // Product handlers
  const openCreateProd = () => {
    setEditingProd(null);
    setProdForm({
      name: '',
      price: '',
      categoryId: selectedCat || categories[0]?.id || '',
      isActive: true
    });
    setProdErrors({});
    setProductModal({
      open: true,
      editing: null
    });
  };
  const openEditProd = (p: Product) => {
    setEditingProd(p);
    setProdForm({
      name: p.name,
      price: String(p.price),
      categoryId: p.categoryId,
      isActive: p.isActive
    });
    setProdErrors({});
    setProductModal({
      open: true,
      editing: p
    });
  };
  const validateProd = () => {
    const e: Record<string, string> = {};
    if (!prodForm.name.trim()) e.name = "Bu maydon to'ldirilishi shart";
    if (!prodForm.price || Number(prodForm.price) <= 0)
    e.price = "Narx 0 dan katta bo'lishi kerak";
    if (!prodForm.categoryId) e.categoryId = 'Kategoriya tanlanishi shart';
    setProdErrors(e);
    return Object.keys(e).length === 0;
  };
  const handleSaveProd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateProd()) return;
    setSavingProd(true);
    try {
      const data = {
        name: prodForm.name,
        price: Number(prodForm.price),
        categoryId: prodForm.categoryId,
        isActive: prodForm.isActive,
        branchId: activeBranchId
      };
      if (editingProd) {
        await api.products.update(editingProd.id, data);
        toast.success('Mahsulot yangilandi');
      } else {
        await api.products.create(data);
        toast.success("Mahsulot qo'shildi");
      }
      setProductModal({
        open: false,
        editing: null
      });
      load();
    } catch {
      toast.error();
    } finally {
      setSavingProd(false);
    }
  };
  const handleDeleteProd = async () => {
    if (!deleteProd) return;
    setDeletingProd(true);
    try {
      await api.products.delete(deleteProd.id);
      toast.deleted("Mahsulot o'chirildi");
      setDeleteProd(null);
      load();
    } catch {
      toast.error();
    } finally {
      setDeletingProd(false);
    }
  };
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900">
            Mahsulotlar
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Faol filial:{' '}
            <span className="font-medium text-indigo-600">
              {activeBranchName}
            </span>
          </p>
        </div>
      </div>

      {loading ?
      <TableSkeleton /> :

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Mobile Categories (Horizontal Scroll) */}
          <div className="md:hidden">
            <div className="flex gap-2 overflow-x-auto pb-2 no-scrollbar">
              {categories.map((c) => {
              const count = products.filter(
                (p) => p.categoryId === c.id
              ).length;
              return (
                <button
                  key={c.id}
                  onClick={() => setSelectedCat(c.id)}
                  className={clsx(
                    'flex-shrink-0 px-3 py-1.5 rounded-full text-sm font-medium whitespace-nowrap transition-colors',
                    selectedCat === c.id ?
                    'bg-indigo-600 text-white' :
                    'bg-white border border-slate-200 text-slate-600'
                  )}>

                    {c.name} <span className="opacity-70 ml-1">({count})</span>
                  </button>);

            })}
            </div>
            <Button
            variant="ghost"
            size="sm"
            onClick={openCreateCat}
            className="w-full mt-2 text-xs">

              <Plus className="h-3 w-3 mr-1" />
              Kategoriya qo'shish
            </Button>
          </div>

          {/* Desktop Categories Panel */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="px-4 py-3.5 border-b border-slate-100 flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-900">
                Kategoriyalar
              </h3>
              <Button size="sm" variant="ghost" onClick={openCreateCat}>
                <Plus className="h-3.5 w-3.5 mr-1" />
                Qo'shish
              </Button>
            </div>
            {categories.length === 0 ?
          <div className="py-10 text-center">
                <Tag className="h-8 w-8 text-slate-300 mx-auto mb-2" />
                <p className="text-xs text-slate-400">Kategoriyalar yo'q</p>
                <p className="text-slate-400 text-sm">
                  Bu kategoriyada mahsulotlar yo'q
                </p>
              </div> :

          <div className="divide-y divide-slate-100">
                {categories.map((c) => {
              const count = products.filter(
                (p) => p.categoryId === c.id
              ).length;
              return (
                <div
                  key={c.id}
                  onClick={() => setSelectedCat(c.id)}
                  className={clsx(
                    'flex items-center justify-between px-4 py-3 cursor-pointer transition-colors group',
                    selectedCat === c.id ?
                    'bg-indigo-50' :
                    'hover:bg-slate-50'
                  )}>

                      <div className="flex items-center space-x-2 min-w-0">
                        <span
                      className={clsx(
                        'text-sm font-medium truncate',
                        selectedCat === c.id ?
                        'text-indigo-700' :
                        'text-slate-700'
                      )}>

                          {c.name}
                        </span>
                        <span className="text-xs text-slate-400 flex-shrink-0">
                          {count} ta
                        </span>
                      </div>
                      <div
                    className="flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity"
                    onClick={(e) => e.stopPropagation()}>

                        <button
                      onClick={() => openEditCat(c)}
                      className="p-1 text-slate-400 hover:text-indigo-600 rounded transition-colors">

                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                      onClick={() => setDeleteCat(c)}
                      className="p-1 text-slate-400 hover:text-red-600 rounded transition-colors">

                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>);

            })}
              </div>
          }
          </div>

          {/* Products Panel */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center space-x-3">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                placeholder="Mahsulot qidirish..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full h-10 pl-9 pr-4 rounded-xl border border-slate-300 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />

              </div>
              {/* Mobile: Icon only button */}
              <div className="md:hidden">
                <Button
                variant="primary"
                size="icon"
                onClick={openCreateProd}
                aria-label="Mahsulot qo'shish">

                  <Plus className="h-5 w-5" />
                </Button>
              </div>
              {/* Desktop: Full button */}
              <div className="hidden md:block">
                <Button variant="primary" onClick={openCreateProd}>
                  <Plus className="h-4 w-4 mr-1.5" />
                  Mahsulot qo'shish
                </Button>
              </div>
            </div>

            {filteredProducts.length === 0 ?
          <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
                <ShoppingBag className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">Mahsulotlar topilmadi</p>
              </div> :

          <>
                {/* Mobile Card List */}
                <div className="md:hidden space-y-3">
                  {filteredProducts.map((p) =>
              <div
                key={p.id}
                className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex justify-between items-center">

                      <div className="flex-1 min-w-0 mr-3">
                        <p className="font-medium text-slate-900 text-sm line-clamp-2">
                          {p.name}
                        </p>
                        <p className="text-xs text-slate-400 mt-0.5">
                          {categories.find((c) => c.id === p.categoryId)?.
                    name || '—'}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0 mr-3">
                        <p className="font-bold text-indigo-600 text-sm whitespace-nowrap">
                          {formatCurrency(p.price)}
                        </p>
                        <div className="mt-1 flex justify-end">
                          {p.isActive ?
                    <Badge variant="success" size="sm">
                              Faol
                            </Badge> :

                    <Badge variant="secondary" size="sm">
                              Nofaol
                            </Badge>
                    }
                        </div>
                      </div>
                      <div className="flex flex-col gap-1">
                        <button
                    onClick={() => openEditProd(p)}
                    className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-lg">

                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                    onClick={() => setDeleteProd(p)}
                    className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg">

                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
              )}
                </div>

                {/* Desktop Table */}
                <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                      <tr>
                        <th className="px-4 py-3 text-left font-medium">
                          Nomi
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Narxi
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Kategoriya
                        </th>
                        <th className="px-4 py-3 text-left font-medium">
                          Holat
                        </th>
                        <th className="px-4 py-3 text-right font-medium">
                          Amallar
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {filteredProducts.map((p) =>
                  <tr
                    key={p.id}
                    className="hover:bg-slate-50 transition-colors">

                          <td className="px-4 py-3 font-medium text-slate-900">
                            {p.name}
                          </td>
                          <td className="px-4 py-3 text-right font-semibold text-indigo-600">
                            {formatCurrency(p.price)}
                          </td>
                          <td className="px-4 py-3 text-slate-500">
                            {categories.find((c) => c.id === p.categoryId)?.
                      name || '—'}
                          </td>
                          <td className="px-4 py-3">
                            {p.isActive ?
                      <Badge variant="success" size="sm">
                                Faol
                              </Badge> :

                      <Badge variant="secondary" size="sm">
                                Nofaol
                              </Badge>
                      }
                          </td>
                          <td className="px-4 py-3 text-right space-x-1">
                            <button
                        onClick={() => openEditProd(p)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">

                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                        onClick={() => setDeleteProd(p)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">

                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        </tr>
                  )}
                    </tbody>
                  </table>
                </div>
              </>
          }
          </div>
        </div>
      }

      {/* Mobile FAB */}
      <button
        onClick={openCreateProd}
        className="lg:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Mahsulot qo'shish">

        <Plus className="h-7 w-7" />
      </button>

      {/* Category modal */}
      <Modal
        isOpen={categoryModal.open}
        onClose={() =>
        setCategoryModal({
          open: false,
          editing: null
        })
        }
        title={
        categoryModal.editing ? 'Kategoriyani tahrirlash' : 'Yangi kategoriya'
        }
        size="sm">

        <form onSubmit={handleSaveCat} className="space-y-4">
          <Input
            label="Kategoriya nomi"
            placeholder="Masalan: Salatlar"
            value={catName}
            onChange={(e) => {
              setCatName(e.target.value);
              setCatNameError('');
            }}
            error={catNameError}
            required />

          <div className="flex space-x-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() =>
              setCategoryModal({
                open: false,
                editing: null
              })
              }>

              Bekor qilish
            </Button>
            <Button type="submit" className="flex-1" isLoading={savingCat}>
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>

      {/* Product modal */}
      <Modal
        isOpen={productModal.open}
        onClose={() =>
        setProductModal({
          open: false,
          editing: null
        })
        }
        title={
        productModal.editing ? 'Mahsulotni tahrirlash' : 'Yangi mahsulot'
        }
        size="sm">

        <form onSubmit={handleSaveProd} className="space-y-4">
          <Input
            label="Mahsulot nomi"
            placeholder="Masalan: Sezar salati"
            value={prodForm.name}
            onChange={(e) => {
              setProdForm((p) => ({
                ...p,
                name: e.target.value
              }));
              setProdErrors((p) => ({
                ...p,
                name: ''
              }));
            }}
            error={prodErrors.name}
            required />

          <Input
            label="Narxi (so'm)"
            type="number"
            placeholder="0"
            value={prodForm.price}
            onChange={(e) => {
              setProdForm((p) => ({
                ...p,
                price: e.target.value
              }));
              setProdErrors((p) => ({
                ...p,
                price: ''
              }));
            }}
            error={prodErrors.price}
            required />

          <Select
            label="Kategoriya"
            options={categories.map((c) => ({
              value: c.id,
              label: c.name
            }))}
            value={prodForm.categoryId}
            onChange={(e) => {
              setProdForm((p) => ({
                ...p,
                categoryId: e.target.value
              }));
              setProdErrors((p) => ({
                ...p,
                categoryId: ''
              }));
            }}
            error={prodErrors.categoryId}
            placeholder="Kategoriya tanlang"
            required />

          <div className="flex items-center justify-between p-3 bg-slate-50 rounded-xl">
            <div>
              <p className="text-sm font-medium text-slate-700">
                Faol (sotuvda bor)
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
              setProdForm((p) => ({
                ...p,
                isActive: !p.isActive
              }))
              }
              className={clsx(
                'relative h-6 w-11 rounded-full transition-colors',
                prodForm.isActive ? 'bg-indigo-600' : 'bg-slate-300'
              )}>

              <span
                className={clsx(
                  'absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform',
                  prodForm.isActive ? 'translate-x-5' : 'translate-x-0.5'
                )} />

            </button>
          </div>
          <div className="flex space-x-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() =>
              setProductModal({
                open: false,
                editing: null
              })
              }>

              Bekor qilish
            </Button>
            <Button type="submit" className="flex-1" isLoading={savingProd}>
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteCat}
        onClose={() => setDeleteCat(null)}
        onConfirm={handleDeleteCat}
        title="Kategoriyani o'chirish"
        message={`"${deleteCat?.name}" kategoriyani o'chirishni tasdiqlaysizmi?`}
        isLoading={deletingCat} />

      <ConfirmDialog
        isOpen={!!deleteProd}
        onClose={() => setDeleteProd(null)}
        onConfirm={handleDeleteProd}
        title="Mahsulotni o'chirish"
        message={`"${deleteProd?.name}" mahsulotni o'chirishni tasdiqlaysizmi?`}
        isLoading={deletingProd} />

    </div>);

}