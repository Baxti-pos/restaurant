import { useEffect, useState } from 'react';
import { Branch, Manager } from '../../lib/types';
import { api } from '../../lib/api';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { Modal } from '../../components/ui/Modal';
import { ConfirmDialog } from '../../components/ui/ConfirmDialog';
import { Badge } from '../../components/ui/Badge';
import { TableSkeleton } from '../../components/ui/LoadingSkeleton';
import { toast } from '../../components/ui/Toast';
import { Plus, Edit2, Trash2, Shield, User } from 'lucide-react';
import { MANAGER_PERMISSION_OPTIONS } from '../../lib/permissions';

interface ManagersPageProps {
  branches: Branch[];
}

const PHONE_PREFIX = '+998';
const PHONE_PATTERN = /^\+998\d{9}$/;

const normalizePhoneInput = (value: string) => {
  const digits = value.replace(/\D/g, '');
  const local = digits.startsWith('998') ? digits.slice(3) : digits;
  return `${PHONE_PREFIX}${local.slice(0, 9)}`;
};

const getErrorMessage = (error: unknown) =>
error instanceof Error ? error.message : 'Xatolik yuz berdi. Qayta urinib koring';

export function ManagersPage({ branches }: ManagersPageProps) {
  const [managers, setManagers] = useState<Manager[]>([]);
  const [permissionOptions, setPermissionOptions] = useState<
    Array<{key: string;label: string;description: string;}>
  >([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<Manager | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<Manager | null>(null);
  const [form, setForm] = useState({
    fullName: '',
    phone: PHONE_PREFIX,
    password: '',
    isActive: true,
    branchIds: [] as string[],
    permissions: [] as string[]
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const load = async () => {
    setLoading(true);
    const [managersResult, permissionsResult] = await Promise.allSettled([
      api.managers.list(),
      api.managers.listPermissions()
    ]);

    if (permissionsResult.status === 'fulfilled') {
      setPermissionOptions(permissionsResult.value);
    } else {
      setPermissionOptions(MANAGER_PERMISSION_OPTIONS);
    }

    if (managersResult.status === 'fulfilled') {
      setManagers(managersResult.value);
    } else {
      setManagers([]);
      toast.error(getErrorMessage(managersResult.reason));
    }

    setLoading(false);
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      fullName: '',
      phone: PHONE_PREFIX,
      password: '',
      isActive: true,
      branchIds: [],
      permissions: []
    });
    setErrors({});
    setModalOpen(true);
  };

  const openEdit = (manager: Manager) => {
    setEditing(manager);
    setForm({
      fullName: manager.fullName,
      phone: manager.phone ? normalizePhoneInput(manager.phone) : PHONE_PREFIX,
      password: '',
      isActive: manager.isActive,
      branchIds: manager.branches.map((branch) => branch.id),
      permissions: manager.permissions
    });
    setErrors({});
    setModalOpen(true);
  };

  const validate = () => {
    const nextErrors: Record<string, string> = {};

    if (!form.fullName.trim()) {
      nextErrors.fullName = "F.I.Sh kiritilishi shart";
    }

    if (!PHONE_PATTERN.test(form.phone)) {
      nextErrors.phone = "Telefon +998901234567 formatida bolishi shart";
    }

    if (!editing && form.password.trim().length < 4) {
      nextErrors.password = "Parol kamida 4 ta belgidan iborat bolishi kerak";
    }

    if (form.branchIds.length === 0) {
      nextErrors.branchIds = 'Kamida bitta filial tanlang';
    }

    if (form.permissions.length === 0) {
      nextErrors.permissions = 'Kamida bitta permission tanlang';
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  };

  const togglePermission = (key: string) => {
    setForm((prev) => ({
      ...prev,
      permissions: prev.permissions.includes(key) ?
      prev.permissions.filter((permission) => permission !== key) :
      [...prev.permissions, key]
    }));
    setErrors((prev) => ({
      ...prev,
      permissions: ''
    }));
  };

  const toggleBranch = (branchId: string) => {
    setForm((prev) => ({
      ...prev,
      branchIds: prev.branchIds.includes(branchId) ?
      prev.branchIds.filter((id) => id !== branchId) :
      [...prev.branchIds, branchId]
    }));
    setErrors((prev) => ({
      ...prev,
      branchIds: ''
    }));
  };

  const handleSave = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!validate()) {
      return;
    }

    setSaving(true);
    try {
      if (editing) {
        await api.managers.update(editing.id, {
          fullName: form.fullName.trim(),
          phone: normalizePhoneInput(form.phone),
          branchIds: form.branchIds,
          permissions: form.permissions,
          isActive: form.isActive,
          ...(form.password.trim() ? { password: form.password.trim() } : {})
        });
        toast.success('Menejer yangilandi');
      } else {
        await api.managers.create({
          fullName: form.fullName.trim(),
          phone: normalizePhoneInput(form.phone),
          password: form.password.trim(),
          branchIds: form.branchIds,
          permissions: form.permissions,
          isActive: form.isActive
        });
        toast.success('Menejer yaratildi');
      }

      setModalOpen(false);
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await api.managers.delete(deleteTarget.id);
      toast.deleted('Menejer ochirildi');
      setDeleteTarget(null);
      await load();
    } catch (error: unknown) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-4 md:space-y-6">
      <div className="flex items-center justify-end lg:justify-between">
        <div className="hidden lg:block">
          <h1 className="text-lg md:text-xl font-bold text-slate-900">Menejerlar</h1>
          <p className="text-xs md:text-sm text-slate-500 mt-0.5">
            Menejer yaratish, filialga biriktirish va permission tanlash
          </p>
        </div>
        <div className="hidden md:block">
          <Button onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Menejer qo'shish
          </Button>
        </div>
      </div>

      <button
        onClick={openCreate}
        className="lg:hidden fixed bottom-[calc(5.75rem+env(safe-area-inset-bottom))] right-4 z-40 h-14 w-14 rounded-full bg-indigo-600 text-white shadow-lg flex items-center justify-center active:scale-95 transition-transform"
        aria-label="Menejer qoshish">

        <Plus className="h-7 w-7" />
      </button>

      {loading ?
      <TableSkeleton /> :
      managers.length === 0 ?
      <div className="bg-white rounded-xl border border-slate-200 py-16 text-center">
          <Shield className="h-12 w-12 text-slate-300 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">Hali menejerlar yaratilmagan</p>
          <Button className="mt-4" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1.5" />
            Menejer qoshish
          </Button>
        </div> :
      <>
          <div className="md:hidden space-y-2">
            {managers.map((manager) =>
          <div
            key={manager.id}
            className="bg-white rounded-xl border border-slate-200 px-4 py-3 flex items-start gap-3">

                <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center flex-shrink-0">
                  <User className="h-5 w-5 text-indigo-600" />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-900 text-sm">{manager.fullName}</p>
                  <p className="text-xs text-slate-500 mt-0.5">{manager.phone || '—'}</p>

                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {manager.branches.map((branch) =>
                <Badge key={branch.id} variant="secondary" size="sm">
                        {branch.name}
                      </Badge>
                )}
                  </div>

                  <p className="text-xs text-slate-500 mt-2">
                    Permissionlar: <span className="font-medium text-slate-700">{manager.permissions.length} ta</span>
                  </p>

                  <div className="mt-1.5">
                    {manager.isActive ?
                <Badge variant="success" size="sm">
                        Faol
                      </Badge> :
                <Badge variant="danger" size="sm">
                        Nofaol
                      </Badge>
                }
                  </div>
                </div>

                <div className="flex flex-col gap-1">
                  <button
                onClick={() => openEdit(manager)}
                className="p-1.5 text-slate-400 hover:text-indigo-600 bg-slate-50 rounded-lg">

                    <Edit2 className="h-4 w-4" />
                  </button>
                  <button
                onClick={() => setDeleteTarget(manager)}
                className="p-1.5 text-slate-400 hover:text-red-600 bg-slate-50 rounded-lg">

                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
          )}
          </div>

          <div className="hidden md:block bg-white rounded-xl border border-slate-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-slate-50 text-slate-500 border-b border-slate-200">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Menejer
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Filiallar
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Permissionlar
                    </th>
                    <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider">
                      Holat
                    </th>
                    <th className="px-4 py-3 text-right text-xs font-medium uppercase tracking-wider">
                      Amallar
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {managers.map((manager) =>
                <tr key={manager.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900">{manager.fullName}</p>
                        <p className="text-xs text-slate-500 mt-0.5">{manager.phone}</p>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          {manager.branches.map((branch) =>
                      <Badge key={branch.id} variant="secondary" size="sm">
                              {branch.name}
                            </Badge>
                      )}
                        </div>
                      </td>
                      <td className="px-4 py-3">
                        <span className="text-slate-700 font-medium">
                          {manager.permissions.length} ta
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        {manager.isActive ?
                      <Badge variant="success" size="sm">
                            Faol
                          </Badge> :
                      <Badge variant="danger" size="sm">
                            Nofaol
                          </Badge>
                      }
                      </td>
                      <td className="px-4 py-3 text-right space-x-1">
                        <button
                        onClick={() => openEdit(manager)}
                        className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-colors">

                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                        onClick={() => setDeleteTarget(manager)}
                        className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">

                          <Trash2 className="h-3.5 w-3.5" />
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
        title={editing ? 'Menejerni tahrirlash' : 'Yangi menejer'}
        size="md">

        <form onSubmit={handleSave} className="space-y-4">
          <Input
            label="F.I.Sh"
            value={form.fullName}
            onChange={(event) => {
              setForm((prev) => ({
                ...prev,
                fullName: event.target.value
              }));
              setErrors((prev) => ({
                ...prev,
                fullName: ''
              }));
            }}
            error={errors.fullName}
            required />

          <Input
            label="Telefon raqam"
            value={form.phone}
            onChange={(event) => {
              setForm((prev) => ({
                ...prev,
                phone: normalizePhoneInput(event.target.value)
              }));
              setErrors((prev) => ({
                ...prev,
                phone: ''
              }));
            }}
            error={errors.phone}
            required />

          <Input
            label={editing ? 'Parol (ixtiyoriy)' : 'Parol'}
            type="password"
            value={form.password}
            onChange={(event) => {
              setForm((prev) => ({
                ...prev,
                password: event.target.value
              }));
              setErrors((prev) => ({
                ...prev,
                password: ''
              }));
            }}
            error={errors.password}
            required={!editing} />

          <div>
            <p className="text-sm font-medium text-slate-700 mb-1.5">
              Filiallar <span className="text-red-500">*</span>
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 rounded-xl border border-slate-200 p-3">
              {branches.map((branch) =>
              <label
                key={branch.id}
                className="flex items-start gap-2 rounded-lg border border-slate-200 p-2 cursor-pointer">

                  <input
                  type="checkbox"
                  checked={form.branchIds.includes(branch.id)}
                  onChange={() => toggleBranch(branch.id)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />

                  <span className="text-sm text-slate-700">{branch.name}</span>
                </label>
              )}
            </div>
            {errors.branchIds &&
            <p className="mt-1 text-xs text-red-500 font-medium">{errors.branchIds}</p>
            }
          </div>

          <div>
            <p className="text-sm font-medium text-slate-700 mb-1.5">
              Permissionlar <span className="text-red-500">*</span>
            </p>
            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-200 p-3 space-y-2">
              {permissionOptions.map((permission) =>
              <label
                key={permission.key}
                className="flex items-start gap-2 rounded-lg border border-slate-200 p-2 cursor-pointer">

                  <input
                  type="checkbox"
                  checked={form.permissions.includes(permission.key)}
                  onChange={() => togglePermission(permission.key)}
                  className="mt-0.5 h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />

                  <span>
                    <span className="block text-sm font-medium text-slate-800">
                      {permission.label}
                    </span>
                    <span className="block text-xs text-slate-500">{permission.description}</span>
                  </span>
                </label>
              )}
            </div>
            {errors.permissions &&
            <p className="mt-1 text-xs text-red-500 font-medium">{errors.permissions}</p>
            }
          </div>

          <div className="flex items-center justify-between rounded-xl border border-slate-200 p-3">
            <div>
              <p className="text-sm font-medium text-slate-700">Menejer holati</p>
              <p className="text-xs text-slate-500">Nofaol menejer tizimga kira olmaydi</p>
            </div>
            <button
              type="button"
              onClick={() =>
              setForm((prev) => ({
                ...prev,
                isActive: !prev.isActive
              }))
              }
              className={form.isActive ?
              'h-6 w-11 rounded-full bg-indigo-600 relative transition-colors' :
              'h-6 w-11 rounded-full bg-slate-300 relative transition-colors'}>

              <span
                className={form.isActive ?
                'absolute top-0.5 left-[22px] h-5 w-5 rounded-full bg-white shadow transition-all' :
                'absolute top-0.5 left-[2px] h-5 w-5 rounded-full bg-white shadow transition-all'} />

            </button>
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
        title="Menejerni ochirish"
        message={`"${deleteTarget?.fullName}" menejerini ochirishni tasdiqlaysizmi?`}
        isLoading={deleting} />
    </div>);
}
