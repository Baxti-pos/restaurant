import React, { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Select } from "../../components/ui/Select";
import { Badge } from "../../components/ui/Badge";
import { Modal } from "../../components/ui/Modal";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { StatCard } from "../../components/ui/StatCard";
import {
  CardSkeleton,
  TableSkeleton,
} from "../../components/ui/LoadingSkeleton";
import { toast } from "../../components/ui/Toast";
import {
  Plus,
  Edit2,
  Trash2,
  Receipt,
  DollarSign,
  ShoppingCart,
  Briefcase,
  Zap,
} from "lucide-react";
import { api } from "../../lib/api";
import { getAuth } from "../../lib/auth";
import { hasPermission } from "../../lib/permissions";
import { Expense, ExpenseCategory } from "../../lib/types";
import {
  formatCurrency,
  formatDateShort,
  todayStr,
} from "../../lib/formatters";

interface ExpensesPageProps {
  activeBranchId: string;
  activeBranchName: string;
}

const typeBadge = (categoryName?: string) => {
  if (categoryName === "Ish haqi")
    return (
      <Badge variant="info" size="sm">
        Ish haqi
      </Badge>
    );

  if (categoryName === "Bozor xarajati")
    return (
      <Badge variant="success" size="sm">
        Bozorlik
      </Badge>
    );

  return (
    <Badge variant="warning" size="sm">
      {categoryName || "Boshqa"}
    </Badge>
  );
};
export function ExpensesPage({
  activeBranchId,
  activeBranchName,
}: ExpensesPageProps) {
  const authUser = getAuth().user;
  const canManageExpenses = hasPermission(authUser, "EXPENSES_MANAGE");
  const [date, setDate] = useState(todayStr());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    categoryId: "" as string,
    name: "",
    amount: "",
    note: "",
    date: todayStr(),
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editingExpenseId, setEditingExpenseId] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [exps, cats] = await Promise.all([
        api.expenses.listByBranchAndDate(activeBranchId, date),
        api.expenseCategories.listByBranch(activeBranchId),
      ]);
      setExpenses(exps);
      setCategories(cats);
      
      // Select first category by default if form category is empty
      if (!form.categoryId && cats.length > 0) {
        setForm(f => ({ ...f, categoryId: cats[0].id }));
      }
    } catch {
      toast.error();
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [activeBranchId, date]);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const salary = expenses
    .filter((e) => e.category?.name === "Ish haqi")
    .reduce((s, e) => s + e.amount, 0);
  const market = expenses
    .filter((e) => e.category?.name === "Bozor xarajati")
    .reduce((s, e) => s + e.amount, 0);
  const other = total - salary - market;
  const validateForm = (f: typeof form) => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Bu maydon to'ldirilishi shart";
    if (!f.amount || Number(f.amount) <= 0)
      e.amount = "Summa 0 dan katta bo'lishi kerak";
    return e;
  };
  const openEdit = (exp: Expense) => {
    if (!canManageExpenses) return;
    setEditing(true);
    setEditingExpenseId(exp.id);
    setForm({
      categoryId: exp.categoryId || "",
      name: exp.name,
      amount: String(exp.amount),
      note: exp.note || "",
      date: exp.date || todayStr(),
    });
    setFormErrors({});
    setModalOpen(true);
  };
  const handleDelete = async () => {
    if (!canManageExpenses) return;
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.expenses.delete(deleteTarget.id);
      toast.deleted("Xarajat o'chirildi");
      setDeleteTarget(null);
      load();
    } catch {
      toast.error();
    } finally {
      setDeleting(false);
    }
  };
  const handleSave = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!canManageExpenses) return;
    const e = validateForm(form);
    if (Object.keys(e).length > 0) {
      setFormErrors(e);
      return;
    }
    if (editing) {
      if (!editingExpenseId) {
        return;
      }
      setSaving(true);
      try {
        await api.expenses.update(editingExpenseId, {
          categoryId: form.categoryId || null,
          name: form.name,
          amount: Number(form.amount),
          note: form.note,
          date: form.date,
        });
        toast.success("Xarajat yangilandi");
        setModalOpen(false);
        setEditing(false);
        setEditingExpenseId(null);
        load();
      } catch {
        toast.error();
      } finally {
        setSaving(false);
      }
    } else {
      setSaving(true);
      try {
        await api.expenses.create({
          branchId: activeBranchId,
          categoryId: form.categoryId || null,
          name: form.name,
          amount: Number(form.amount),
          note: form.note,
          date: form.date,
        });
        toast.success("Xarajat saqlandi");
        setForm({
          categoryId: categories[0]?.id || "",
          name: "",
          amount: "",
          note: "",
          date: todayStr(),
        });
        setFormErrors({});
        setModalOpen(false);
        load();
      } catch {
        toast.error();
      } finally {
        setSaving(false);
      }
    }
  };
  // Mobile: Open modal for create
  const openCreateModal = () => {
    if (!canManageExpenses) return;
    setEditing(false);
    setEditingExpenseId(null);
    setForm({
      categoryId: categories[0]?.id || "",
      name: "",
      amount: "",
      note: "",
      date: todayStr(),
    });
    setFormErrors({});
    setModalOpen(true);
  };
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900">
            Xarajatlar
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Faol filial:{" "}
            <span className="font-medium text-indigo-600">
              {activeBranchName}
            </span>
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex-1 md:flex-none">
            <Input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full md:w-44"
            />
          </div>
          {canManageExpenses && (
            <Button
              onClick={openCreateModal}
              className="hidden md:inline-flex whitespace-nowrap"
            >
              <Plus className="h-4 w-4 mr-1.5" />
              <span className="hidden sm:inline">Xarajat qo'shish</span>
              <span className="sm:hidden">Qo'shish</span>
            </Button>
          )}
        </div>
      </div>

      {/* Summary cards */}
      {loading ? (
        <CardSkeleton count={4} />
      ) : (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
            title="Jami xarajat"
            value={formatCurrency(total)}
            icon={DollarSign}
            color="red"
          />

          <StatCard
            title="Oylik jami"
            value={formatCurrency(salary)}
            icon={Briefcase}
            color="indigo"
          />

          <StatCard
            title="Bozorlik jami"
            value={formatCurrency(market)}
            icon={ShoppingCart}
            color="green"
          />

          <StatCard
            title="Boshqa jami"
            value={formatCurrency(other)}
            icon={Zap}
            color="amber"
          />
        </div>
      )}

      <div className="space-y-6">
        {/* Expenses list */}
        <div className="w-full">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 hidden lg:block">
            {formatDateShort(date)} sanasidagi xarajatlar
          </h3>
          {loading ? (
            <TableSkeleton rows={4} />
          ) : expenses.length === 0 ? (
            <div className="bg-white rounded-xl border border-slate-200 py-14 text-center">
              <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Bu kunda xarajatlar yo'q</p>
            </div>
          ) : (
            <>
              {/* Mobile List Items */}
              <div className="lg:hidden space-y-3">
                {expenses.map((exp) => (
                  <div
                    key={exp.id}
                    className="bg-white rounded-xl border border-slate-200 px-4 py-3"
                  >
                    <div className="flex justify-between items-center mb-2">
                      {typeBadge(exp.category?.name)}
                      <span className="font-bold text-red-600 whitespace-nowrap">
                        {formatCurrency(exp.amount)}
                      </span>
                    </div>
                    <p className="font-medium text-slate-800 text-sm mb-1">
                      {exp.name}
                    </p>
                    {exp.note && (
                      <p className="text-xs text-slate-400 mb-2">{exp.note}</p>
                    )}
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
                      <span className="text-xs text-slate-400">
                        {formatDateShort(exp.date)}
                      </span>
                      {canManageExpenses && (
                        <div className="flex space-x-1">
                          <button
                            onClick={() => openEdit(exp)}
                            className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-lg"
                          >
                            <Edit2 className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(exp)}
                            className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-hidden max-h-[calc(100vh-260px)] overflow-y-auto">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200 sticky top-0 z-10">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Turi
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Nomi
                      </th>
                      <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Summa
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Izoh
                      </th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                        Sana
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {expenses.map((exp) => (
                      <tr
                        key={exp.id}
                        className="hover:bg-slate-50 transition-colors"
                      >
                        <td className="px-4 py-3">{typeBadge(exp.category?.name)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">
                            {exp.name}
                          </p>
                          {exp.note && (
                            <p className="text-xs text-slate-400 mt-0.5">
                              {exp.note}
                            </p>
                          )}
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600">
                          {formatCurrency(exp.amount)}
                        </td>
                        <td className="px-4 py-3 text-left">
                          {exp.note || "-"}
                        </td>
                        <td className="px-4 py-3 text-left">
                          {formatDateShort(exp.date)}
                        </td>
                        {canManageExpenses && (
                          <td className="px-4 py-3 text-right space-x-1">
                            <button
                              onClick={() => openEdit(exp)}
                              className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors"
                            >
                              <Edit2 className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => setDeleteTarget(exp)}
                              className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Mobile FAB */}
      {canManageExpenses && (
        <button
          onClick={openCreateModal}
          className="lg:hidden fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-40 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        >
          <Plus className="h-7 w-7" />
        </button>
      )}

      {/* Edit/Create modal (Shared) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Xarajatni tahrirlash" : "Yangi xarajat"}
        size="sm"
      >
        <form onSubmit={handleSave} className="space-y-4">
          <Select
            label="Turi"
            value={form.categoryId}
            onChange={(e) =>
              setForm({
                ...form,
                categoryId: e.target.value,
              })
            }
            options={categories.map(c => ({ value: c.id, label: c.name }))}
            required
          />
          <Input
            label="Nomi"
            placeholder="Xarajat nomi"
            value={form.name}
            onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value,
              })
            }
            error={formErrors.name}
            required
          />

          <Input
            label="Summa (so'm)"
            type="number"
            placeholder="0"
            value={form.amount}
            onChange={(e) =>
              setForm({
                ...form,
                amount: e.target.value,
              })
            }
            error={formErrors.amount}
            required
          />

          <Input
            label="Izoh (ixtiyoriy)"
            placeholder="Qo'shimcha ma'lumot"
            value={form.note}
            onChange={(e) =>
              setForm({
                ...form,
                note: e.target.value,
              })
            }
          />

          <Input
            label="Sana"
            type="date"
            value={form.date}
            onChange={(e) =>
              setForm({
                ...form,
                date: e.target.value,
              })
            }
            calendarPosition="up"
            required
          />

          <div className="flex space-x-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setModalOpen(false)}
            >
              Bekor qilish
            </Button>
            <Button type="submit" className="flex-1" isLoading={saving}>
              Saqlash
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDelete}
        title="Xarajatini o'chirish"
        message={`"${deleteTarget?.name}" xarajatini o'chirishni tasdiqlaysizmi?`}
        isLoading={deleting}
      />
    </div>
  );
}
