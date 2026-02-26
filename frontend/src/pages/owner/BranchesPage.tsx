import React, { useEffect, useState } from 'react';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { toast } from '../../components/ui/Toast';
import { Plus, Edit2, Trash2, Building2, MapPin, Clock } from 'lucide-react';
import { api } from '../../lib/api';
import { Branch } from '../../lib/types';
interface BranchesPageProps {
  onBranchesChange?: () => void;
}
export function BranchesPage({ onBranchesChange }: BranchesPageProps) {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Branch | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Branch | null>(null);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [form, setForm] = useState({
    name: '',
    address: '',
    shiftStart: '08:00',
    shiftEnd: '22:00'
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const load = () => {
    setLoading(true);
    api.branches.list().then((data) => {
      setBranches(data);
      setLoading(false);
    });
  };
  useEffect(() => {
    load();
  }, []);
  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      address: '',
      shiftStart: '08:00',
      shiftEnd: '22:00'
    });
    setErrors({});
    setModalOpen(true);
  };
  const openEdit = (b: Branch) => {
    setEditing(b);
    setForm({
      name: b.name,
      address: b.address,
      shiftStart: b.shiftStart,
      shiftEnd: b.shiftEnd
    });
    setErrors({});
    setModalOpen(true);
  };
  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Bu maydon to'ldirilishi shart";
    if (!form.address.trim()) e.address = "Bu maydon to'ldirilishi shart";
    setErrors(e);
    return Object.keys(e).length === 0;
  };
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setSaving(true);
    try {
      if (editing) {
        await api.branches.update(editing.id, {
          ...form,
          timezone: 'Asia/Tashkent'
        });
        toast.success('Filial yangilandi');
      } else {
        await api.branches.create({
          ...form,
          timezone: 'Asia/Tashkent',
          isActive: true
        });
        toast.success("Filial qo'shildi");
      }
      setModalOpen(false);
      load();
      onBranchesChange?.();
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
      await api.branches.delete(deleteTarget.id);
      toast.deleted("Filial o'chirildi");
      setDeleteTarget(null);
      load();
      onBranchesChange?.();
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
            Filiallar
          </h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Barcha filiallarni boshqarish
          </p>
        </div>
        {/* Desktop: Full Button only */}
        <div className="hidden md:block">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Filial qo'shish
          </Button>
        </div>
      </div>

      {/* Mobile FAB */}
      <button
        onClick={openCreate}
        className="lg:hidden fixed bottom-20 right-4 z-40 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Filial qo'shish">

        <Plus className="h-7 w-7" />
      </button>

      {loading ?
      <TableSkeleton /> :
      branches.length === 0 ?
      <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <Building2 className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Hali filiallar yo'q</p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Filial qo'shish
          </Button>
        </div> :

      <>
          {/* Mobile Cards */}
          <div className="md:hidden space-y-3">
            {branches.map((b) =>
          <div
            key={b.id}
            className="bg-white rounded-xl border border-slate-200 p-4">

                <div className="flex justify-between items-start mb-3">
                  <div className="flex items-center space-x-3">
                    <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                      <Building2 className="h-4.5 w-4.5 text-indigo-600" />
                    </div>
                    <span className="font-semibold text-slate-900">
                      {b.name}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <button
                  onClick={() => openEdit(b)}
                  className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-lg">

                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                  onClick={() => setDeleteTarget(b)}
                  className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg">

                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
                <div className="space-y-2">
                  <div className="flex items-start space-x-2 text-sm text-slate-600">
                    <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{b.address}</span>
                  </div>
                  <div className="flex items-center space-x-2 text-sm text-slate-600">
                    <Clock className="h-4 w-4 text-slate-400" />
                    <span>
                      {b.shiftStart} – {b.shiftEnd}
                    </span>
                  </div>
                  <div className="pt-1">
                    <span
                  className={`px-2 py-1 rounded-full text-xs font-medium ${b.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>

                      {b.isActive ? 'Faol' : 'Boshqarilmagan'}
                    </span>
                  </div>
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
                      Filial nomi
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Manzil
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Smena vaqti
                    </th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Holat
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">
                      Amallar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {branches.map((b) =>
                <tr
                  key={b.id}
                  className="hover:bg-slate-50 transition-colors">

                      <td className="px-5 py-4">
                        <div className="flex items-center space-x-3">
                          <div className="h-9 w-9 rounded-xl bg-indigo-50 flex items-center justify-center flex-shrink-0">
                            <Building2
                          className="h-4.5 w-4.5 text-indigo-600"
                          style={{
                            width: 18,
                            height: 18
                          }} />

                          </div>
                          <span className="font-medium text-slate-900">
                            {b.name}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <div className="flex items-center space-x-1.5">
                          <MapPin className="h-3.5 w-3.5 text-slate-400 flex-shrink-0" />
                          <span>{b.address}</span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-slate-600">
                        <div className="flex items-center space-x-1.5">
                          <Clock className="h-3.5 w-3.5 text-slate-400" />
                          <span>
                            {b.shiftStart} – {b.shiftEnd}
                          </span>
                        </div>
                      </td>
                      <td className="px-5 py-4 text-center">
                        <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${b.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>

                          {b.isActive ? 'Faol' : 'Boshqarilmagan'}
                        </span>
                      </td>
                      <td className="px-5 py-4 text-right space-x-1">
                        <button
                      onClick={() => openEdit(b)}
                      className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">

                          <Edit2 className="h-4 w-4" />
                        </button>
                        <button
                      onClick={() => setDeleteTarget(b)}
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

      {/* Create/Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? 'Filialni tahrirlash' : 'Yangi filial'}
        size="md">

        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="Filial nomi"
            placeholder="Chilonzor filiali"
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
            label="Manzil"
            placeholder="Toshkent sh., Chilonzor tumani..."
            value={form.address}
            onChange={(e) =>
            setForm({
              ...form,
              address: e.target.value
            })
            }
            error={errors.address}
            required />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Smena boshlanishi"
              type="time"
              value={form.shiftStart}
              onChange={(e) =>
              setForm({
                ...form,
                shiftStart: e.target.value
              })
              } />

            <Input
              label="Smena tugashi"
              type="time"
              value={form.shiftEnd}
              onChange={(e) =>
              setForm({
                ...form,
                shiftEnd: e.target.value
              })
              } />

          </div>
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
        title="Filialni o'chirish"
        message={`"${deleteTarget?.name}" filialni o'chirishni tasdiqlaysizmi? Bu amalni qaytarib bo'lmaydi.`}
        isLoading={deleting} />

    </div>);

}