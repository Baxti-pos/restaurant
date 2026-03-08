import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Select } from '../../components/ui/Select';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { StatCard } from '../../components/ui/StatCard';
import {
  CardSkeleton,
  TableSkeleton } from
'../../components/ui/LoadingSkeleton';
import { toast } from '../../components/ui/Toast';
import {
  Plus,
  Edit2,
  Trash2,
  Receipt,
  DollarSign,
  ShoppingCart,
  Briefcase,
  Zap } from
'lucide-react';
import { api } from '../../lib/api';
import { Expense, ExpenseType } from '../../lib/types';
import { formatCurrency, formatDateShort, todayStr } from '../../lib/formatters';
import { clsx } from 'clsx';
interface ExpensesPageProps {
  activeBranchId: string;
  activeBranchName: string;
}
const expenseTypes = [
{
  value: 'salary',
  label: 'Oylik'
},
{
  value: 'market',
  label: 'Bozorlik'
},
{
  value: 'other',
  label: 'Boshqa'
}];

const expenseTypeLabels: Record<string, string> = {
  salary: 'Ish haqi',
  market: 'Bozor xarajati',
  other: 'Boshqa xarajat'
};
const typeBadge = (t: ExpenseType) => {
  if (t === 'salary')
  return (
    <Badge variant="info" size="sm">
        Oylik
      </Badge>);

  if (t === 'market')
  return (
    <Badge variant="success" size="sm">
        Bozorlik
      </Badge>);

  return (
    <Badge variant="warning" size="sm">
      Boshqa
    </Badge>);

};
export function ExpensesPage({
  activeBranchId,
  activeBranchName
}: ExpensesPageProps) {
  const [date, setDate] = useState(todayStr());
  const [expenses, setExpenses] = useState<Expense[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({
    type: 'market' as ExpenseType,
    name: '',
    amount: '',
    note: '',
    date: todayStr()
  });
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [editModal, setEditModal] = useState<Expense | null>(null);
  const [editForm, setEditForm] = useState({
    type: 'market' as ExpenseType,
    name: '',
    amount: '',
    note: ''
  });
  const [editErrors, setEditErrors] = useState<Record<string, string>>({});
  const [savingEdit, setSavingEdit] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Expense | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const load = () => {
    setLoading(true);
    api.expenses.listByBranchAndDate(activeBranchId, date).then((d) => {
      setExpenses(d);
      setLoading(false);
    });
  };
  useEffect(() => {
    load();
  }, [activeBranchId, date]);
  const total = expenses.reduce((s, e) => s + e.amount, 0);
  const salary = expenses.
  filter((e) => e.type === 'salary').
  reduce((s, e) => s + e.amount, 0);
  const market = expenses.
  filter((e) => e.type === 'market').
  reduce((s, e) => s + e.amount, 0);
  const other = expenses.
  filter((e) => e.type === 'other').
  reduce((s, e) => s + e.amount, 0);
  const validateForm = (f: typeof form) => {
    const e: Record<string, string> = {};
    if (!f.name.trim()) e.name = "Bu maydon to'ldirilishi shart";
    if (!f.amount || Number(f.amount) <= 0)
    e.amount = "Summa 0 dan katta bo'lishi kerak";
    return e;
  };
  const handleCreate = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validateForm(form);
    if (Object.keys(e).length > 0) {
      setFormErrors(e);
      return;
    }
    setSaving(true);
    try {
      await api.expenses.create({
        branchId: activeBranchId,
        type: form.type,
        name: form.name,
        amount: Number(form.amount),
        note: form.note,
        date: form.date
      });
      toast.success('Rashod saqlandi');
      setForm({
        type: 'market',
        name: '',
        amount: '',
        note: '',
        date: todayStr()
      });
      setFormErrors({});
      load();
    } catch {
      toast.error();
    } finally {
      setSaving(false);
    }
  };
  const openEdit = (exp: Expense) => {
    setEditModal(exp);
    setEditForm({
      type: exp.type,
      name: exp.name,
      amount: String(exp.amount),
      note: exp.note || ''
    });
    setEditErrors({});
  };
  const handleEdit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    const e = validateForm(editForm);
    if (Object.keys(e).length > 0) {
      setEditErrors(e);
      return;
    }
    if (!editModal) return;
    setSavingEdit(true);
    try {
      await api.expenses.update(editModal.id, {
        type: editForm.type,
        name: editForm.name,
        amount: Number(editForm.amount),
        note: editForm.note
      });
      toast.success('Rashod yangilandi');
      setEditModal(null);
      load();
    } catch {
      toast.error();
    } finally {
      setSavingEdit(false);
    }
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.expenses.delete(deleteTarget.id);
      toast.deleted("Rashod o'chirildi");
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
    const e = validateForm(form);
    if (Object.keys(e).length > 0) {
      setFormErrors(e);
      return;
    }
    if (editing) {
      setSavingEdit(true);
      try {
        await api.expenses.update(editModal.id, {
          type: form.type,
          name: form.name,
          amount: Number(form.amount),
          note: form.note,
          date: form.date
        });
        toast.success('Rashod yangilandi');
        setEditModal(null);
        load();
      } catch {
        toast.error();
      } finally {
        setSavingEdit(false);
      }
    } else {
      setSaving(true);
      try {
        await api.expenses.create({
          branchId: activeBranchId,
          type: form.type,
          name: form.name,
          amount: Number(form.amount),
          note: form.note,
          date: form.date
        });
        toast.success('Rashod saqlandi');
        setForm({
          type: 'market',
          name: '',
          amount: '',
          note: '',
          date: todayStr()
        });
        setFormErrors({});
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
    setEditing(false);
    setForm({
      type: 'market',
      name: '',
      amount: '',
      note: '',
      date: todayStr()
    });
    setFormErrors({});
    setModalOpen(true);
  };
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div className='hidden lg:block'>
          <h1 className="text-lg md:text-xl font-bold text-slate-900">
            Xarajatlar
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Faol filial:{' '}
            <span className="font-medium text-indigo-600">
              {activeBranchName}
            </span>
          </p>
        </div>
        <Input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
          className="w-auto" />

      </div>

      {/* Summary cards */}
      {loading ?
      <CardSkeleton count={4} /> :

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
          <StatCard
          title="Jami xarajat"
          value={formatCurrency(total)}
          icon={DollarSign}
          color="red" />

          <StatCard
          title="Oylik jami"
          value={formatCurrency(salary)}
          icon={Briefcase}
          color="indigo" />

          <StatCard
          title="Bozorlik jami"
          value={formatCurrency(market)}
          icon={ShoppingCart}
          color="green" />

          <StatCard
          title="Boshqa jami"
          value={formatCurrency(other)}
          icon={Zap}
          color="amber" />

        </div>
      }

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Create form (Desktop only) */}
        <div className="hidden lg:block bg-white rounded-xl border border-slate-200 p-5">
          <h3 className="text-sm font-semibold text-slate-900 mb-4">
            Rashod qo'shish
          </h3>
          <form onSubmit={handleCreate} className="space-y-3">
            <Select
              label="Turi"
              value={form.type}
              onChange={(e) =>
              setForm({
                ...form,
                type: e.target.value as ExpenseType
              })
              }
              options={expenseTypes}
              required />
            <Input
              label="Nomi"
              placeholder="Xarajat nomi"
              value={form.name}
              onChange={(e) =>
              setForm({
                ...form,
                name: e.target.value
              })
              }
              required />

            <Input
              label="Summa (so'm)"
              type="number"
              placeholder="0"
              value={form.amount || ''}
              onChange={(e) =>
              setForm({
                ...form,
                amount: Number(e.target.value)
              })
              }
              required />

            <Input
              label="Izoh (ixtiyoriy)"
              placeholder="Qo'shimcha ma'lumot"
              value={form.note}
              onChange={(e) =>
              setForm({
                ...form,
                note: e.target.value
              })
              } />

            <Input
              label="Sana"
              type="date"
              value={form.date}
              onChange={(e) =>
              setForm({
                ...form,
                date: e.target.value
              })
              }
              required />

            <div className="flex space-x-3 pt-2">
              <Button type="submit" className="flex-1" isLoading={saving}>
                Saqlash
              </Button>
            </div>
          </form>
        </div>

        {/* Expenses list */}
        <div className="lg:col-span-2">
          <h3 className="text-sm font-semibold text-slate-900 mb-3 hidden lg:block">
            {formatDateShort(date)} sanasidagi xarajat
          </h3>
          {loading ?
          <TableSkeleton rows={4} /> :
          expenses.length === 0 ?
          <div className="bg-white rounded-xl border border-slate-200 py-14 text-center">
              <Receipt className="h-10 w-10 text-slate-300 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">Bu kunda xarajatlar yo'q</p>
            </div> :

          <>
              {/* Mobile List Items */}
              <div className="lg:hidden space-y-3">
                {expenses.map((exp) =>
              <div
                key={exp.id}
                className="bg-white rounded-xl border border-slate-200 px-4 py-3">

                    <div className="flex justify-between items-center mb-2">
                      {typeBadge(exp.type)}
                      <span className="font-bold text-red-600 whitespace-nowrap">
                        {formatCurrency(exp.amount)}
                      </span>
                    </div>
                    <p className="font-medium text-slate-800 text-sm mb-1">
                      {exp.name}
                    </p>
                    {exp.note &&
                <p className="text-xs text-slate-400 mb-2">{exp.note}</p>
                }
                    <div className="flex justify-between items-center mt-2 pt-2 border-t border-slate-50">
                      <span className="text-xs text-slate-400">
                        {formatDateShort(exp.date)}
                      </span>
                      <div className="flex space-x-1">
                        <button
                      onClick={() => openEdit(exp)}
                      className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-lg">

                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                      onClick={() => setDeleteTarget(exp)}
                      className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg">

                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  </div>
              )}
              </div>

              {/* Desktop Table */}
              <div className="hidden lg:block bg-white rounded-xl border border-slate-200 overflow-hidden">
                <table className="w-full text-sm">
                  <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
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
                    {expenses.map((exp) =>
                  <tr
                    key={exp.id}
                    className="hover:bg-slate-50 transition-colors">

                        <td className="px-4 py-3">{typeBadge(exp.type)}</td>
                        <td className="px-4 py-3">
                          <p className="font-medium text-slate-800">
                            {exp.name}
                          </p>
                          {exp.note &&
                      <p className="text-xs text-slate-400 mt-0.5">
                              {exp.note}
                            </p>
                      }
                        </td>
                        <td className="px-4 py-3 text-right font-semibold text-red-600">
                          {formatCurrency(exp.amount)}
                        </td>
                        <td className="px-4 py-3 text-left">
                          {exp.note || '-'}
                        </td>
                        <td className="px-4 py-3 text-left">
                          {formatDateShort(exp.date)}
                        </td>
                        <td className="px-4 py-3 text-right space-x-1">
                          <button
                        onClick={() => openEdit(exp)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">

                            <Edit2 className="h-3.5 w-3.5" />
                          </button>
                          <button
                        onClick={() => setDeleteTarget(exp)}
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

      {/* Mobile FAB */}
      <button
        onClick={openCreateModal}
        className="lg:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform">

        <Plus className="h-7 w-7" />
      </button>

      {/* Edit/Create modal (Shared) */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Xarajatni tahrirlash' : 'Yangi xarajat'}
        size="sm">

        <form onSubmit={handleSave} className="space-y-4">
          <Select
            label="Turi"
            value={form.type}
            onChange={(e) =>
            setForm({
              ...form,
              type: e.target.value as ExpenseType
            })
            }
            options={expenseTypes}
            required />
          <Input
            label="Nomi"
            placeholder="Xarajat nomi"
            value={form.name}
            onChange={(e) =>
            setForm({
              ...form,
              name: e.target.value
            })
            }
            required />

          <Input
            label="Summa (so'm)"
            type="number"
            placeholder="0"
            value={form.amount || ''}
            onChange={(e) =>
            setForm({
              ...form,
              amount: Number(e.target.value)
            })
            }
            required />

          <Input
            label="Izoh (ixtiyoriy)"
            placeholder="Qo'shimcha ma'lumot"
            value={form.note}
            onChange={(e) =>
            setForm({
              ...form,
              note: e.target.value
            })
            } />

          <Input
            label="Sana"
            type="date"
            value={form.date}
            onChange={(e) =>
            setForm({
              ...form,
              date: e.target.value
            })
            }
            required />

          <div className="flex space-x-3 pt-2">
            <Button
              type="button"
              variant="secondary"
              className="flex-1"
              onClick={() => setModalOpen(false)}>

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
        title="Rashodini o'chirish"
        message={`"${deleteTarget?.name}" rashodini o'chirishni tasdiqlaysizmi?`}
        isLoading={deleting} />

    </div>);

}
