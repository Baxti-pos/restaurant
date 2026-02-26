import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Badge } from '../../components/ui/Badge';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { toast } from '../../components/ui/Toast';
import { Plus, Edit2, Trash2, Users, User, Phone, Send } from 'lucide-react';
import { api } from '../../lib/api';
import { Waiter } from '../../lib/types';
import { clsx } from 'clsx';
interface WaitersPageProps {
  activeBranchId: string;
  activeBranchName: string;
}
const shiftStatusConfig: Record<
  string,
  {
    label: string;
    variant: 'success' | 'warning' | 'danger' | 'default';
  }> =
{
  active: {
    label: 'Faol',
    variant: 'success'
  },
  ended: {
    label: 'Tugagan',
    variant: 'default'
  },
  not_started: {
    label: 'Boshlanmagan',
    variant: 'warning'
  }
};
const shiftBadge = (s: Waiter['shiftStatus']) => {
  if (s === 'active') return <Badge variant="success">Smenada</Badge>;
  if (s === 'ended') return <Badge variant="warning">Smena tugagan</Badge>;
  return <Badge variant="secondary">Boshlanmagan</Badge>;
};
export function WaitersPage({
  activeBranchId,
  activeBranchName
}: WaitersPageProps) {
  const [waiters, setWaiters] = useState<Waiter[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Waiter | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Waiter | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    phone: '',
    telegramId: '',
    isEnabled: true
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const load = () => {
    setLoading(true);
    api.waiters.listByBranch(activeBranchId).then((d) => {
      setWaiters(d);
      setLoading(false);
    });
  };
  useEffect(() => {
    load();
  }, [activeBranchId]);
  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      phone: '',
      telegramId: '',
      isEnabled: true
    });
    setErrors({});
    setModalOpen(true);
  };
  const openEdit = (w: Waiter) => {
    setEditing(w);
    setForm({
      name: w.name,
      phone: w.phone,
      telegramId: w.telegramId,
      isEnabled: w.isEnabled
    });
    setErrors({});
    setModalOpen(true);
  };
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Bu maydon to'ldirilishi shart";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const handleSave = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        await api.waiters.update(editing.id, form);
        toast.success('Ofitsant yangilandi');
      } else {
        await api.waiters.create({
          ...form,
          branchId: activeBranchId,
          shiftStatus: 'not_started'
        });
        toast.success("Ofitsant qo'shildi");
      }
      setModalOpen(false);
      load();
    } catch {
      toast.error();
    } finally {
      setSaving(false);
    }
  };
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.waiters.delete(deleteTarget.id);
      toast.deleted("Ofitsant o'chirildi");
      setDeleteTarget(null);
      load();
    } catch {
      toast.error();
    } finally {
      setDeleting(false);
    }
  };
  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-lg md:text-xl font-bold text-slate-900">
            Ofitsantlar
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Faol filial:{' '}
            <span className="font-medium text-indigo-600">
              {activeBranchName}
            </span>
          </p>
        </div>
        {/* Mobile: Icon Button */}
        <div className="md:hidden">
          <Button size="icon" onClick={openCreate}>
            <Plus className="h-5 w-5" />
          </Button>
        </div>
        {/* Desktop: Full Button */}
        <div className="hidden md:block">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Ofitsant qo'shish
          </Button>
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={openCreate}
        className="lg:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Ofitsant qo'shish">

        <Plus className="h-7 w-7" />
      </button>

      {loading ?
      <TableSkeleton /> :
      waiters.length === 0 ?
      <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <Users className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">
            Bu filialda hali ofitsantlar yo'q
          </p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Ofitsant qo'shish
          </Button>
        </div> :

      <>
          {/* Mobile List Cards */}
          <div className="md:hidden space-y-2">
            {waiters.map((w) =>
          <div
            key={w.id}
            className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-center gap-3">

                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-indigo-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm">{w.name}</p>
                  <div className="flex items-center gap-2 mt-0.5">
                    {w.phone &&
                <div className="flex items-center text-xs text-slate-500">
                        <Phone className="h-3 w-3 mr-1" />
                        {w.phone}
                      </div>
                }
                    {w.telegramId &&
                <div className="flex items-center text-xs text-slate-400">
                        <Send className="h-3 w-3 mr-1" />
                        {w.telegramId}
                      </div>
                }
                  </div>
                  <div className="flex gap-1 mt-1.5">
                    {shiftBadge(w.shiftStatus)}
                    {w.isEnabled ?
                <Badge variant="success">Faol</Badge> :

                <Badge variant="danger">Bloklangan</Badge>
                }
                  </div>
                </div>
                <div className="flex flex-col gap-1">
                  <button
                onClick={() => openEdit(w)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-lg">

                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                onClick={() => setDeleteTarget(w)}
                className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg">

                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
          )}
          </div>

          {/* Desktop Table */}
          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Ism
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Telefon
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Telegram
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Smena holati
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Holat
                    </th>
                    <th className="px-5 py-3.5 text-right font-medium">
                      Amallar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {waiters.map((w) =>
                <tr
                  key={w.id}
                  className="hover:bg-slate-50 transition-colors">

                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-8 w-8 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                            <User className="h-4 w-4 text-indigo-600" />
                          </div>
                          <span className="font-medium text-slate-900">
                            {w.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {w.phone || '—'}
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        {w.telegramId || '—'}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {shiftBadge(w.shiftStatus)}
                      </td>
                      <td className="px-5 py-4 text-center">
                        {w.isEnabled ?
                    <Badge variant="success">Faol</Badge> :

                    <Badge variant="danger">Bloklangan</Badge>
                    }
                      </td>
                      <td className="px-5 py-4 text-right space-x-1">
                        <button
                      onClick={() => openEdit(w)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">

                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                      onClick={() => setDeleteTarget(w)}
                      className="p-2 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">

                          <Trash2 className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                )}
                </tbody>
              </table>
            </div>
          </div>
        </>
      }

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Ofitsantni tahrirlash' : 'Yangi ofitsant'}
        size="sm">

        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Ism familiya"
            placeholder="Jasur Toshmatov"
            value={form.name}
            onChange={(e) =>
            setForm({
              ...form,
              name: e.target.value
            })
            }
            error={errors.name}
            required />

          <Input
            label="Telefon raqam"
            placeholder="+998901234567"
            value={form.phone}
            onChange={(e) =>
            setForm({
              ...form,
              phone: e.target.value
            })
            }
            error={errors.phone}
            required />

          <Input
            label="Telegram ID"
            placeholder="@username"
            value={form.telegramId}
            onChange={(e) =>
            setForm({
              ...form,
              telegramId: e.target.value
            })
            } />

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
        title="Ofitsantni o'chirish"
        message={`"${deleteTarget?.name}" ni o'chirishni tasdiqlaysizmi?`}
        isLoading={deleting} />

    </div>);

}